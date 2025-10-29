# Manual de Gerenciamento do Projeto CNS-CCB

## 📋 Visão Geral

Este projeto utiliza Docker Compose para gerenciar todos os serviços necessários:
- **nginx-proxy**: Proxy reverso que gerencia HTTPS/SSL
- **letsencrypt**: Gerenciamento automático de certificados SSL
- **web**: Frontend React (interface do usuário)
- **api**: Backend FastAPI (servidor de API)
- **PostgreSQL**: Banco de dados rodando no host (porta 5433)

## 🚀 Comandos Principais

### Iniciar o Projeto

```bash
cd /root/app/cns-ccb/infra
docker compose up -d
```

Isso inicia todos os containers em segundo plano (modo daemon).

### Parar o Projeto

```bash
cd /root/app/cns-ccb/infra
docker compose down
```

Para todos os containers e remove a rede, mas mantém os volumes.

### Reiniciar o Projeto

**Opção 1 - Reiniciar tudo:**
```bash
cd /root/app/cns-ccb/infra
docker compose restart
```

**Opção 2 - Reiniciar um serviço específico:**
```bash
cd /root/app/cns-ccb/infra
docker compose restart api      # Reinicia apenas a API
docker compose restart web      # Reinicia apenas o frontend
docker compose restart nginx-proxy  # Reinicia o proxy
```

### Ver Status dos Containers

```bash
cd /root/app/cns-ccb/infra
docker compose ps
```

Mostra quais containers estão rodando, status e portas.

### Ver Logs

**Logs de todos os serviços:**
```bash
cd /root/app/cns-ccb/infra
docker compose logs -f
```

**Logs de um serviço específico:**
```bash
cd /root/app/cns-ccb/infra
docker compose logs -f api      # Logs da API
docker compose logs -f web      # Logs do frontend
docker compose logs -f nginx-proxy  # Logs do proxy
```

**Ver últimas 50 linhas:**
```bash
docker compose logs --tail 50 api
```

### Rebuild (Reconstruir) Containers

Necessário quando você altera código ou configurações:

```bash
cd /root/app/cns-ccb/infra
docker compose build
docker compose up -d
```

**Rebuild forçado (sem cache):**
```bash
docker compose build --no-cache
docker compose up -d
```

## 🔧 Comandos Úteis

### Verificar Saúde da API

```bash
curl http://localhost/api/health
# ou
curl https://cns.admsiga.org.br/api/health
```

Deve retornar: `{"status":"healthy"}`

### Executar Testes

```bash
cd /root/app/cns-ccb/infra
docker compose run --rm api-test
```

O container `api-test` usa o profile `test`, então não inicia automaticamente.

### Acessar Shell de um Container

```bash
docker exec -it cns-api sh      # Shell da API
docker exec -it cns-web sh      # Shell do frontend
```

### Limpar Containers Órfãos

```bash
cd /root/app/cns-ccb/infra
docker compose down --remove-orphans
```

### Ver Uso de Recursos

```bash
docker stats
```

Mostra CPU, memória e uso de rede de cada container em tempo real.

## 📦 Estrutura de Containers

| Container | Função | Porta/Acesso | Auto-start |
|-----------|--------|--------------|------------|
| nginx-proxy | Proxy reverso HTTPS | 80, 443 | Sim |
| nginx-letsencrypt | Certificados SSL | - | Sim |
| cns-web | Frontend React | 80 (interno) | Sim |
| cns-api | Backend FastAPI | 8000 (interno) | Sim |
| cns-api-test | Testes (pytest) | - | Não (manual) |

## 🔐 Variáveis de Ambiente

As senhas e configurações sensíveis estão em:
- `/root/app/cns-ccb/infra/.env` - Variáveis do Docker Compose
- `/root/app/cns-ccb/backend/.env` - Variáveis da API

**Importante:** Esses arquivos NÃO são commitados no Git (.gitignore).

### Arquivo `/root/app/cns-ccb/infra/.env`
```env
DB_PASSWORD=Apx7G05Le2n6TM4kN06G7VMPP
DB_USER=ccb
DB_NAME=ccb
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
```

## 🗄️ Banco de Dados PostgreSQL

O PostgreSQL roda **no host** (não em container), na porta **5433**.

### Conectar ao PostgreSQL

```bash
sudo -u postgres psql -p 5433 -d ccb
```

### Backup do Banco

```bash
sudo -u postgres pg_dump -p 5433 ccb > /root/app/cns-ccb/infra/backups/ccb_$(date +%Y%m%d_%H%M%S).dump
```

### Verificar Status do PostgreSQL

```bash
sudo systemctl status postgresql@16-main.service
```

## 🌐 Acessos

- **Produção (HTTPS):** https://cns.admsiga.org.br/
- **HTTP (redirect para HTTPS):** http://cns.admsiga.org.br/
- **API Direta (dentro do servidor):** http://localhost/api/

## 🚨 Troubleshooting

### Site não responde (502/503)

```bash
# 1. Verificar se containers estão rodando
docker compose ps

# 2. Se nginx-proxy está parado, iniciar
docker start nginx-proxy

# 3. Verificar logs
docker compose logs nginx-proxy
docker compose logs api
docker compose logs web
```

### Erro de certificado SSL

```bash
# Verificar certificados
ls -la /root/app/cns-ccb/infra/proxy/certs/ | grep cns.admsiga

# Forçar renovação (se necessário)
docker exec nginx-letsencrypt /app/signal_le_service
```

### API não conecta ao banco

```bash
# 1. Verificar se PostgreSQL está rodando
sudo systemctl status postgresql@16-main.service

# 2. Verificar se API consegue conectar
docker exec cns-api python -c "import psycopg2; conn = psycopg2.connect('postgresql://ccb:Apx7G05Le2n6TM4kN06G7VMPP@host.docker.internal:5433/ccb'); print('OK')"

# 3. Verificar variáveis de ambiente
docker exec cns-api env | grep DATABASE_URL
```

### Container reiniciando constantemente

```bash
# Ver logs para identificar erro
docker compose logs --tail 100 api

# Verificar se tem erro de sintaxe ou dependência
docker compose config
```

## 🔄 Workflow de Deploy

### Deploy de Nova Versão

```bash
# 1. Atualizar código do Git
cd /root/app/cns-ccb
git pull origin main

# 2. Rebuild containers
cd infra
docker compose build

# 3. Reiniciar serviços
docker compose up -d

# 4. Verificar saúde
curl https://cns.admsiga.org.br/api/health
docker compose ps
```

### Rollback para Versão Anterior

```bash
# 1. Voltar para commit anterior
cd /root/app/cns-ccb
git log --oneline -5  # Ver últimos commits
git checkout <commit-hash>

# 2. Rebuild e restart
cd infra
docker compose build
docker compose up -d
```

## 📊 Monitoramento

### Verificar Logs em Tempo Real

```bash
# Todos os serviços
docker compose logs -f

# Filtrar por erro
docker compose logs | grep -i error

# Apenas API
docker compose logs -f api | grep -E "ERROR|WARNING"
```

### Ver Requisições HTTP no Nginx

```bash
docker logs nginx-proxy --tail 100 | grep cns.admsiga
```

## 🛡️ Segurança

### Senha do Banco de Dados

A senha do PostgreSQL está em `/root/app/cns-ccb/infra/.env`:
```
DB_PASSWORD=Apx7G05Le2n6TM4kN06G7VMPP
```

**Nunca** commitar este arquivo no Git!

### Verificar se .env está protegido

```bash
cd /root/app/cns-ccb
git status | grep .env
```

Se aparecer algo, executar:
```bash
git reset HEAD infra/.env backend/.env
```

## 📞 Contatos e Links

- **Domínio:** cns.admsiga.org.br
- **Email Admin:** alaor.rodrigues@gru.congregacao.org.br
- **Servidor:** VPS 162.220.11.4

---

**Última atualização:** 29 de Outubro de 2025
