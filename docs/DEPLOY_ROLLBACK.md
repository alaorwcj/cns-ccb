# Ponto de partida / Snapshot para correções (Rollback guide)

Data: 2025-10-24

Objetivo
- Registrar o estado exato do repositório e dos containers antes de iniciar uma série de correções.
- Incluir instruções de rollback para restaurar este ponto de partida caso algo dê errado.

Snapshot Git
- Commit atual (HEAD): b801512441da931c53c8e39dbc50f884ff3c1936

Docker Compose (infra) — serviço e status (capturado com `docker compose ps --all`):

```
NAME               IMAGE            COMMAND                  SERVICE    CREATED      STATUS                    PORTS
infra-api-1        infra-api        "/app/entrypoint.sh"     api        2 days ago   Up 2 minutes              0.0.0.0:8000->8000/tcp
infra-api-test-1   infra-api-test   "/app/entrypoint.sh …"   api-test   2 days ago   Exited (255) 2 days ago   8000/tcp
infra-db-1         postgres:16      "docker-entrypoint.s…"   db         2 days ago   Exited (0) 19 hours ago
infra-web-1        infra-web        "/usr/local/bin/fron…"   web        2 days ago   Up 11 minutes             0.0.0.0:5173->5173/tcp
```

Logs (recortes recentes)

- API (últimos 200 linhas):

```
(trecho)
INFO:     172.21.0.1:49064 - "OPTIONS /auth/login HTTP/1.1" 200 OK
INFO:     172.21.0.1:49064 - "POST /auth/login HTTP/1.1" 401 Unauthorized
INFO:     172.21.0.1:49968 - "POST /auth/login HTTP/1.1" 200 OK
... (vários GET/POST/OPTIONS com 200)
Waiting for DB...
DB is up
Database already has data, skipping restore
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

- Web (últimos 200 linhas):

```
(trecho)
Ensuring native rollup binary is installed...
Ensuring native esbuild binary is installed...
> ccb-cns-web@0.1.0 dev
> vite --host

  VITE v5.4.20  ready in 186 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://172.21.0.3:5173/

Occasionally there are npm errors from host bind mounts (package.json missing) — see logs above.
```

Arquivos modificados localmente nesta sessão
- `frontend/app/Dockerfile` — alterado para permitir optional deps e instalar nativos (rollup/esbuild) no build da imagem.
- `frontend/app/entrypoint.sh` — alterado para instalar os binários nativos (rollup/esbuild) na inicialização se necessário.

Observações importantes
- O `web` foi configurado para apontar o cliente para `http://localhost:8000` via `VITE_API_BASE_URL` (no `docker-compose.yml` e `.env`). Isso espera que o navegador do host acesse a API no host (localhost) em 8000.
- Em ambientes Windows + WSL é comum o bind-mount `../frontend/app:/app` esconder `node_modules` instalados na imagem; por isso adicionamos lógica para instalar dependências na entrada.

Comandos de rollback / restore rápido

1) Voltar o código ao commit snapshot (cuidado: isso descartará mudanças não commitadas):

```bash
cd /mnt/f/cns-ccb
# descartar mudanças não-commitadas (opcional, faça backup antes)
git reset --hard b801512441da931c53c8e39dbc50f884ff3c1936
git clean -fd
```

2) Recriar imagens e containers com o código do commit (recomendado para garantir que a imagem reflita o código):

```bash
cd /mnt/f/cns-ccb/infra
docker compose build --no-cache api web
docker compose up -d --force-recreate
```

3) Se quiser apenas restaurar containers para o estado atual sem tocar o Git:

```bash
cd /mnt/f/cns-ccb/infra
docker compose up -d --force-recreate
```

4) Restaurar DB a partir do dump original (cuidado: sobrescreve dados):

```bash
# pare containers que usam o DB
docker compose down
# restaurar usando o script ou psql pg_restore (exemplo rápido)
pg_restore --clean --no-owner -U ccb -d ccb /path/to/backend/dump_ccb.backup
# subir containers
docker compose up -d
```

Checklist antes de mudanças arriscadas
- Commitar tudo (git add/commit) e empurrar para um branch remoto
- Criar branch de trabalho: `git checkout -b fix/descricao`
- Executar o snapshot de rollback (este arquivo) e anexar hash na issue/PR
- Rodar testes unitários e integração rápidos: `pytest -q` no container `api-test` ou localmente

Notas finais
- Este arquivo é o ponto de partida para as alterações. Documente cada modificação adicional (arquivo, motivo, comando executado) abaixo deste arquivo para facilitar rollback manual.
- Se preferir, posso automaticamente criar um commit com este arquivo e criar um branch `snapshot/before-fixes` contendo o estado atual — quer que eu faça isso?

*** FIM ***
