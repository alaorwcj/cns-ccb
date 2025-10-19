# Plano de Migração Econômica para AWS - Sistema CCB CNS

## 📋 Visão Geral

Este documento detalha o plano de migração econômica do sistema CCB CNS (Sistema de Controle de Pedidos da Congregação Cristã no Brasil) para uma arquitetura IaaS simples na AWS, utilizando uma única instância EC2.

### 🎯 Objetivos da Migração

- **Custo Otimizado**: Solução mais econômica possível
- **Simplicidade**: Arquitetura fácil de manter
- **Disponibilidade**: 99% uptime com backup simples
- **Escalabilidade**: Capacidade de upgrade futuro
- **Sem Perda de Dados**: Migração transparente do banco

---

## 🏗️ Arquitetura Atual vs. Proposta

### Arquitetura Atual
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend     │    │   PostgreSQL    │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (Docker)      │
│   Port: 5173    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │   Docker Compose    │
                    │   (infra/)          │
                    └─────────────────────┘
```

### Arquitetura AWS Proposta (IaaS Simples)
```
┌─────────────────────────────────────────────────────────────┐
│                        EC2 Instance                         │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   Nginx         │    │   PostgreSQL     │                │
│  │   (Port 80/443) │    │   (Port 5432)    │                │
│  └─────────────────┘    └─────────────────┘                 │
│           │                       │                        │
│           ▼                       ▼                        │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   Frontend      │    │     Backend     │                 │
│  │   (Static)      │    │   (FastAPI)     │                 │
│  │   Port: 3000    │    │   Port: 8000    │                 │
│  └─────────────────┘    └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   CloudFront    │
│   (CDN Global)  │
└─────────────────┘
```

---

## 📊 Análise de Recursos e Dimensionamento

### Estimativa de Recursos Atuais (Baseado no Código)

Baseado na análise do código e docker-compose atual:

- **Backend**: FastAPI com SQLAlchemy, Alembic migrations, JWT auth (~200MB imagem)
- **Frontend**: React + Vite + TypeScript + Tailwind (~150MB imagem)
- **Banco**: PostgreSQL 16 com ~20+ tabelas (dados estimados: 100-500MB)
- **Usuários**: Estimativa inicial de 100-500 usuários ativos
- **APIs**: 10+ endpoints (auth, users, products, orders, reports, etc.)
- **Build**: Python 3.12-slim + Node 20-bullseye
- **Dependências**: Axios, Chart.js, Zustand, SQLAlchemy, Pydantic

### Dimensionamento AWS (Econômico)

#### EC2 Instance
- **Tipo**: t3.medium (2 vCPU, 4 GB RAM) - $30-40/mês
- **Storage**: 50-100 GB gp3 SSD - $5-10/mês
- **OS**: Amazon Linux 2 ou Ubuntu 22.04
- **Backup**: Snapshots EBS semanais

#### Outros Serviços
- **CloudFront**: CDN para frontend estático - $5-10/mês
- **S3**: Storage para assets - $0.02/mês
- **Route 53**: DNS - $0.50/mês
- **Certificate Manager**: SSL gratuito

#### Rede
- **Elastic IP**: IP fixo gratuito (se usado 24/7)
- **Security Group**: Regras de firewall

---

## 🚀 Plano de Migração - Fases Detalhadas

### Fase 1: Preparação (3-5 dias)

#### 1.1 Análise e Backup
```bash
# Backup completo do banco atual
pg_dump -h localhost -U ccb -d ccb > backup_ccb_$(date +%Y%m%d).sql

# Verificar tamanho do backup
ls -lh backup_ccb_*.sql

# Fazer backup dos arquivos de configuração
tar -czf config_backup.tar.gz backend/.env frontend/app/
```

#### 1.2 Configuração da Conta AWS
```bash
# Criar usuário IAM para migração
aws iam create-user --user-name ccb-admin
aws iam attach-user-policy --user-name ccb-admin \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
aws iam attach-user-policy --user-name ccb-admin \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-user-policy --user-name ccb-admin \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess

# Criar access keys
aws iam create-access-key --user-name ccb-admin
```

#### 1.3 Setup Básico da EC2
```bash
# Criar VPC default (ou usar existente)
aws ec2 describe-vpcs

# Criar Security Group
aws ec2 create-security-group \
  --group-name ccb-sg \
  --description "CCB Application Security Group"

# Permitir SSH (apenas do seu IP)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

# Permitir HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

### Fase 2: Provisionamento da EC2 (1-2 dias)

#### 2.1 Criar Instância EC2
```bash
# Criar EC2 t3.medium
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=CCB-Prod}]' \
  --user-data file://ec2-userdata.sh

# Aguardar instância ficar running
aws ec2 wait instance-running --instance-ids i-xxxxx

# Alocar Elastic IP
aws ec2 allocate-address
aws ec2 associate-address --instance-id i-xxxxx --allocation-id eipalloc-xxxxx
```

#### 2.2 Configuração Inicial da EC2
```bash
# Conectar via SSH
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# Atualizar sistema
sudo yum update -y  # Amazon Linux
# ou
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Instalar Docker
sudo yum install -y docker  # Amazon Linux
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instalar Nginx
sudo yum install -y nginx  # Amazon Linux
sudo systemctl start nginx
sudo systemctl enable nginx

# Instalar PostgreSQL client (para restore)
sudo yum install -y postgresql
```

### Fase 3: Migração do Banco de Dados (1 dia)

#### 3.1 Instalar PostgreSQL na EC2
```bash
# Instalar PostgreSQL 16
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar banco
sudo -u postgres psql
CREATE USER ccb WITH PASSWORD 'ccb_password';
CREATE DATABASE ccb OWNER ccb;
GRANT ALL PRIVILEGES ON DATABASE ccb TO ccb;
\q

# Configurar PostgreSQL para aceitar conexões
sudo vi /var/lib/pgsql/data/pg_hba.conf
# Adicionar: local   ccb   ccb   md5
# Adicionar: host    ccb   ccb   127.0.0.1/32   md5

sudo vi /var/lib/pgsql/data/postgresql.conf
# listen_addresses = 'localhost'

sudo systemctl restart postgresql
```

#### 3.2 Migrar Dados
```bash
# Upload do backup para EC2
scp backup_ccb_20251019.sql ec2-user@YOUR_ELASTIC_IP:~/

# Restaurar no PostgreSQL da EC2
sudo -u postgres psql -d ccb < backup_ccb_20251019.sql

# Verificar se os dados foram migrados
psql -h localhost -U ccb -d ccb -c "SELECT 'users' as table, COUNT(*) FROM users UNION ALL SELECT 'products', COUNT(*) FROM products UNION ALL SELECT 'orders', COUNT(*) FROM orders;"
```

### Fase 4: Deploy da Aplicação (2-3 dias)

#### 4.1 Preparar Docker Compose para Produção
```bash
# Criar docker-compose.prod.yml baseado na configuração atual
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ccb
      POSTGRES_USER: ccb
      POSTGRES_PASSWORD: ccb_password
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ccb -d ccb"]
      interval: 5s
      timeout: 3s
      retries: 20
    networks:
      - ccb-network
    restart: unless-stopped

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+psycopg2://ccb:ccb_password@db:5432/ccb
      JWT_SECRET: "your-jwt-secret-here"
      JWT_ALG: HS256
      ACCESS_TOKEN_EXPIRES_MIN: 30
      REFRESH_TOKEN_EXPIRES_MIN: 43200
      CORS_ORIGINS: "https://ccb.suaigreja.com"
      ADMIN_EMAIL: admin@example.com
      ADMIN_PASSWORD: changeme
    depends_on:
      db:
        condition: service_healthy
    networks:
      - ccb-network
    restart: unless-stopped

  frontend:
    build: ./frontend/app
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    ports:
      - "3000:5173"
    networks:
      - ccb-network
    restart: unless-stopped

networks:
  ccb-network:
    driver: bridge

volumes:
  postgres_data:
EOF
```

#### 4.2 Configurar Nginx como Reverse Proxy
```bash
# Configurar Nginx
sudo vi /etc/nginx/nginx.conf

# Configuração baseada na estrutura atual do projeto
cat > /etc/nginx/conf.d/ccb.conf << 'EOF'
server {
    listen 80;
    server_name ccb.suaigreja.com;

    # Frontend (porta 5173 - Vite dev server)
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API (porta 8000 - FastAPI)
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Logs de erro
    error_log /var/log/nginx/ccb_error.log;
    access_log /var/log/nginx/ccb_access.log;
}
EOF

# Testar configuração
sudo nginx -t
sudo systemctl reload nginx
```

#### 4.3 Deploy da Aplicação
```bash
# Clonar repositório na EC2
git clone https://github.com/alaorwcj/cns-ccb.git
cd cns-ccb

# Configurar variáveis de ambiente do backend
cp backend/.env.example backend/.env
vi backend/.env
# DATABASE_URL=postgresql+psycopg2://ccb:ccb_password@localhost:5432/ccb
# JWT_SECRET=your-super-secret-jwt-key-here
# JWT_ALG=HS256
# ACCESS_TOKEN_EXPIRES_MIN=30
# REFRESH_TOKEN_EXPIRES_MIN=43200
# CORS_ORIGINS=https://ccb.suaigreja.com
# ADMIN_EMAIL=admin@example.com
# ADMIN_PASSWORD=changeme

# Build e start dos containers
docker-compose -f docker-compose.prod.yml up -d --build

# Aguardar healthcheck do banco
sleep 30

# Verificar se está rodando
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs

# Verificar se a API está respondendo
curl -X GET "http://localhost:8000/health"
curl -X GET "http://localhost:8000/"
```

### Fase 5: Configuração de Frontend Externo (1-2 dias)

#### 5.1 Build do Frontend para Produção
```bash
# Build do frontend
cd frontend/app
npm install
npm run build

# Criar bucket S3 para assets estáticos
aws s3 mb s3://ccb-assets-prod

# Upload do build
aws s3 sync dist/ s3://ccb-assets-prod --delete

# Configurar bucket como público
aws s3api put-bucket-policy --bucket ccb-assets-prod --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ccb-assets-prod/*"
    }
  ]
}'
```

#### 5.2 Configurar CloudFront
```bash
# Criar distribuição CloudFront
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "ccb-frontend-'$(date +%s)'",
  "Comment": "CCB Frontend Production",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "ccb-s3-origin",
        "DomainName": "ccb-assets-prod.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "ccb-s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "Enabled": true,
  "Aliases": {
    "Quantity": 1,
    "Items": ["ccb.suaigreja.com"]
  }
}'
```

### Fase 6: Configuração de DNS e SSL (1 dia)

#### 6.1 Configurar Route 53
```bash
# Criar hosted zone
aws route53 create-hosted-zone --name suaigreja.com --caller-reference $(date +%s)

# Criar registro A para a EC2
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.ccb.suaigreja.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_ELASTIC_IP"}]
      }
    }]
  }'

# Criar registro CNAME para CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "ccb.suaigreja.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "CLOUDFRONT_DOMAIN"}]
      }
    }]
  }'
```

#### 6.2 Configurar SSL com Let's Encrypt
```bash
# Instalar Certbot
sudo yum install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d ccb.suaigreja.com -d api.ccb.suaigreja.com

# Configurar renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Fase 7: Testes e Go-Live (2-3 dias)

#### 7.1 Testes Funcionais
```bash
# Testar API endpoints específicos do CCB CNS
curl -X GET "http://YOUR_ELASTIC_IP/api/health"
curl -X GET "http://YOUR_ELASTIC_IP/api/"  # Root endpoint

# Testar autenticação
curl -X POST "http://YOUR_ELASTIC_IP/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"changeme"}'

# Testar outros endpoints principais
curl -X GET "http://YOUR_ELASTIC_IP/api/users/"
curl -X GET "http://YOUR_ELASTIC_IP/api/products/"
curl -X GET "http://YOUR_ELASTIC_IP/api/churches/"
curl -X GET "http://YOUR_ELASTIC_IP/api/orders/"
curl -X GET "http://YOUR_ELASTIC_IP/api/reports/"

# Testar frontend via IP
curl -I "http://YOUR_ELASTIC_IP"

# Testar HTTPS após configurar SSL
curl -I "https://api.ccb.suaigreja.com/api/health"
curl -I "https://ccb.suaigreja.com"
```

#### 7.2 Configurar Monitoramento Básico
```bash
# Instalar CloudWatch agent
sudo yum install -y amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c ssm:AmazonCloudWatch-linux \
  -s

# Configurar alertas básicos
aws cloudwatch put-metric-alarm \
  --alarm-name "CCB-HighCPU" \
  --alarm-description "CPU usage above 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-xxxxx
```

#### 7.3 Backup Automático
```bash
# Criar script de backup
cat > /home/ec2-user/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/home/ec2-user/backup_ccb_$DATE.sql"

# Backup do banco
pg_dump -h localhost -U ccb -d ccb > $BACKUP_FILE

# Comprimir
gzip $BACKUP_FILE

# Upload para S3
aws s3 cp ${BACKUP_FILE}.gz s3://ccb-backups/

# Limpar backups antigos (manter últimos 7 dias)
find /home/ec2-user -name "backup_ccb_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/ec2-user/backup.sh

# Agendar backup diário
crontab -e
# Adicionar: 0 2 * * * /home/ec2-user/backup.sh
```

---

## 💰 Estimativa de Custos (Muito Mais Econômica)

### Custos Mensais Estimados (us-east-1)

| Serviço | Configuração | Custo Mensal |
|---------|-------------|--------------|
| **EC2 t3.medium** | 2 vCPU, 4GB RAM, 50GB SSD | $30-40 |
| **Elastic IP** | 1 IP fixo (se usado 24/7) | $0 |
| **CloudFront** | 10GB transfer | $5-10 |
| **S3** | 1GB storage + backups | $0.10 |
| **Route 53** | 1 hosted zone | $0.50 |
| **CloudWatch** | Métricas básicas | $1-2 |

**Total Estimado**: **$37-53/mês** ⭐

### Comparação com Plano Anterior
- **Plano Original**: $108-175/mês
- **Plano Econômico**: $37-53/mês
- **Economia**: **65-70% de redução** 💰

### Custos de Migração (One-time)
- **EC2 Setup**: $50-100
- **SSL Certificate**: $0 (Let's Encrypt)
- **Domínio**: $10-20/ano (se necessário)
- **Total**: **$60-120**

---

## 🔒 Segurança Básica

### Configurações Essenciais

#### 1. Security Group
```bash
# Apenas portas necessárias abertas
aws ec2 revoke-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Apenas seu IP para SSH
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32
```

#### 2. Atualizações Automáticas
```bash
# Configurar atualizações automáticas
sudo yum install -y yum-cron
sudo systemctl start yum-cron
sudo systemctl enable yum-cron
```

#### 3. Firewall Local
```bash
# Configurar firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Apenas portas necessárias
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

---

## 📋 Checklist de Migração Simplificado

### Pré-Migração
- [ ] Backup completo do banco atual
- [ ] Configuração da conta AWS
- [ ] Setup de Security Groups
- [ ] Compra/registro de domínio

### Durante a Migração
- [ ] Provisionamento da EC2
- [ ] Instalação do PostgreSQL
- [ ] Restauração dos dados
- [ ] Deploy da aplicação
- [ ] Configuração do Nginx

### Pós-Migração
- [ ] Configuração de DNS
- [ ] Setup de SSL
- [ ] Testes funcionais
- [ ] Configuração de backups
- [ ] Monitoramento básico

---

## 🚨 Plano de Rollback Simples

### Cenário de Rollback
Se problemas críticos forem identificados:

```bash
# 1. Parar containers na EC2
docker-compose -f docker-compose.prod.yml down

# 2. Restaurar backup do banco
psql -h localhost -U ccb -d ccb < backup_ccb_20251019.sql

# 3. Restart dos containers
docker-compose -f docker-compose.prod.yml up -d

# 4. Se necessário, voltar DNS para IP antigo
# (seu servidor atual continua funcionando)
```

### Tempo Estimado de Rollback: 30-60 minutos

---

## 📅 Timeline da Migração (Econômica)

| Fase | Duração | Custo Estimado | Dificuldade |
|------|---------|----------------|-------------|
| **Fase 1: Preparação** | 3-5 dias | $0 | Baixa |
| **Fase 2: EC2 Setup** | 1-2 dias | $30-40 | Média |
| **Fase 3: Banco** | 1 dia | $0 | Baixa |
| **Fase 4: Aplicação** | 2-3 dias | $0 | Média |
| **Fase 5: Frontend** | 1-2 dias | $5-10 | Baixa |
| **Fase 6: DNS/SSL** | 1 dia | $0 | Baixa |
| **Fase 7: Testes** | 2-3 dias | $0 | Baixa |

**Duração Total Estimada**: **11-18 dias**
**Custo Total**: **$35-50/mês** (vs $108-175 do plano anterior)

---

## 🔍 Considerações Específicas do Projeto CCB CNS

### Arquitetura Atual Analisada
- **Monorepo**: Backend, frontend e infra no mesmo repositório
- **Docker Compose**: 4 serviços (db, api, web, api-test) em `infra/`
- **Backend**: FastAPI com SQLAlchemy ORM, Alembic migrations, JWT auth
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Banco**: PostgreSQL 16 com healthcheck
- **EntryPoints**: Scripts customizados para inicialização

### Dependências Críticas
- **Backend**: Python 3.12-slim, SQLAlchemy, Pydantic, Uvicorn
- **Frontend**: Node 20-bullseye, React Router, Axios, Chart.js, Zustand
- **Build**: NPM CI para dependências exatas, Rollup para bundling

### Configurações Essenciais
- **Variáveis de Ambiente**: JWT secrets, CORS origins, database URLs
- **Migrations**: Alembic auto-generates initial migration se necessário
- **Seed Data**: Bootstrap de usuário admin via environment variables
- **Health Checks**: PostgreSQL healthcheck no docker-compose

### Pontos de Atenção na Migração
- **CORS**: Ajustar origins para domínio de produção
- **Database URL**: Usar `localhost` em vez de `db` service name
- **Frontend Build**: Vite roda em modo dev (porta 5173) vs produção
- **Volumes**: Dados PostgreSQL em volume nomeado para persistência
- **Environment**: Copiar `.env.example` e ajustar valores de produção

### ✅ Prós
- **Custo muito menor**: 65-70% de economia
- **Simplicidade**: Uma única instância para gerenciar
- **Flexibilidade**: Fácil upgrade (t3.medium → t3.large → etc.)
- **Controle total**: Acesso root à infraestrutura
- **Backup simples**: Snapshots EBS + scripts locais
- **Docker ready**: Migração direta do docker-compose atual
- **Tecnologias maduras**: FastAPI + React + PostgreSQL comprovadas

### ⚠️ Contras
- **Single point of failure**: Sem alta disponibilidade
- **Escalabilidade limitada**: Upgrade manual necessário
- **Manutenção**: Updates manuais do SO e aplicação
- **Backup**: Menos automatizado que RDS

---

## 📞 Suporte e Manutenção

### Monitoramento Básico
- **CloudWatch**: CPU, memória, disco
- **Logs locais**: Nginx, aplicação, PostgreSQL
- **Alertas**: CPU > 80%, disco > 85%

### Backup Strategy
- **Diário**: Backup automático do banco para S3
- **Semanal**: Snapshot EBS da EC2
- **Manual**: Snapshots sob demanda

### Manutenção Regular
- **Semanal**: Verificar logs por erros
- **Mensal**: Atualizar pacotes do sistema
- **Trimestral**: Testar restore de backup

---

## 🎯 Próximos Passos

1. **Aprovar Plano**: Este plano econômico reduz custos em ~70%
2. **Configurar AWS**: Criar conta e usuário IAM
3. **Provisionar EC2**: t3.medium com 50GB SSD
4. **Testar Migração**: Ambiente de staging primeiro
5. **Go-Live**: Migrar dados e configurar produção

---

*Esta versão econômica prioriza custo sobre complexidade, mantendo funcionalidade completa e backup adequado.*

---

## 📊 Análise de Recursos e Dimensionamento

### Estimativa de Recursos Atuais

Baseado na análise do código e docker-compose:

- **Backend**: FastAPI com SQLAlchemy
- **Frontend**: React + Vite (SPA)
- **Banco**: PostgreSQL com ~20+ tabelas
- **Usuários**: Estimativa inicial de 100-500 usuários ativos
- **Dados**: Tabelas de produtos, pedidos, usuários, igrejas, movimentações

### Dimensionamento AWS

#### Computação
- **ECS Fargate**: 2-4 tarefas (0.5-2 vCPU, 1-4 GB RAM cada)
- **RDS PostgreSQL**: db.t3.medium (2 vCPU, 4 GB RAM)
- **ElastiCache Redis**: cache.t3.micro (opcional para sessões/caching)

#### Armazenamento
- **RDS Storage**: 20-100 GB (gp3 SSD)
- **S3**: < 1 GB para assets estáticos
- **Backup**: RDS Automated Backups + Snapshots manuais

#### Rede
- **Load Balancer**: Application Load Balancer
- **CloudFront**: Global CDN
- **Route 53**: DNS management

---

## 🚀 Plano de Migração - Fases Detalhadas

### Fase 1: Preparação e Planejamento (1-2 semanas)

#### 1.1 Análise e Inventário
```bash
# Backup completo do banco atual
pg_dump -h localhost -U ccb -d ccb > backup_pre_migration.sql

# Análise de tamanho dos dados
du -sh /var/lib/postgresql/data/
ls -lh backup_pre_migration.sql

# Análise de dependências
cat backend/requirements.txt
cat frontend/package.json
```

#### 1.2 Configuração da Conta AWS
```bash
# Criar usuário IAM para migração
aws iam create-user --user-name ccb-migration-user
aws iam attach-user-policy --user-name ccb-migration-user \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Configurar AWS CLI
aws configure --profile ccb-migration
```

#### 1.3 Setup de Infraestrutura Base
```bash
# Criar VPC e subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.1.0/24
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.2.0/24

# Criar Security Groups
aws ec2 create-security-group --group-name ccb-db-sg --description "CCB Database"
aws ec2 create-security-group --group-name ccb-app-sg --description "CCB Application"
```

### Fase 2: Migração do Banco de Dados (2-3 dias)

#### 2.1 Criar RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier ccb-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 16 \
  --master-username ccb_admin \
  --master-user-password "SENHA_SECRETA" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name ccb-db-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --publicly-accessible
```

#### 2.2 Migração dos Dados
```bash
# Aguardar RDS ficar disponível
aws rds wait db-instance-available --db-instance-identifier ccb-prod

# Obter endpoint do RDS
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier ccb-prod \
  --query 'DBInstances[0].Endpoint.Address' --output text)

# Restaurar backup no RDS
psql -h $RDS_ENDPOINT -U ccb_admin -d postgres -c "CREATE DATABASE ccb;"
psql -h $RDS_ENDPOINT -U ccb_admin -d ccb < backup_pre_migration.sql

# Executar migrations do Alembic
cd backend
alembic upgrade head
```

#### 2.3 Validação da Migração
```bash
# Verificar contagem de registros
psql -h $RDS_ENDPOINT -U ccb_admin -d ccb -c "SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders;"

# Testar conexões
python -c "
import psycopg2
conn = psycopg2.connect(f'host=$RDS_ENDPOINT dbname=ccb user=ccb_admin password=SENHA_SECRETA')
print('Conexão RDS: OK')
"
```

### Fase 3: Migração da Aplicação Backend (3-5 dias)

#### 3.1 Preparar Imagens Docker
```bash
# Build da imagem do backend
cd backend
docker build -t ccb-backend:latest .

# Push para ECR
aws ecr create-repository --repository-name ccb-backend
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag ccb-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/ccb-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/ccb-backend:latest
```

#### 3.2 Criar ECS Cluster e Task Definition
```bash
# Criar cluster ECS
aws ecs create-cluster --cluster-name ccb-prod

# Task Definition
cat > task-definition.json << EOF
{
  "family": "ccb-backend",
  "taskRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
  "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "ccb-backend",
      "image": "<account>.dkr.ecr.<region>.amazonaws.com/ccb-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "DATABASE_URL", "value": "postgresql+psycopg2://ccb_admin:SENHA_SECRETA@$RDS_ENDPOINT/ccb"},
        {"name": "JWT_SECRET", "value": "CHAVE_SECRETA_JWT"},
        {"name": "CORS_ORIGINS", "value": "https://ccb.suaigreja.com"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ccb-backend",
          "awslogs-region": "<region>",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### 3.3 Criar Load Balancer e Service
```bash
# Criar Application Load Balancer
aws elbv2 create-load-balancer \
  --name ccb-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx

# Criar Target Group
aws elbv2 create-target-group \
  --name ccb-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-xxxxx \
  --target-type ip

# Criar Service ECS
aws ecs create-service \
  --cluster ccb-prod \
  --service-name ccb-backend-service \
  --task-definition ccb-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx]}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/ccb-backend-tg/xxx,containerName=ccb-backend,containerPort=8000"
```

### Fase 4: Migração do Frontend (2-3 dias)

#### 4.1 Build e Deploy para S3 + CloudFront
```bash
# Build do frontend
cd frontend/app
npm install
npm run build

# Criar bucket S3
aws s3 mb s3://ccb-frontend-prod

# Configurar bucket como site estático
aws s3 website s3://ccb-frontend-prod --index-document index.html --error-document index.html

# Upload dos arquivos
aws s3 sync dist/ s3://ccb-frontend-prod --delete

# Criar CloudFront Distribution
cat > cloudfront-config.json << EOF
{
  "CallerReference": "ccb-frontend-$(date +%s)",
  "Comment": "CCB Frontend Production",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "ccb-s3-origin",
        "DomainName": "ccb-frontend-prod.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "ccb-s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "Enabled": true,
  "Aliases": {
    "Quantity": 1,
    "Items": ["ccb.suaigreja.com"]
  }
}
EOF

aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

#### 4.2 Configurar Route 53 e Certificate Manager
```bash
# Criar hosted zone (se necessário)
aws route53 create-hosted-zone --name suaigreja.com --caller-reference $(date +%s)

# Criar certificado SSL
aws acm request-certificate \
  --domain-name ccb.suaigreja.com \
  --validation-method DNS

# Criar record A para CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "ccb.suaigreja.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "CLOUDFRONT_DISTRIBUTION_URL",
          "HostedZoneId": "Z2FDTNDATAQYW2"
        }
      }
    }]
  }'
```

### Fase 5: Testes e Validação (3-5 dias)

#### 5.1 Testes Funcionais
```bash
# Testar endpoints da API
curl -X GET "https://api.ccb.suaigreja.com/health"
curl -X POST "https://api.ccb.suaigreja.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"SENHA"}'

# Testar frontend
curl -I "https://ccb.suaigreja.com"
```

#### 5.2 Testes de Performance
```bash
# Load testing com Artillery
npm install -g artillery
artillery quick --count 50 --num 10 https://api.ccb.suaigreja.com/health
```

#### 5.3 Validação de Dados
```bash
# Comparar contagens
psql -h $RDS_ENDPOINT -U ccb_admin -d ccb -c "
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'churches', COUNT(*) FROM churches;"

# Verificar integridade referencial
psql -h $RDS_ENDPOINT -U ccb_admin -d ccb -c "
SELECT COUNT(*) as orphaned_orders
FROM orders o
LEFT JOIN churches c ON o.church_id = c.id
WHERE c.id IS NULL;"
```

### Fase 6: Go-Live e Monitoramento (1 semana)

#### 6.1 Cutover
```bash
# Atualizar DNS para apontar para AWS
# Monitorar logs durante 24-48 horas
aws logs tail /ecs/ccb-backend --follow

# Verificar métricas no CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

#### 6.2 Configurar Monitoramento
```bash
# CloudWatch Alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "CCB-HighCPU" \
  --alarm-description "CPU usage above 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold

# Configurar X-Ray para tracing
aws xray create-group --group-name ccb-backend
```

---

## 🔒 Segurança e Compliance

### Configurações de Segurança

#### 1. IAM Roles e Policies
```bash
# Criar roles específicas
aws iam create-role --role-name ccb-ecs-task-role \
  --assume-role-policy-document file://ecs-task-trust-policy.json

aws iam attach-role-policy --role-name ccb-ecs-task-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

#### 2. Security Groups
```bash
# ALB Security Group - apenas HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# RDS Security Group - apenas do ECS
aws ec2 authorize-security-group-ingress \
  --group-id $DB_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG
```

#### 3. Secrets Management
```bash
# Usar AWS Secrets Manager
aws secretsmanager create-secret \
  --name ccb/database \
  --secret-string '{"username":"ccb_admin","password":"SENHA_SECRETA"}'

aws secretsmanager create-secret \
  --name ccb/jwt \
  --secret-string '{"secret":"CHAVE_JWT_SECRETA"}'
```

### Configurações de Rede

#### VPC e Subnets
```bash
# Criar VPC com subnets públicas e privadas
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.3.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.4.0/24 --availability-zone us-east-1b

# Internet Gateway e NAT Gateway
aws ec2 create-internet-gateway
aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET_1 --allocation-id $EIP_ID
```

---

## 💰 Estimativa de Custos

### Custos Mensais Estimados (us-east-1)

| Serviço | Configuração | Custo Mensal |
|---------|-------------|--------------|
| **ECS Fargate** | 2 tarefas (0.5 vCPU, 1GB RAM) | $30-50 |
| **RDS PostgreSQL** | db.t3.medium, 20GB | $50-70 |
| **Application Load Balancer** | 1 ALB | $15-20 |
| **CloudFront** | 10GB transfer | $5-10 |
| **S3** | 1GB storage | $0.02 |
| **Route 53** | 1 hosted zone | $0.50 |
| **CloudWatch** | Logs e métricas | $5-10 |
| **Certificate Manager** | 1 certificado | $0 |
| **Backup Storage** | 20GB | $2-5 |

**Total Estimado**: $108-175/mês

### Custos de Migração (One-time)
- **Consultoria/Implementação**: $2,000-5,000
- **Treinamento**: $500-1,000
- **Testes**: $500-1,000

---

## 📋 Checklist de Migração

### Pré-Migração
- [ ] Backup completo do banco atual
- [ ] Análise de dependências e compatibilidade
- [ ] Configuração da conta AWS
- [ ] Setup de VPC, subnets e security groups
- [ ] Testes de conectividade AWS

### Durante a Migração
- [ ] Migração do banco de dados
- [ ] Deploy do backend no ECS
- [ ] Deploy do frontend no S3/CloudFront
- [ ] Configuração de DNS e SSL
- [ ] Testes funcionais completos

### Pós-Migração
- [ ] Validação de dados
- [ ] Testes de performance
- [ ] Configuração de monitoramento
- [ ] Documentação atualizada
- [ ] Treinamento da equipe

---

## 🚨 Plano de Rollback

### Cenário de Rollback
Se problemas críticos forem identificados após a migração:

```bash
# 1. Restaurar banco do backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ccb-rollback \
  --db-snapshot-identifier ccb-pre-migration-snapshot

# 2. Atualizar DNS para apontar de volta para infraestrutura antiga
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "ccb.suaigreja.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "IP_ANTIGO"}]
      }
    }]
  }'

# 3. Escalar ECS para zero
aws ecs update-service \
  --cluster ccb-prod \
  --service ccb-backend-service \
  --desired-count 0
```

### Tempo Estimado de Rollback: 2-4 horas

---

## 📅 Timeline da Migração

| Fase | Duração | Responsável | Dependências |
|------|---------|-------------|--------------|
| **Fase 1: Planejamento** | 1-2 semanas | DevOps/Arquitetura | Aprovação do orçamento |
| **Fase 2: Banco de Dados** | 2-3 dias | DBA/DevOps | Ambiente AWS configurado |
| **Fase 3: Backend** | 3-5 dias | Backend/DevOps | Banco migrado |
| **Fase 4: Frontend** | 2-3 dias | Frontend/DevOps | Backend funcionando |
| **Fase 5: Testes** | 3-5 dias | QA/Equipe | Todos os componentes |
| **Fase 6: Go-Live** | 1 semana | DevOps/Equipe | Testes aprovados |

**Duração Total Estimada**: 4-6 semanas

---

## 📞 Suporte e Manutenção

### Monitoramento Contínuo
- **CloudWatch**: Métricas de performance e erros
- **X-Ray**: Tracing distribuído
- **RDS Performance Insights**: Análise de queries lentas

### Alertas Críticos
- CPU > 80% por 5 minutos
- Memória > 85% por 5 minutos
- Erros 5xx > 5% das requests
- Latência > 2s por 5 minutos

### Plano de Backup
- **RDS Automated Backups**: Diários com retenção de 7 dias
- **Snapshots Manuais**: Semanais com retenção de 30 dias
- **Cross-Region Backup**: Para DR (opcional)

---

## 🎯 Próximos Passos

1. **Revisar o plano** no `MIGRATE.md` - adaptado para a arquitetura real do projeto
2. **Verificar dependências** no `backend/requirements.txt` e `frontend/app/package.json`
3. **Testar docker-compose** localmente: `cd infra && docker-compose up -d --build`
4. **Aprovar orçamento** ($35-50/mês vs $108-175 do plano anterior)
5. **Configurar conta AWS** e usuário IAM
6. **Provisionar EC2 t3.medium** com Docker e Docker Compose
7. **Testar migração** em ambiente de staging primeiro
8. **Go-Live**: Migrar dados e configurar produção

---

*Este plano foi ajustado especificamente para o repositório https://github.com/alaorwcj/cns-ccb.git, considerando a arquitetura FastAPI + React + PostgreSQL atual.*</content>
<parameter name="filePath">/root/app/cns-ccb/MIGRATE.md