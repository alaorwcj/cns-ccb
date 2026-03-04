# feat: Complete Orders Module Overhaul - 6 Major Features (v1.0-v1.4)

## 📋 Resumo das Mudanças

Este PR implementa **6 funcionalidades principais** no módulo de Pedidos, com foco em melhorias de UX, colaboração e design profissional.

**Total de commits:** 12  
**Branch:** `deploy/fix-orders-ui` → `main`

---

## ✨ Features Implementadas

### v1.0.0 - Features Iniciais
- ✅ **Recibo em 2 Vias**: Cada PDF gera VIA ADMINISTRAÇÃO + VIA COMPRADOR
- ✅ **Edição ADM**: Administradores podem editar qualquer pedido pendente
- ✅ **Impressão em Lote**: Seleção via checkboxes para imprimir múltiplos recibos em um único PDF

### v1.1.1 - Bug Fixes
- ✅ Corrigido endpoint `/orders/batch-receipts` para aceitar JSON body com Pydantic schema
- ✅ Corrigido SQLAlchemy `selectinload` syntax para carregar products corretamente
- ✅ Resolvido erro CORS no frontend

### v1.2.0 - Edição Colaborativa
- ✅ Usuários podem editar **qualquer pedido pendente** de suas igrejas atribuídas (não apenas os próprios)
- ✅ Promove trabalho colaborativo entre membros da mesma congregação
- ✅ Backend valida permissões por igreja, não por requester

### v1.3.0 - Criação Livre de Pedidos
- ✅ Removida lógica de auto-load de pedido pendente na tela "Criar Pedido"
- ✅ Usuários com múltiplas igrejas podem escolher livremente qual igreja ao criar novo pedido
- ✅ Edição de pendentes feita exclusivamente via botão "Editar" na lista
- ✅ Removido estado `existingOrder` e função `decodeUserIdFromJWT`

### v1.4.0 - Design Moderno do Recibo
- ✅ PDF redesenhado com layout profissional "Delivery Note"
- ✅ Tema cinza (#d3d3d3) com cabeçalho elegante
- ✅ Logo CCB integrado no cabeçalho (esquerda superior)
- ✅ Tabela estruturada com linhas alternadas (#F5F5F5)
- ✅ Título "Recibo de Entrega" (atualizado de "Nota de Entrega")
- ✅ Seção "Entregar para" com dados do solicitante e igreja
- ✅ Termos e condições no rodapé
- ✅ Múltiplos caminhos para logo (fallback automático)

---

## 🗂️ Arquivos Modificados

### Backend
- `backend/app/services/receipt.py` - Redesign completo do PDF com tema cinza
- `backend/app/api/routes/orders.py` - Edição colaborativa + endpoint batch receipts
- `backend/app/schemas/order.py` - Schema `BatchReceiptsRequest`
- `backend/ccb.png` - **NOVO** Logo CCB adicionado ao backend

### Frontend
- `frontend/app/src/routes/orders/OrdersList.tsx` - Batch selection UI + Edit button simplificado
- `frontend/app/src/routes/orders/OrderCreate.tsx` - Removido auto-load de pedido pendente

### Documentação
- `DEPLOY_ROLLBACK_ORDERS_FEATURES.md` - Plano completo de rollback para todas as versões

---

## 🧪 Como Testar

### 1. Recibo em 2 Vias + Design Moderno
```bash
# Como ADM:
1. Vá para http://162.220.11.4:8080/orders
2. Clique em "Recibo" de um pedido entregue
3. Verifique:
   - PDF tem 2 páginas (VIA ADMINISTRAÇÃO e VIA COMPRADOR)
   - Cabeçalho cinza (#d3d3d3)
   - Logo CCB visível no canto superior esquerdo
   - Título "Recibo de Entrega"
   - Tabela com linhas alternadas
   - Termos e condições no rodapé
```

### 2. Edição ADM
```bash
# Como ADM:
1. Localize um pedido com status PENDENTE (de qualquer usuário)
2. Clique em "Editar"
3. Altere itens/quantidades e salve
4. Verifique que a edição foi aplicada
```

### 3. Impressão em Lote
```bash
# Como ADM:
1. Vá para /orders
2. Use checkboxes para selecionar múltiplos pedidos entregues
   OU clique em "Selecionar Entregues"
3. Clique em "Imprimir Selecionados"
4. Verifique:
   - PDF consolidado com 2 páginas para cada pedido
   - Mesmo design moderno em todas as páginas
```

### 4. Edição Colaborativa (Nova Regra)
```bash
# Cenário 1: Edição permitida
# Como usuário João (pertence às igrejas Central e Vila Paula):
1. Localize pedido PENDENTE da Igreja Central criado por Maria
2. Clique em "Editar" (agora visível!)
3. Altere itens e salve
4. Sucesso ✅

# Cenário 2: Edição bloqueada
# Como João:
1. Tente editar pedido de igreja NÃO atribuída
2. Deve retornar erro 403 "Not allowed" ❌
```

### 5. Criação Livre de Pedidos (Múltiplas Igrejas)
```bash
# Como usuário com 2+ igrejas:
1. Clique em "Novo Pedido"
2. Verifique que campo "Selecione a igreja" está VAZIO (não pré-selecionado)
3. Escolha "Igreja Central" no dropdown
4. Adicione itens e confirme pedido
5. Volte e clique em "Novo Pedido" novamente
6. Agora escolha "Vila Paula"
7. Confirme segundo pedido
8. Resultado: Dois pedidos criados para igrejas diferentes ✅
```

---

## 🔄 Rollback

Consulte `DEPLOY_ROLLBACK_ORDERS_FEATURES.md` para instruções completas de rollback.

**Opções disponíveis:**

### 1. Git Revert (Recomendado)
```bash
# Reverter para v1.3.0 (antes do design cinza)
git revert dcae968

# Reverter para v1.2.0 (antes da criação livre)
git revert 176bc82

# Reverter tudo (voltar para versão original)
git revert fc5f4f2^..HEAD
```

### 2. Rollback Manual
- Instruções detalhadas arquivo por arquivo no `DEPLOY_ROLLBACK_ORDERS_FEATURES.md`
- Inclui código completo para reverter cada funcionalidade

### 3. Rollback Específico por Versão
- v1.4.0 → v1.3.0: Voltar tema azul
- v1.3.0 → v1.2.0: Restaurar auto-load de pedido pendente
- v1.2.0 → v1.1.1: Restaurar edição apenas para requester
- v1.1.1 → v1.0.0: Remover batch-receipts fix
- v1.0.0 → original: Remover todas as features

---

## 📊 Principais Commits

```
daf67c2 - fix: add CCB logo to receipt PDF and change title to 'Recibo de Entrega'
92c3708 - docs: update rollback plan with v1.4.0 gray theme receipt design
dcae968 - style: change receipt PDF theme from blue to gray (#d3d3d3)
b83267a - feat: redesign receipt PDF with modern delivery note layout
0656e7c - docs: update rollback plan with v1.3.0 changes
176bc82 - refactor: remove auto-load pending order in OrderCreate
7ea073a - docs: update rollback plan with v1.2.0 collaborative editing
8c73dfa - feat: allow users to edit any pending order from assigned churches
640a72b - fix: correct selectinload syntax for batch receipts
b6d88a3 - docs: update rollback plan with batch-receipts fix
f517dd7 - fix: correct batch-receipts endpoint to accept proper JSON body
fc5f4f2 - feat: add 3 new orders features with rollback plan
```

---

## 🎯 Benefícios de Negócio

1. **Eficiência Operacional**: Impressão em lote economiza tempo da administração
2. **Colaboração**: Múltiplos usuários podem gerenciar pedidos da mesma igreja
3. **Flexibilidade**: Usuários com múltiplas igrejas não ficam mais "presos" em uma
4. **Profissionalismo**: Recibos com design moderno e logo institucional
5. **Auditoria**: Duas vias garantem rastreabilidade (ADM + Comprador)
6. **Redução de Erros**: Frontend simplificado com menos estados e condicionais

---

## ✅ Checklist

- [x] Código testado localmente
- [x] Documentação de rollback completa (`DEPLOY_ROLLBACK_ORDERS_FEATURES.md`)
- [x] Containers reconstruídos e funcionando
- [x] Logo CCB incluído no build Docker
- [x] Tema cinza (#d3d3d3) aplicado conforme solicitado
- [x] Título "Recibo de Entrega" atualizado
- [x] Sem erros de lint/compile
- [x] Backend valida permissões corretamente
- [x] Frontend simplificado (menos estados)
- [x] PDF com fallback para múltiplos caminhos de logo
- [x] Testes manuais realizados
- [x] Branch pushed: `deploy/fix-orders-ui`

---

## 🚀 Deploy

**Sistema já em produção:**
- URL: http://162.220.11.4:8080
- API: http://162.220.11.4:8000
- Containers atualizados via Docker Compose

**Para aplicar em outros ambientes:**
```bash
cd infra
docker compose build --no-cache
docker compose up -d
```

---

**Ready to merge!** 🎉

**Próximos passos após merge:**
1. Testar em produção com usuários reais
2. Coletar feedback sobre novo design do recibo
3. Considerar adicionar feature flags para rollback dinâmico
4. Documentar para usuários finais (manual de uso)
