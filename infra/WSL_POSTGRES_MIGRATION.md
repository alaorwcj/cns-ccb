## Migração do Postgres para WSL e configuração para containers

Este documento registra os passos executados para migrar o banco de dados `ccb` do container Postgres para uma instância local no WSL, como apontar os containers Docker para essa instância e como reverter para o DB em container. Use esse arquivo como base de conhecimento para repetir o processo.

IMPORTANTE: os comandos abaixo foram executados no ambiente WSL (Ubuntu) e os containers Docker foram gerenciados a partir daí.

---

## Resumo das alterações realizadas

- Restaurei o dump gerado a partir do container para o Postgres no WSL.
- Atualizei `infra/docker-compose.yml` para apontar `api` e `api-test` para `host.docker.internal:5433` (WSL Postgres).
- Ajustei `infra/smoke_tests/check_orders.sh` para ser robusto ao nome das chaves do token retornadas pela API.
- Verifiquei conectividade container -> WSL usando `host.docker.internal` e validei com smoke tests.

Arquivos alterados relevantes:
- `infra/docker-compose.yml` (DATABASE_URL, DB_HOST, DB_PORT para api/api-test)
- `infra/smoke_tests/check_orders.sh` (extração do token)

---

## Passos principais executados

1) Gerar dumps no container (executado anteriormente a esta documentação):

```bash
# dentro do docker-compose (p.ex. docker exec infra-db-1)
pg_dumpall -g -U ccb > /tmp/globals.sql
pg_dump -U ccb -Fc ccb -f /tmp/ccb.dump
docker cp infra-db-1:/tmp/ccb.dump infra/backups/ccb.dump
docker cp infra-db-1:/tmp/globals.sql infra/backups/globals.sql
```

2) Instalar e preparar Postgres no WSL (se ainda não instalado):

```bash
sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16
```

3) Verificar arquivos de configuração e porta do Postgres no WSL:

```bash
sudo -u postgres psql -Atc "SHOW config_file; SHOW hba_file; SHOW port; SHOW listen_addresses;"
sudo ss -ltnp | grep postgres
```

No meu caso o Postgres estava em `port = 5433` e com `listen_addresses = 'localhost'` inicialmente.

4) Abrir acesso do Docker ao Postgres (opcional e temporário; ajuste para sua rede):

- Editar `/etc/postgresql/16/main/postgresql.conf` e ajustar `listen_addresses = '*'` (ou adicionar uma linha no final).
- Editar `/etc/postgresql/16/main/pg_hba.conf` e adicionar uma linha para o IP do Docker host (ex.: `host all all 192.168.65.254/32 md5`).
- Reiniciar/recarregar o Postgres: `sudo systemctl restart postgresql` ou `SELECT pg_reload_conf();` via psql.

OBS: usar `host.docker.internal` do container para alcançar o host WSL — o Docker resolve esse nome para o IP do host.

5) Criar role/DB e restaurar dump no WSL:

```bash
sudo -u postgres psql -c "CREATE ROLE ccb WITH LOGIN PASSWORD 'ccb';" || true
sudo -u postgres createdb -O ccb ccb || true
sudo -u postgres pg_restore -d ccb infra/backups/ccb.dump -v
sudo -u postgres psql -f infra/backups/globals.sql
```

6) Atualizar `infra/docker-compose.yml` para apontar containers para o Postgres WSL

Exemplo de variables usadas (feito no repositório):

```yaml
environment:
  DATABASE_URL: postgresql+psycopg2://ccb:ccb@host.docker.internal:5433/ccb
  DB_HOST: host.docker.internal
  DB_PORT: 5433
  DB_USER: ccb
  DB_PASSWORD: ccb
```

7) Recriar containers para aplicar a mudança:

```bash
docker compose -f infra/docker-compose.yml up -d --no-deps --force-recreate api api-test
```

8) Testes e validação

- Testar login e endpoints via curl:

```bash
curl -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' -d '{"username":"admin@example.com","password":"changeme"}'
# Usar o token retornado para GET /orders
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/orders?page=1&limit=10
```

- Rodar smoke-test:

```bash
./infra/smoke_tests/check_orders.sh
```

---

## Como reverter (voltar a usar o DB em container)

1) Editar `infra/docker-compose.yml` e setar as variáveis de volta para `db:5432` (ou simplesmente remover as linhas que apontam para host.docker.internal).

```yaml
DATABASE_URL: postgresql+psycopg2://ccb:ccb@db:5432/ccb
DB_HOST: db
DB_PORT: 5432
```

2) Recriar containers:

```bash
docker compose -f infra/docker-compose.yml up -d --no-deps --force-recreate api api-test db
```

3) (Opcional) Limpar a instância WSL se não quiser manter os dados lá.

---

## Notas de segurança e operacionais

- Adicionar `listen_addresses = '*'` e inserir regras no `pg_hba.conf` abre o Postgres para conexões de outras máquinas; restrinja a linha `pg_hba.conf` ao IP do Docker host (ex.: `192.168.65.254/32`) e remova quando não for mais necessário.
- Para produção, preferir usar serviços de banco gerenciados ou containers dedicados com volumes, não expor o Postgres do host diretamente.
- Documente a porta e IP que você escolheu para WSL (neste caso usamos porta 5433 e `host.docker.internal` para containers).

---

## Logs/outputs úteis (exemplos dos comandos executados)

- `pg_restore` logou criação de tabelas, índices e dados (ex.: tables `orders`, `order_items`, `users`, `user_church`, etc.).
- O `uvicorn` no container reportou: "DB is up" e "Uvicorn running on http://0.0.0.0:8000" após apontar para WSL Postgres.

---

## Próximos passos sugeridos

- Incluir seção no `README_DEPLOY.md` explicando a opção WSL Postgres (passos e risco).
- Incluir no `infra/docker-compose.yml` uma variante comentada mostrando como alternar entre `db` container e `host.docker.internal`.

Fim.
