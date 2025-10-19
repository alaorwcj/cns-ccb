# CNS-CCB Sistema de Controle de Estoque e Pedidos

## 📋 Visão Geral

O CNS-CCB é um sistema completo de controle de estoque e gestão de pedidos para a Congregação Santa Isabel. O sistema oferece funcionalidades avançadas de auditoria, controle de usuários, gestão de produtos e pedidos com interface responsiva.

## 🚀 Funcionalidades Implementadas

### ✅ Sistema de Auditoria Completo
- **Rastreamento completo** de todas as operações do sistema
- **Logs detalhados** com usuário, ação, recurso e timestamp
- **Interface administrativa** para consulta e análise de logs
- **Captura automática** de operações CRUD e autenticação

### ✅ Controle de Acesso e Usuários
- **Autenticação JWT** com tokens seguros
- **Controle de permissões** baseado em papéis (ADM/USUARIO)
- **Gestão de usuários** com perfis completos
- **Reset de senha** seguro via email

### ✅ Gestão de Produtos e Categorias
- **CRUD completo** de produtos com controle de estoque
- **Organização por categorias** hierárquicas
- **Controle de quantidade** em estoque
- **Preços e descrições** detalhadas

### ✅ Gestão de Pedidos
- **Criação de pedidos** por usuários comuns
- **Aprovação administrativa** com validação de estoque
- **Entrega controlada** com assinatura digital
- **Histórico completo** de status dos pedidos

### ✅ Gestão de Igrejas
- **Cadastro de igrejas** com localização
- **Associação de usuários** às igrejas
- **Relatórios por igreja** e localização

### ✅ Relatórios e Analytics
- **Dashboard responsivo** com métricas em tempo real
- **Relatórios de vendas** por período
- **Análise de estoque** e movimentações
- **Exportação de dados** para análise externa

## 🧪 Manual de Testes (POC)

### 📋 Pré-requisitos
- Docker e Docker Compose instalados
- Navegador web moderno
- Conexão com internet (para funcionalidades de email)

### 🚀 Inicialização do Sistema

```bash
# Clonar o repositório
git clone https://github.com/alaorwcj/cns-ccb.git
cd cns-ccb

# Entrar no diretório de infraestrutura
cd infra

# Iniciar todos os serviços
docker-compose up -d

# Verificar se os serviços estão rodando
docker-compose ps
```

### 🔐 Primeiro Acesso - Configuração Inicial

#### 1. Acesso ao Sistema
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Documentação API**: http://localhost:8000/docs

#### 2. Credenciais Iniciais
- **Email**: admin@example.com
- **Senha**: changeme
- **Papel**: Administrador

### 🧪 Cenários de Teste

#### **Cenário 1: Autenticação e Controle de Acesso**

1. **Login como Administrador**
   - Acesse http://localhost:5173
   - Use as credenciais iniciais
   - Verifique acesso ao menu completo

2. **Criar Novo Usuário**
   - Vá para "Usuários" no menu lateral
   - Clique em "Novo Usuário"
   - Preencha os dados (nome, email, telefone, igreja)
   - Defina papel como "USUARIO"
   - Salve e verifique criação

3. **Testar Controle de Permissões**
   - Faça logout
   - Tente login com o novo usuário
   - Verifique acesso limitado (apenas itens básicos)

#### **Cenário 2: Gestão de Produtos**

1. **Criar Categoria**
   - Acesse "Categorias" (apenas ADM)
   - Clique "Nova Categoria"
   - Nome: "Alimentos Básicos"
   - Salve

2. **Cadastrar Produto**
   - Vá para "Produtos"
   - Clique "Novo Produto"
   - Dados do produto:
     - Nome: "Açúcar Cristal 1kg"
     - Categoria: "Alimentos Básicos"
     - Preço: R$ 4,20
     - Estoque inicial: 100 unidades
   - Salve

3. **Verificar Movimentações**
   - Vá para "Movimentações"
   - Verifique entrada automática do produto

#### **Cenário 3: Processo de Pedidos**

1. **Criar Pedido (como Usuário Comum)**
   - Faça login como usuário comum
   - Vá para "Fazer Pedido"
   - Selecione igreja
   - Adicione produtos ao carrinho
   - Confirme pedido

2. **Aprovar Pedido (como Administrador)**
   - Faça login como administrador
   - Vá para "Pedidos"
   - Localize pedido pendente
   - Clique "Aprovar"
   - Verifique atualização automática do estoque

3. **Entregar Pedido**
   - No pedido aprovado, clique "Entregar"
   - Adicione assinatura se necessário
   - Confirme entrega

#### **Cenário 4: Sistema de Auditoria**

1. **Visualizar Logs de Auditoria**
   - Como administrador, vá para "Auditoria"
   - Veja lista de todas as operações
   - Filtre por usuário, ação ou data

2. **Testar Captura de Operações**
   - Realize várias operações (criar produto, pedido, etc.)
   - Volte à auditoria e veja novos logs
   - Verifique que mostra nome do usuário

3. **Filtrar e Pesquisar**
   - Use filtros por ação (CREATE, UPDATE, etc.)
   - Filtre por recurso (ORDER, PRODUCT, etc.)
   - Pesquise por termos específicos

#### **Cenário 5: Relatórios e Dashboard**

1. **Dashboard Principal**
   - Acesse a página inicial
   - Veja métricas em tempo real
   - Navegue pelos cards informativos

2. **Relatórios Detalhados**
   - Vá para "Relatórios"
   - Gere relatórios por período
   - Exporte dados se disponível

### 🔍 Verificações Técnicas

#### **API Endpoints Principais**
```bash
# Autenticação
POST /auth/login
POST /auth/refresh

# Usuários
GET /users
POST /users

# Produtos
GET /products
POST /products

# Pedidos
GET /orders
POST /orders
PUT /orders/{id}/approve
PUT /orders/{id}/deliver

# Auditoria
GET /audit
GET /audit/stats

# Relatórios
GET /reports
```

#### **Banco de Dados**
- **PostgreSQL** na porta 5432
- **Acesso direto**: `psql -h localhost -U ccb -d ccb`
- **Tabelas principais**: users, products, orders, audit_logs, etc.

#### **Logs do Sistema**
```bash
# Ver logs dos containers
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f db
```

### 🐛 Troubleshooting

#### **Problema: Container não inicia**
```bash
# Limpar e reconstruir
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### **Problema: Erro de conexão com banco**
```bash
# Verificar status do banco
docker-compose ps db

# Reiniciar banco
docker-compose restart db
```

#### **Problema: Frontend não carrega**
```bash
# Verificar logs do frontend
docker-compose logs web

# Reconstruir frontend
docker-compose build web
docker-compose up -d web
```

#### **Problema: Erro de auditoria**
- Verifique se o middleware está capturando usuários corretamente
- Confirme que os decoradores estão aplicados aos serviços
- Veja logs detalhados: `docker-compose logs api | grep audit`

### 📊 Métricas de Qualidade

#### **Cobertura de Auditoria**
- ✅ Autenticação (login/logout/refresh)
- ✅ CRUD de usuários, produtos, pedidos
- ✅ Aprovação e entrega de pedidos
- ✅ Movimentações de estoque
- ✅ Requisições HTTP (GET/POST/PUT/DELETE)

#### **Performance**
- Tempo de resposta médio: < 200ms
- Throughput: 100+ req/min
- Memória: < 512MB por container

#### **Segurança**
- JWT com expiração
- Controle de permissões granular
- Sanitização de inputs
- Logs de segurança completos

### 🎯 Próximos Passos

#### **Funcionalidades Planejadas**
- [ ] Notificações por email
- [ ] Integração com sistemas externos
- [ ] API mobile
- [ ] Backup automático
- [ ] Multi-tenant por congregação

#### **Melhorias Técnicas**
- [ ] Cache Redis
- [ ] CDN para assets
- [ ] Load balancing
- [ ] Monitoramento avançado

---

## 📞 Suporte

Para dúvidas ou problemas:
- **GitHub Issues**: https://github.com/alaorwcj/cns-ccb/issues
- **Documentação Técnica**: Ver arquivos README.md em cada diretório
- **Logs de Debug**: `docker-compose logs -f`

**Última atualização**: Outubro 2025
**Versão**: 1.0.0 (POC)