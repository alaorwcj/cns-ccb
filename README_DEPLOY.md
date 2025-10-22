# CNS-CCB - Sistema de Controle de Contribuições e Bens

Sistema completo para gestão de contribuições e bens de igrejas, desenvolvido com FastAPI (backend), React (frontend) e PostgreSQL (banco de dados).

## 🚀 Deploy em Nova Máquina

### Pré-requisitos

- **Docker** (versão 20.10 ou superior)
- **Docker Compose** (versão 2.0 ou superior)
- **Git** (para clonar o repositório)

### 📋 Passos para Deploy

#### 1. Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd cns-ccb
```

#### 2. Executar Setup Automático (Recomendado)

```bash
./setup.sh
```

O script irá:
- ✅ Verificar se Docker está instalado
- 📋 Copiar o dump do banco para o local correto
- 🐳 Iniciar todos os containers
- ⏳ Aguardar inicialização completa
- 🏥 Verificar saúde da API
- 🔐 Testar login
- 🌐 Verificar frontend

#### 3. Setup Manual (Alternativo)

Se preferir fazer manualmente:

```bash
# 1. Copiar dump do banco
cp dump_ccb.backup backend/

# 2. Entrar no diretório infra
cd infra

# 3. Iniciar containers
docker compose up -d

# 4. Aguardar inicialização (cerca de 30 segundos)
sleep 30

# 5. Verificar se está funcionando
curl http://localhost:8000/health
```

### 🔧 Configurações

#### Credenciais Padrão
- **Email**: `admin@example.com`
- **Senha**: `changeme`

#### Portas Utilizadas
- **Frontend**: `http://localhost:5173`
- **API**: `http://localhost:8000`
- **Banco PostgreSQL**: `localhost:5432`

#### Arquivos de Configuração
- `infra/docker-compose.yml` - Orquestração dos containers
- `backend/.env` - Variáveis de ambiente do backend
- `backend/entrypoint.sh` - Script de inicialização do banco

### 📁 Estrutura do Projeto

```
cns-ccb/
├── backend/           # API FastAPI
│   ├── app/
│   ├── dump_ccb.backup # Dump do banco (copiado automaticamente)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/          # Aplicação React
│   └── app/
├── infra/            # Configurações Docker
│   └── docker-compose.yml
├── setup.sh          # Script de setup automático
└── dump_ccb.backup   # Dump original do banco
```

### 🛠️ Comandos Úteis

```bash
# Ver status dos containers
cd infra && docker compose ps

# Ver logs
cd infra && docker compose logs [serviço]

# Reiniciar serviços
cd infra && docker compose restart

# Parar tudo
cd infra && docker compose down

# Parar e remover volumes (ATENÇÃO: perde dados!)
cd infra && docker compose down -v
```

### 🔍 Verificação do Deploy

Após o setup, verifique:

1. **API Health**: `curl http://localhost:8000/health`
   - Deve retornar: `{"status":"healthy"}`

2. **Login**: Teste via API ou frontend
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin@example.com","password":"changeme"}'
   ```

3. **Frontend**: Acesse `http://localhost:5173`
   - Deve carregar a interface de login

### 🐛 Troubleshooting

#### API não inicia
```bash
cd infra && docker compose logs api
```

#### Banco não conecta
```bash
cd infra && docker compose logs db
```

#### Frontend não carrega
```bash
cd infra && docker compose logs web
```

#### Reset completo (perde todos os dados)
```bash
cd infra && docker compose down -v
cd infra && docker compose up -d
```

### 📚 Desenvolvimento

Para desenvolvimento local:

1. Execute o setup normalmente
2. Os volumes estão montados, então mudanças no código são refletidas automaticamente
3. Para desenvolvimento do frontend: `cd frontend/app && npm install && npm run dev`
4. Para desenvolvimento do backend: mudanças são refletidas via volume mount

### 🔒 Segurança

- **IMPORTANTE**: Altere as credenciais padrão após o primeiro acesso
- Considere usar secrets do Docker em produção
- Configure firewall para as portas necessárias
- Use HTTPS em produção (nginx reverse proxy recomendado)

---

**Nota**: Este setup foi testado e funciona com o estado atual do projeto. Se houver mudanças significativas no código, pode ser necessário ajustar as configurações.