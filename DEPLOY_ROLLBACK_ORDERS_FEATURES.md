# Rollback Plan - Orders Features (Recibo 2 Vias, Edição ADM, Impressão em Lote)

**Data**: 2025-10-26  
**Branch**: deploy/fix-orders-ui  
**Versão**: 1.2.0  
**Última atualização**: 2025-10-26 (nova regra de edição colaborativa)

## Resumo das Mudanças

Quatro funcionalidades foram adicionadas/modificadas no módulo de Pedidos (/orders):

1. **Recibo em 2 Vias**: Cada recibo PDF agora gera duas páginas (VIA ADMINISTRAÇÃO e VIA COMPRADOR)
2. **Edição ADM de Pedidos Pendentes**: Administradores podem editar qualquer pedido com status PENDENTE
3. **Impressão em Lote**: Interface para selecionar múltiplos pedidos entregues e imprimir seus recibos em um único PDF consolidado
4. **Edição Colaborativa (NOVO v1.2.0)**: Usuários comuns podem editar qualquer pedido pendente de suas igrejas atribuídas (não apenas os próprios)

### Correções Aplicadas (v1.1.1)
- **Fix batch-receipts endpoint**: Corrigido para aceitar JSON body com schema Pydantic (`{order_ids: [...]}`), resolvendo erro CORS e parsing
- Adicionado `BatchReceiptsRequest` schema em `order.py`
- Frontend atualizado para enviar body no formato correto
- **Fix selectinload**: Corrigido syntax para carregar products com `OrderItem.product`

### Nova Funcionalidade (v1.2.0)
- **Edição Colaborativa**: Removida restrição de "apenas o requester pode editar"
- Agora qualquer membro da igreja pode editar pedidos pendentes dessa igreja
- Promove trabalho colaborativo entre membros da mesma congregação

---

## Arquivos Modificados

### Backend

1. **`backend/app/services/receipt.py`**
   - Modificado: `generate_order_receipt_pdf()` - agora gera 2 páginas (via ADM e via COMPRADOR)
   - Adicionado: `generate_batch_receipts_pdf()` - gera PDF consolidado para múltiplos pedidos

2. **`backend/app/api/routes/orders.py`**
   - Modificado: `PUT /orders/{order_id}` - permite ADM editar pedidos pendentes (além do requester)
   - Adicionado: `POST /orders/batch-receipts` - endpoint para gerar recibos em lote (corrigido para usar Pydantic schema)

3. **`backend/app/schemas/order.py`**
   - Adicionado: `BatchReceiptsRequest` schema para validação do body do endpoint batch-receipts

### Frontend

3. **`frontend/app/src/routes/orders/OrdersList.tsx`**
   - Adicionado: Estado `selectedOrders` e `printingBatch` para gerenciar seleção em lote
   - Adicionado: Checkboxes na tabela (coluna extra para ADM em pedidos entregues)
   - Adicionado: Botões "Selecionar Entregues", "Imprimir Selecionados", "Limpar"
   - Modificado: Condição do botão "Editar" para incluir `role === 'ADM'` em pedidos pendentes
   - Adicionado: Funções `toggleSelectOrder()`, `selectAllDelivered()`, `clearSelection()`, `printBatch()`
   - Corrigido: `printBatch()` envia `{order_ids: [...]}` em vez de array direto

---

## Como Testar as Novas Funcionalidades

### 1. Recibo em 2 Vias

```bash
# Como ADM, após entregar um pedido:
# 1. Vá para /orders
# 2. Clique no botão "Recibo" de um pedido entregue
# 3. Verifique que o PDF tem 2 páginas:
#    - Página 1: VIA: ADMINISTRAÇÃO
#    - Página 2: VIA: COMPRADOR
```

### 2. Edição ADM de Pedidos Pendentes

```bash
# Como ADM:
# 1. Vá para /orders
# 2. Localize um pedido com status PENDENTE (de qualquer usuário)
# 3. Clique em "Editar"
# 4. Altere itens/quantidades e salve
# 5. Verifique que a edição foi aplicada
```

### 3. Impressão em Lote

```bash
# Como ADM:
# 1. Vá para /orders
# 2. Use checkboxes para selecionar múltiplos pedidos entregues
#    - Ou clique em "Selecionar Entregues" para marcar todos automaticamente
# 3. Clique em "Imprimir Selecionados"
# 4. Verifique que o PDF consolidado tem 2 páginas para cada pedido selecionado
```

### 4. Edição Colaborativa (v1.2.0)

```bash
# Cenário 1: Usuário João (pertence às igrejas Central e Vila Paula)
# 1. Faça login como João
# 2. Vá para /orders
# 3. Localize um pedido PENDENTE da Igreja Central criado por Maria
# 4. Clique em "Editar" (agora visível!)
# 5. Altere itens/quantidades e salve
# 6. Verifique que a edição foi aplicada com sucesso
# 7. Tente editar um pedido de uma igreja à qual João NÃO pertence
# 8. Deve retornar erro 403 "Not allowed"

# Cenário 2: Verificar que apenas PENDENTES podem ser editados
# 1. Como qualquer usuário, localize um pedido APROVADO da sua igreja
# 2. Botão "Editar" NÃO deve aparecer (apenas status PENDENTE)
```

---

## Plano de Rollback

### Opção 1: Rollback via Git (Recomendado)

```bash
# 1. Identificar o commit anterior (antes das mudanças)
git log --oneline

# 2. Fazer rollback para o commit anterior
git revert <commit_hash_das_mudanças>

# 3. OU reverter para branch estável
git checkout <branch_estável>

# 4. Rebuild e restart dos containers
cd infra
docker-compose build --no-cache
docker-compose up -d
```

### Opção 2: Rollback Manual (Arquivo por Arquivo)

#### Backend: `backend/app/services/receipt.py`

Reverter para versão anterior (gera apenas 1 via):

```python
# Remover a função generate_batch_receipts_pdf() completamente

# Modificar generate_order_receipt_pdf():
def generate_order_receipt_pdf(db: Session, order: Order) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # [... código existente para desenhar recibo ...]
    
    # REMOVER ESTAS LINHAS:
    # draw_receipt_page("ADMINISTRAÇÃO")
    # c.showPage()
    # draw_receipt_page("COMPRADOR")
    
    # MANTER APENAS:
    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
```

#### Backend: `backend/app/api/routes/orders.py`

**Para reverter Edição Colaborativa (v1.2.0 → v1.1.1)**:

```python
@router.put("/{order_id}", response_model=OrderRead)
def update(order_id: int, data: OrderUpdate, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    user_id = int(payload.get("user_id"))
    user_role = payload.get("role")
    is_admin = user_role == UserRole.ADM.value
    
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != OrderStatus.PENDENTE:
        raise HTTPException(status_code=400, detail="Only pending orders can be updated")
    
    # RESTAURAR esta lógica (versão v1.1.1 - ADM ou requester):
    if not is_admin:
        if order.requester_id != user_id:
            if not order.church or not any(u.id == user_id for u in order.church.users):
                raise HTTPException(status_code=403, detail="Not allowed")
    
    # OU para versão ORIGINAL (antes de todas features - apenas requester):
    # if order.requester_id != user_id:
    #     if not order.church or not any(u.id == user_id for u in order.church.users):
    #         raise HTTPException(status_code=403, detail="Not allowed")
    
    try:
        return update_order(db, order=order, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Para reverter endpoint original (antes das features)**:

```python
@router.put("/{order_id}", response_model=OrderRead)
def update(order_id: int, data: OrderUpdate, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    # LÓGICA ORIGINAL: apenas requester ou membro da igreja podem editar
    user_id = int(payload.get("user_id"))
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.requester_id != user_id:
        if not order.church or not any(u.id == user_id for u in order.church.users):
            raise HTTPException(status_code=403, detail="Not allowed")
    if order.status != OrderStatus.PENDENTE:
        raise HTTPException(status_code=400, detail="Only pending orders can be updated")
    try:
        return update_order(db, order=order, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=400, detail="Only pending orders can be updated")
    try:
        return update_order(db, order=order, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

Remover endpoint `/batch-receipts`:

```python
# DELETAR completamente o endpoint:
# @router.post("/batch-receipts")
# def batch_receipts(...): ...
```

#### Frontend: `frontend/app/src/routes/orders/OrdersList.tsx`

**Para reverter Edição Colaborativa (v1.2.0 → v1.1.1)**:

```tsx
// RESTAURAR condição original do botão Editar (versão v1.1.1 - ADM ou requester):
{o.status === 'PENDENTE' && (role === 'ADM' || o.requester_id === Number(localStorage.getItem('user_id'))) && (
  <button className="px-2 py-1 rounded bg-white dark:bg-gray-700 dark:text-white border dark:border-gray-600 text-xs" onClick={() => startEdit(o)}>Editar</button>
)}
```

**Para reverter para versão ORIGINAL (antes das features - apenas requester)**:

```tsx
// VERSÃO ORIGINAL: apenas requester pode editar
{o.status === 'PENDENTE' && o.requester_id === Number(localStorage.getItem('user_id')) && (
  <button className="px-2 py-1 rounded bg-white dark:bg-gray-700 dark:text-white border dark:border-gray-600 text-xs" onClick={() => startEdit(o)}>Editar</button>
)}
```

**Para reverter seleção em lote completamente**:

```tsx
// REMOVER:
const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
const [printingBatch, setPrintingBatch] = useState(false)

// REMOVER funções:
// toggleSelectOrder()
// selectAllDelivered()
// clearSelection()
// printBatch()

// REMOVER checkboxes e botões de seleção em lote do JSX

// REVERTER condição do botão Editar:
{o.status === 'PENDENTE' && o.requester_id === Number(localStorage.getItem('user_id')) && (
  <button ... onClick={() => startEdit(o)}>Editar</button>
)}

// REMOVER coluna de checkbox da tabela
```

### Opção 3: Rollback por Feature Flag (Futuro)

Para implementações futuras, considere adicionar feature flags no backend `.env`:

```env
ENABLE_DUAL_RECEIPT=false
ENABLE_ADM_EDIT_PENDING=false
ENABLE_BATCH_PRINTING=false
```

---

## Verificação Pós-Rollback

```bash
# 1. Verificar que o sistema está rodando
curl http://162.220.11.4:8000/health

# 2. Testar login
curl -X POST http://162.220.11.4:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"changeme"}'

# 3. Verificar que recibo volta a ter 1 via (se rollback aplicado)
curl -X GET http://162.220.11.4:8000/orders/{order_id}/receipt \
  -H "Authorization: Bearer {token}" --output test_receipt.pdf

# 4. Verificar que endpoint batch-receipts não existe mais
curl -X POST http://162.220.11.4:8000/orders/batch-receipts \
  -H "Authorization: Bearer {token}"
# Deve retornar 404 ou 405

# 5. Verificar que ADM não pode mais editar pedidos de outros usuários
# (tentar editar um pedido pendente de outro usuário como ADM deve falhar)
```

---

## Riscos e Mitigações

### Risco 1: Perda de Dados
**Impacto**: Baixo - As mudanças não alteram o schema do banco de dados  
**Mitigação**: Nenhuma migration foi criada. Rollback é seguro.

### Risco 2: Recibos Antigos
**Impacto**: Médio - Recibos gerados com 2 vias não podem ser "revertidos"  
**Mitigação**: Arquivos PDF já gerados permanecem como estão. Novos recibos após rollback terão apenas 1 via.

### Risco 3: Edições ADM em Pedidos
**Impacto**: Baixo - Edições já feitas por ADM em pedidos pendentes permanecem no banco  
**Mitigação**: Auditoria registra todas as edições. Após rollback, ADM não poderá mais editar pedidos de outros usuários.

### Risco 4: Usuários com Seleção em Aberto
**Impacto**: Muito Baixo - Estado de seleção está apenas no frontend (localStorage/state)  
**Mitigação**: Refresh da página limpa qualquer estado de seleção.

---

## Comandos de Emergência

### Parar Tudo (Emergência)

```bash
cd /root/app/cns-ccb/infra
docker-compose down
```

### Rollback Completo para Versão Estável

```bash
cd /root/app/cns-ccb
git checkout main  # ou branch estável anterior
cd infra
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Restaurar Backup do Banco (Se Necessário)

```bash
# Parar containers
cd /root/app/cns-ccb/infra
docker-compose down

# Restaurar dump anterior
docker-compose up -d db
sleep 10
docker exec -i infra-db-1 psql -U ccb -d ccb < /path/to/backup.sql

# Reiniciar todos os serviços
docker-compose up -d
```

---

## Logs e Monitoramento

```bash
# Ver logs do backend
cd /root/app/cns-ccb/infra
docker-compose logs -f api

# Ver logs do frontend
docker-compose logs -f web

# Ver logs de erro específicos
docker-compose logs api | grep -i error
docker-compose logs api | grep -i "batch-receipts"
```

---

## Contato e Suporte

Para dúvidas ou problemas relacionados a este rollback:
- **GitHub Issues**: https://github.com/alaorwcj/cns-ccb/issues
- **Documentação**: Ver `README_DEPLOY.md` e `MANUAL_POC.md`

**Última atualização**: 2025-10-26  
**Responsável**: Sistema CNS-CCB
