# Changelog - CNS-CCB Sistema de Controle

## [1.0.0] - 2025-10-19 - Sistema de Auditoria Completo

### ✅ Adicionado

#### **Sistema de Auditoria Completo**
- **Middleware HTTP** para captura automática de todas as requisições
- **Decoradores de serviço** (`@audit_create`, `@audit_update`, `@audit_delete`)
- **Modelo de dados** `AuditLog` com campos completos (usuário, ação, recurso, timestamps)
- **API de auditoria** com endpoints para consulta e estatísticas
- **Interface frontend** completa com filtros avançados e exibição de nome do usuário
- **Captura inteligente** de valores com conversão de tipos não-serializáveis

#### **Correções Críticas**
- **Serialização JSON** corrigida para objetos datetime e enums
- **Nomes de usuários** agora aparecem corretamente nos logs (não mais "-")
- **Aprovação de pedidos** funcionando sem erros de transação
- **Movimentações de estoque** sendo criadas corretamente na aprovação

#### **Backend Improvements**
- **Join otimizado** entre tabelas `audit_logs` e `users`
- **Schema Pydantic** atualizado com campo `user_name`
- **Middleware JWT** extraindo `user_id` corretamente do token
- **Tratamento de erros** melhorado nos decoradores

#### **Frontend Enhancements**
- **Interface de auditoria** responsiva com filtros avançados
- **Exibição de nome do usuário** ao invés de ID
- **Menu lateral** com ícone de auditoria para administradores
- **Navegação integrada** no sistema existente

### 🔧 Modificado

#### **Arquivos Alterados**
- `backend/app/api/middleware/audit.py` - Extração correta de user_id
- `backend/app/schemas/audit.py` - Campo user_name adicionado
- `backend/app/api/routes/audit.py` - Query com join e processamento de resultados
- `backend/app/services/audit_decorators.py` - Serialização inteligente de objetos
- `frontend/app/src/routes/audit/AuditLogs.tsx` - Interface completa de auditoria
- `frontend/app/src/components/AppLayout.tsx` - Menu lateral com auditoria

#### **Database Changes**
- **Nova tabela**: `audit_logs` com índices otimizados
- **Migration**: `b1a2c3d4e5f6_add_order_signature.py` aplicada
- **Relacionamentos**: AuditLog ↔ User estabelecidos

### 🐛 Corrigido

- **Erro de serialização JSON** em decoradores de auditoria
- **Transações rollback** durante aprovação de pedidos
- **Movimentações de estoque** não sendo criadas
- **Nomes de usuários** não aparecendo nos logs
- **Objetos datetime** causando falhas na auditoria

### 📚 Documentação

- **Manual POC** criado com cenários completos de teste
- **Instruções de setup** detalhadas
- **Troubleshooting** para problemas comuns
- **Cobertura de funcionalidades** documentada

### 🔒 Segurança

- **Auditoria completa** de todas as operações sensíveis
- **Logs de autenticação** com IP e user-agent
- **Controle de permissões** mantido
- **Sanitização de dados** nos logs

---

## [0.9.0] - 2025-10-18 - Sistema Base Funcional

### ✅ Funcionalidades Existentes
- Autenticação JWT
- CRUD de usuários, produtos, pedidos
- Controle de estoque
- Dashboard responsivo
- Relatórios básicos
- Gestão de igrejas e categorias

---

**Legenda:**
- ✅ Adicionado
- 🔧 Modificado
- 🐛 Corrigido
- 📚 Documentação
- 🔒 Segurança