# Rollback Plan - Orders Features (Recibo 2 Vias, Edição ADM, Impressão em Lote)

**Data**: 2025-10-26  
**Branch**: deploy/fix-orders-ui  
**Versão**: 1.4.0  
**Última atualização**: 2025-10-26 (redesign do PDF do recibo)

## Resumo das Mudanças

Seis funcionalidades foram adicionadas/modificadas no módulo de Pedidos (/orders):

1. **Recibo em 2 Vias**: Cada recibo PDF agora gera duas páginas (VIA ADMINISTRAÇÃO e VIA COMPRADOR)
2. **Edição ADM de Pedidos Pendentes**: Administradores podem editar qualquer pedido com status PENDENTE
3. **Impressão em Lote**: Interface para selecionar múltiplos pedidos entregues e imprimir seus recibos em um único PDF consolidado
4. **Edição Colaborativa (v1.2.0)**: Usuários comuns podem editar qualquer pedido pendente de suas igrejas atribuídas (não apenas os próprios)
5. **Criação Livre de Pedidos (v1.3.0)**: Removida lógica de auto-load de pedido pendente na tela de criação - usuários com múltiplas igrejas podem escolher livremente para qual igreja criar pedido
6. **Design Moderno do Recibo (NOVO v1.4.0)**: PDF redesenhado com layout profissional inspirado em "Delivery Note" - cabeçalho azul, tabela estruturada, termos e condições

### Correções Aplicadas (v1.1.1)
- **Fix batch-receipts endpoint**: Corrigido para aceitar JSON body com schema Pydantic (`{order_ids: [...]}`), resolvendo erro CORS e parsing
- Adicionado `BatchReceiptsRequest` schema em `order.py`
- Frontend atualizado para enviar body no formato correto
- **Fix selectinload**: Corrigido syntax para carregar products com `OrderItem.product`

### Nova Funcionalidade (v1.2.0)
- **Edição Colaborativa**: Removida restrição de "apenas o requester pode editar"
- Agora qualquer membro da igreja pode editar pedidos pendentes dessa igreja
- Promove trabalho colaborativo entre membros da mesma congregação

### Refatoração (v1.3.0)
- **Criação Livre de Pedidos**: Removida lógica de auto-load de pedido pendente em `OrderCreate.tsx`
- **Problema resolvido**: Usuários com múltiplas igrejas ficavam "presos" na primeira igreja ao criar pedidos
- **Novo comportamento**: 
  - Tela "Criar Pedido" sempre cria novo pedido (nunca atualiza)
  - Usuário escolhe livremente qual igreja quer ao criar
  - Edição de pendentes feita exclusivamente via botão "Editar" na lista
- **Código removido**: Estado `existingOrder`, busca de pedidos pendentes, função `decodeUserIdFromJWT`

### Design Moderno (v1.4.0)
- **Redesign do PDF**: Layout profissional inspirado em modelo "Delivery Note"
- **Elementos novos**:
  - Cabeçalho azul (#1E88E5) com logo CCB e título "Nota de Entrega"
  - Seção "Entregar para" com dados do solicitante e igreja
  - Tabela estruturada com cores alternadas (#F5F5F5) e cabeçalho azul claro (#B3E5FC)
  - Colunas: Item, Descrição, Quantidade, Preço Unitário
  - Seção de assinaturas dupla (responsável + data)
  - Rodapé com "Termos e Condições" profissional
- **Aplicado em**: `generate_order_receipt_pdf()` e `generate_batch_receipts_pdf()`

---

## Arquivos Modificados

### Backend

1. **`backend/app/services/receipt.py`** (v1.4.0)
   - Modificado: `generate_order_receipt_pdf()` - layout moderno com cabeçalho azul, tabela estruturada, termos
   - Modificado: `generate_batch_receipts_pdf()` - mesmo layout moderno aplicado
   - Adicionado: Import `colors` do reportlab para cores hexadecimais
   - Mantido: Geração de 2 vias (ADM e COMPRADOR) por pedido

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

4. **`frontend/app/src/routes/orders/OrderCreate.tsx`** (v1.3.0)
   - Removido: Estado `existingOrder` e `userId`
   - Removido: Função `decodeUserIdFromJWT`
   - Removido: Busca automática de pedidos pendentes no `useEffect`
   - Removido: Lógica condicional de UPDATE vs CREATE no `submit()`
   - Removido: Banner "Editando Pedido Pendente" na UI
   - Simplificado: Botão sempre mostra "Confirmar Pedido" (sem condicional)
   - Resultado: Tela sempre cria novo pedido, nunca atualiza existente

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

### 5. Criação Livre de Pedidos (v1.3.0)

```bash
# Cenário 1: Usuário com múltiplas igrejas cria pedido
# 1. Faça login como usuário com 2+ igrejas (ex: João - Central e Vila Paula)
# 2. Vá para /orders e clique em "Novo Pedido"
# 3. Verifique que campo "Selecione a igreja" está VAZIO (não pré-selecionado)
# 4. Escolha "Igreja Central" no dropdown
# 5. Adicione itens e confirme pedido
# 6. Volte para /orders e clique em "Novo Pedido" novamente
# 7. Agora escolha "Vila Paula" no dropdown
# 8. Verifique que consegue criar pedido para igreja diferente
# 9. Resultado: Dois pedidos criados, cada um para igreja diferente

# Cenário 2: Edição de pedido pendente via lista (não via "Criar Pedido")
# 1. Como João, vá para /orders
# 2. Localize um pedido PENDENTE da Igreja Central
# 3. Clique em "Editar" (botão ao lado do pedido)
# 4. Altere itens e salve
# 5. Verifique que NÃO é redirecionado para "Criar Pedido", mas sim usa modal/página de edição
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

**Para reverter Design Moderno (v1.4.0 → v1.3.0) - Voltar ao layout simples**:

```python
# Remover import de colors:
# from reportlab.lib import colors

def generate_order_receipt_pdf(db: Session, order: Order) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    def draw_receipt_page(via_label: str):
        y = height - 50
        # Logo simples
        logo_path = '/app/ccb.png'
        if os.path.exists(logo_path):
            try:
                img = ImageReader(logo_path)
                c.drawImage(img, 40, y - 40, width=80, preserveAspectRatio=True, mask='auto')
            except Exception:
                pass
        
        # Título simples
        c.setFont("Helvetica-Bold", 14)
        c.drawString(140, y, "Comprovante de Recebimento")
        y -= 20
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(140, y, f"VIA: {via_label}")
        y -= 20

        # Informações básicas (sem boxes, sem cores)
        c.setFont("Helvetica", 10)
        c.drawString(40, y, f"Pedido: #{order.id}")
        y -= 15
        church_name = order.church.name if getattr(order, 'church', None) and order.church.name else f"Igreja #{order.church_id}"
        c.drawString(40, y, f"Igreja: {church_name}")
        y -= 15
        requester_name = order.requester.name if getattr(order, 'requester', None) and order.requester.name else f"Usuario #{order.requester_id}"
        c.drawString(40, y, f"Solicitante: {requester_name}")
        y -= 15
        c.drawString(40, y, f"Status: {order.status.value}")
        y -= 15
        if order.delivered_at:
            try:
                delivered_str = order.delivered_at.strftime('%d/%m/%Y %H:%M')
            except Exception:
                delivered_str = str(order.delivered_at)
            c.drawString(40, y, f"Entregue em: {delivered_str}")
            y -= 20

        # Lista de itens simples (sem tabela)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y, "Itens")
        y -= 15

        c.setFont("Helvetica", 10)
        total = Decimal("0")
        for it in order.items:
            prod = getattr(it, 'product', None) or db.get(Product, it.product_id)
            name = prod.name if prod else f"Produto #{it.product_id}"
            line = f"- {name}  x{it.qty}  @ R${it.unit_price}  = R${it.subtotal}"
            c.drawString(50, y, line)
            y -= 14
            total += it.subtotal
            if y < 140:
                c.showPage()
                y = height - 50

        y -= 10
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y, f"Total: R${total}")

        # Assinatura simples
        y -= 50
        c.setFont("Helvetica", 10)
        c.drawString(40, y, "Assinatura do responsável:")
        c.line(40, y - 12, 300, y - 12)
        if getattr(order, 'signed_by', None) and getattr(order, 'signed_at', None):
            try:
                signed_name = order.signed_by.name
                signed_at = order.signed_at.strftime('%d/%m/%Y %H:%M')
                c.drawString(40, y - 28, f"Assinado por: {signed_name} em {signed_at}")
            except Exception:
                c.drawString(40, y - 28, "Assinado")
        else:
            c.drawString(40, y - 28, "Assinado por: _______________________________")

    draw_receipt_page("ADMINISTRAÇÃO")
    c.showPage()
    draw_receipt_page("COMPRADOR")
    c.showPage()
    
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
```

**Para reverter para versão ORIGINAL (antes de todas features - 1 via apenas)**:

```python
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

#### Frontend: `frontend/app/src/routes/orders/OrderCreate.tsx`

**Para reverter Criação Livre (v1.3.0 → v1.2.0)**:

```tsx
// 1. RESTAURAR função decodeUserIdFromJWT:
function decodeUserIdFromJWT(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload?.user_id || null
  } catch {
    return null
  }
}

// 2. RESTAURAR estados:
const [existingOrder, setExistingOrder] = useState<any | null>(null)
const userId = decodeUserIdFromJWT(localStorage.getItem('access_token') || '')

// 3. RESTAURAR busca de pedidos pendentes no useEffect:
useEffect(() => {
  (async () => {
    try {
      const [cats, prods, chs, ordersRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products?limit=100'),
        (async () => {
          const role = decodeRoleFromJWT(localStorage.getItem('access_token') || '')
          if (role === 'ADM') return api.get('/churches')
          return api.get('/churches/mine')
        })(),
        api.get('/orders?page=1&limit=50'), // Buscar pedidos
      ])
      setCategories(cats.data)
      setProducts(prods.data.data || [])
      const fetchedChurches = chs.data?.data ?? chs.data
      setChurches(fetchedChurches || [])

      // Buscar pedido pendente do usuário
      const userOrders = ordersRes.data.data || []
      const pendingOrder = userOrders.find((o: any) => o.status === 'PENDENTE' && o.requester_id === userId)

      if (pendingOrder) {
        setExistingOrder(pendingOrder)
        setChurchId(pendingOrder.church_id)
        const initialItems: Record<number, number> = {}
        pendingOrder.items.forEach((it: any) => {
          initialItems[it.product_id] = it.qty
        })
        setItems(initialItems)
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  })()
}, [userId])

// 4. RESTAURAR lógica condicional no submit:
const submit = async () => {
  setError(null)
  try {
    const chosen = Object.entries(items)
      .map(([pid, qty]) => ({ product_id: Number(pid), qty: Number(qty) }))
      .filter((it) => it.qty > 0)
    if (!churchId) throw new Error('Selecione a igreja')
    if (role !== 'ADM') {
      const allowedIds = (churches || []).map((c: any) => c.id)
      if (!allowedIds.includes(Number(churchId))) {
        throw new Error('Igreja inválida para o seu usuário')
      }
    }
    if (chosen.length === 0) throw new Error('Selecione ao menos 1 item')

    if (existingOrder) {
      // Atualizar pedido existente
      await api.put(`/orders/${existingOrder.id}`, { church_id: churchId, items: chosen })
      alert('Pedido atualizado')
    } else {
      // Criar novo pedido
      await api.post('/orders', { church_id: churchId, items: chosen })
      alert('Pedido criado')
    }
    navigate('/orders')
  } catch (e: any) {
    setError(e?.response?.data?.detail || e?.message || 'Falha ao salvar pedido')
  }
}

// 5. RESTAURAR banner na UI:
return (
  <div className="grid gap-4">
    {error && <div className="text-red-600">{error}</div>}
    {existingOrder && (
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <div className="text-blue-800 font-medium">Editando Pedido Pendente</div>
        <div className="text-blue-600 text-sm">Pedido #{existingOrder.id} - Criado em {new Date(existingOrder.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
    )}
    <div className="flex gap-2 items-center">
      {/* ... selects ... */}
      <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={submit}>
        {existingOrder ? 'Atualizar Pedido' : 'Confirmar Pedido'}
      </button>
    </div>
    {/* ... produtos ... */}
  </div>
)
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
