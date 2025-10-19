# Plano de Migração para AWS - Sistema CCB CNS

## 📋 Visão Geral

Este documento detalha o plano completo de migração do sistema CCB CNS (Sistema de Controle de Pedidos da Congregação Cristã no Brasil) da infraestrutura atual baseada em Docker Compose para uma arquitetura nativa da AWS.

### 🎯 Objetivos da Migração

- **Alta Disponibilidade**: Sistema 99.9% uptime
- **Escalabilidade**: Auto-scaling baseado em demanda
- **Segurança**: Implementar melhores práticas de segurança AWS
- **Custos Otimizados**: Pagar apenas pelo uso
- **Backup e Recuperação**: Estratégia robusta de DR
- **Monitoramento**: Observabilidade completa
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

### Arquitetura AWS Proposta
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway   │    │   ECS Fargate   │
│   + S3 Static   │◄──►│   (Opcional)    │◄──►│   (Backend)     │
│   (Frontend)    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐    ┌─────────────────┐
                    │   RDS PostgreSQL    │    │   ElastiCache    │
                    │   (Banco de Dados)  │    │   (Redis)        │
                    └─────────────────────┘    └─────────────────┘
```

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

1. **Revisar e Aprovar**: Este plano deve ser revisado pela equipe técnica e aprovado pela gestão
2. **Orçamento**: Confirmar orçamento disponível para a migração
3. **Equipe**: Designar responsáveis para cada fase
4. **Cronograma**: Definir datas específicas para cada fase
5. **Iniciar Fase 1**: Começar com o planejamento detalhado e configuração da conta AWS

---

*Este documento deve ser atualizado conforme a migração progride e novos requisitos são identificados.*</content>
<parameter name="filePath">/root/app/cns-ccb/MIGRATE.md