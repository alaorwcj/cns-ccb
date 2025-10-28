Guia de deploy HTTPS (Let's Encrypt) e plano de rollback
=========================================

Resumo
------
Este documento descreve como habilitar HTTPS para `cns.admsiga.org.br` usando nginx no host e Certbot (Let's Encrypt), como testar e um plano detalhado de rollback. Os passos assumem que os serviços atuais estão rodando via docker-compose em `infra/docker-compose.yml` e que o frontend está mapeado para a porta 8080 e o backend para 8000.

Avisos iniciais
---------------
- Faça tudo via SSH com acesso root ou sudo.
- Antes de editar: faça backup dos arquivos nginx e do docker-compose.

Backups recomendados (obrigatório antes de alterar)
--------------------------------------------------
```bash
sudo mkdir -p /root/deploy-backups/cns-$(date +%F_%T)
sudo cp /etc/nginx/nginx.conf /root/deploy-backups/cns-$(date +%F_%T)/nginx.conf || true
sudo cp -r /etc/nginx/sites-available /root/deploy-backups/cns-$(date +%F_%T)/sites-available || true
sudo cp -r /etc/nginx/sites-enabled /root/deploy-backups/cns-$(date +%F_%T)/sites-enabled || true
sudo cp /root/app/cns-ccb/infra/docker-compose.yml /root/deploy-backups/cns-$(date +%F_%T)/docker-compose.yml || true
```

Passo a passo (instalação e obtenção do certificado)
-----------------------------------------------------
1) Instalar nginx e certbot (Debian/Ubuntu):
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

2) Criar diretório para desafios ACME (webroot):
```bash
sudo mkdir -p /var/www/certbot
sudo chown www-data:www-data /var/www/certbot
```

3) Copiar o arquivo de configuração nginx fornecido (ex: `infra/nginx/cns.admsiga.org.br.conf`) para o servidor:
- Salve em `/etc/nginx/sites-available/cns.admsiga.org.br`
- Habilite:
```bash
sudo ln -s /etc/nginx/sites-available/cns.admsiga.org.br /etc/nginx/sites-enabled/cns.admsiga.org.br
```
- Teste e reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4) Obter o certificado com plugin nginx (o Certbot irá editar a configuração se você usar `--nginx`):
```bash
sudo certbot --nginx -d cns.admsiga.org.br -m seu-email@dominio.tld --agree-tos --no-eff-email
```
Se preferir somente emitir e não alterar nginx automaticamente, use webroot:
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d cns.admsiga.org.br -m seu-email@dominio.tld --agree-tos
```

5) Teste a renovação (dry-run):
```bash
sudo certbot renew --dry-run
```

6) Firewall: abra 80 e 443
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Ajustes no frontend (importante)
--------------------------------
- Se o frontend foi buildado com a variável `VITE_API_BASE_URL` apontando para `http://162.220.11.4:8000`, atualize para `https://cns.admsiga.org.br` ou preferencialmente use caminhos relativos (`/api/`) e rebuild.
- Para rebuild:
```bash
cd /root/app/cns-ccb/infra
docker-compose build web
docker-compose up -d web
```

Verificações pós-deploy
-----------------------
- Cabeçalhos e redirecionamento:
```bash
curl -I http://cns.admsiga.org.br
curl -I https://cns.admsiga.org.br
```
- TLS:
```bash
openssl s_client -connect cns.admsiga.org.br:443 -servername cns.admsiga.org.br
```
- Logs nginx:
```bash
sudo tail -n 200 /var/log/nginx/cns.error.log
sudo tail -n 200 /var/log/nginx/cns.access.log
```

Plano de rollback (rápido e testado)
------------------------------------
Sempre mantenha os backups criados no início. Passos para rollback imediato se algo falhar:

1) Restaurar configuração nginx original (exemplo):
```bash
# supondo que o backup foi salvo em /root/deploy-backups/cns-YYYY-MM-DD_HH:MM:SS
sudo mv /etc/nginx/sites-available/cns.admsiga.org.br /etc/nginx/sites-available/cns.admsiga.org.br.broken.$(date +%F_%T) || true
sudo cp /root/deploy-backups/cns-*/sites-available/cns.admsiga.org.br /etc/nginx/sites-available/
sudo nginx -t && sudo systemctl restart nginx
```
2) Reexpor portas no docker-compose (se você as removeu) — revert do `docker-compose.yml`:
```bash
# se você versiona com git
cd /root/app/cns-ccb
git checkout -- infra/docker-compose.yml
# então reimplanta
cd infra
docker-compose up -d --force-recreate
```
3) Se o certificado novo causar problemas e você quer revogá-lo (opcional):
```bash
sudo certbot revoke --cert-path /etc/letsencrypt/live/cns.admsiga.org.br/cert.pem --non-interactive --reason superseded
```
4) Se o nginx travar e você precisa voltar ao serviço em porta pública 8080 (serve como fallback):
- Remova o site do `sites-enabled` e crie um pequeno servidor nginx temporário que só redirecione para 8080, ou restaure a configuração antiga que apontava diretamente para 8080.

Checklist rápido para rollback antes de qualquer alteração:
- [ ] Backup nginx
- [ ] Backup docker-compose
- [ ] Ver diretório `/var/www/certbot` e permissões

Como testar rollback localmente (recomendado antes de tocar em produção)
------------------------------------------------------------------------
- Suba uma VM ou container com nginx e teste o arquivo de configuração e a emissão de certbot usando `--dry-run`.

Alternativa: rodar tudo em containers (nginx-proxy + letsencrypt companion)
---------------------------------------------------------------------------
Se preferir não tocar no nginx host, há um caminho com containers que automatiza emissão de certificados por hostname:
- usar `jwilder/nginx-proxy` + `nginx-letsencrypt` (letsencrypt-nginx-proxy-companion).
- Eu incluí um `infra/docker-compose.letsencrypt.example.yml` com exemplo.

Notas finais
------------
- Preserve logs e marque timestamps dos backups.
- Não exponha /etc/letsencrypt sem necessidade; mantenha cópias em local seguro.
- Se usar serviços de proxy reverso (Cloudflare, etc.), adapte o fluxo (DNS proxied pode precisar de certificação via Cloudflare ou modo "Full" SSL).

Docker socket (nginx-proxy + letsencrypt companion)
-----------------------------------------------
Se preferir operar o proxy e a emissão de certificados via Docker (sem instalar nginx/certbot no host), use o padrão
`jwilder/nginx-proxy` + `nginxproxy/acme-companion`. Vantagens:

- Automatiza emissão/renovação baseada em variáveis de ambiente do container (LETSENCRYPT_HOST, VIRTUAL_HOST).
- Mantém todos os artefatos de proxy e certificados organizados sob o diretório do compose (`infra/proxy`).

Principais pontos de atenção:

- O proxy faz roteamento por host (vhost). Para rotear por caminho (`/api/`) em um mesmo domínio, é necessário adicionar
	manualmente arquivos de configuração em `vhost.d/` com regras `location`.
- Recomendo usar subdomínio para a API (por exemplo `api.cns.admsiga.org.br`). Assim o proxy emite certificados separados e
	as aplicações separam-se por host, simplificando o setup.

Como usar (resumido):

1) Copie o arquivo `infra/docker-compose.nginx-proxy.yml` para o servidor.
2) Crie as pastas necessárias (no diretório `infra` do repo): `proxy/certs`, `proxy/vhost.d`, `proxy/html`, `proxy/conf.d`, `proxy/acme`.
3) Ajuste os valores `LETSENCRYPT_EMAIL` nas variáveis de ambiente dos serviços (`web` e `api`) para um email válido.
4) Rode o script de deploy `infra/scripts/deploy_nginx_proxy.sh` (requer sudo) — ele fará backup, criará os diretórios e
	 subirá o `nginx-proxy` e o `acme-companion` antes dos serviços.

Rollback para socket-proxy (rápido):

1) Pare e remova os containers do compose em `infra/docker-compose.nginx-proxy.yml`:

```bash
docker-compose -f /root/app/cns-ccb/infra/docker-compose.nginx-proxy.yml down
```

2) Restaure o `docker-compose.yml` original do backup criado pelo script de deploy (ex: `/root/deploy-backups/...`) e suba os
	 serviços originais:

```bash
cp /root/deploy-backups/cns-*/docker-compose.yml /root/app/cns-ccb/infra/docker-compose.yml
cd /root/app/cns-ccb/infra
docker-compose up -d --force-recreate
```

3) Se quiser revogar os certificados gerados automaticamente (opcional):

```bash
docker run --rm -v /root/app/cns-ccb/infra/proxy/certs:/etc/nginx/certs alpine sh -c \
	"[ -f /etc/nginx/certs/cns.admsiga.org.br/cert.pem ] && echo 'revogar manualmente com certbot se necessário' || true"
```

Observação: teste em ambiente staging/VM antes de alterar produção. Use `--dry-run` nas ferramentas do ACME quando possível.

Renovação automática (recomendado)
---------------------------------
É importante garantir que os certificados sejam renovados automaticamente. Dependendo da arquitetura escolhida, aqui estão as recomendações:

- Host nginx + certbot: o próprio Certbot instala um timer/systemd (`certbot.timer`) que roda `certbot renew` automaticamente. Você pode verificar com:

```bash
sudo systemctl status certbot.timer
sudo systemctl list-timers --all | grep certbot
```

- Docker socket (nginx-proxy + acme-companion): o `acme-companion` geralmente já executa renovações automaticamente, mas é útil ter um job de verificação/guardião que execute um `acme.sh --cron` dentro do container e force o reload do proxy após a renovação.

Arquivos incluídos neste repositório para automação (exemplos):

- `infra/scripts/renew_nginx_proxy_certs.sh` — script que executa `acme.sh --cron` dentro do container `nginx-letsencrypt` e força um HUP no `nginx-proxy`.
- `infra/systemd/renew-nginx-proxy.service` — exemplo de unit systemd para rodar o script on-demand.
- `infra/systemd/renew-nginx-proxy.timer` — timer systemd que roda o service diariamente (03:30). Para habilitar no servidor:

```bash
sudo cp infra/scripts/renew_nginx_proxy_certs.sh /usr/local/bin/renew_nginx_proxy_certs.sh
sudo chmod +x /usr/local/bin/renew_nginx_proxy_certs.sh
sudo cp infra/systemd/renew-nginx-proxy.service /etc/systemd/system/renew-nginx-proxy.service
sudo cp infra/systemd/renew-nginx-proxy.timer /etc/systemd/system/renew-nginx-proxy.timer
sudo systemctl daemon-reload
sudo systemctl enable --now renew-nginx-proxy.timer
sudo systemctl status renew-nginx-proxy.timer
```

Se preferir usar `cron` em vez de systemd timers, adicione uma linha em root's crontab (ex.: `sudo crontab -e`):

```cron
30 3 * * * /root/app/cns-ccb/infra/scripts/renew_nginx_proxy_certs.sh >> /var/log/renew-nginx-proxy.log 2>&1
```

Verificação rápida após habilitar:

```bash
journalctl -u renew-nginx-proxy.service -b --no-pager
tail -n 200 /var/log/renew-nginx-proxy.log || true
```

Observação final: monitore os logs nos primeiros dias após habilitar o timer para garantir que renovações e reloads estejam ocorrendo conforme esperado.

