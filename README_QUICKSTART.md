# 🚀 Guia Rápido - Projeto CNS-CCB

## Comandos Essenciais

### Script de Gerenciamento (Recomendado)

```bash
cd /root/app/cns-ccb
./manage.sh [comando]
```

**Comandos principais:**
- `./manage.sh start` - Inicia todos os containers
- `./manage.sh stop` - Para todos os containers
- `./manage.sh restart` - Reinicia tudo
- `./manage.sh status` - Mostra status
- `./manage.sh logs api` - Ver logs da API
- `./manage.sh health` - Verifica saúde do sistema
- `./manage.sh update` - Atualiza código e faz deploy

### Docker Compose Direto

```bash
cd /root/app/cns-ccb/infra

# Iniciar
docker compose up -d

# Parar
docker compose down

# Ver status
docker compose ps

# Ver logs
docker compose logs -f api
docker compose logs -f web

# Reiniciar
docker compose restart
docker compose restart api  # Apenas a API
```

## 🏗️ Containers

| Nome | Função | Status Esperado |
|------|--------|----------------|
| nginx-proxy | Proxy HTTPS/SSL | Up |
| nginx-letsencrypt | Certificados SSL | Up |
| cns-web | Frontend React | Up |
| cns-api | Backend FastAPI | Up |

## 🌐 Acessos

- **Site:** https://cns.admsiga.org.br/
- **API Health:** https://cns.admsiga.org.br/api/health

## 🔧 Troubleshooting Rápido

### Site não responde (502/503)

```bash
# Ver status
cd /root/app/cns-ccb
./manage.sh status

# Verificar se nginx-proxy está rodando
docker ps | grep nginx

# Se parado, iniciar:
docker start nginx-proxy

# Ver logs da API
./manage.sh logs api
```

### Rebuild após mudança de código

```bash
cd /root/app/cns-ccb
./manage.sh rebuild
```

### PostgreSQL

```bash
# Status
sudo systemctl status postgresql@16-main.service

# Conectar
sudo -u postgres psql -p 5433 -d ccb
```

## 📚 Documentação Completa

Ver `MANUAL_DOCKER.md` para documentação detalhada.

## 🔐 Segurança

- Senha do banco: `/root/app/cns-ccb/infra/.env`
- Nunca commitar arquivos `.env` no Git
- Certificados SSL renovam automaticamente

---

**Última atualização:** 29 de Outubro de 2025
