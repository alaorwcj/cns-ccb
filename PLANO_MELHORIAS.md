# PLANO DE IMPLEMENTAÇÃO - MELHORIAS SISTEMA CNS

Data: Dezembro 2025
Status: **PARA APROVAÇÃO** ⚠️

---

## 📋 RESUMO DAS FUNCIONALIDADES SOLICITADAS

### 1. FILTRO POR DATA (Pedidos)
- Adicionar filtros de data inicial/final na listagem de pedidos
- **Impacto**: Baixo | **Complexidade**: Pequena ⭐
- **Componentes**: Backend (query) + Frontend (UI filtros)

### 2. EDITAR APÓS APROVADO
- Permitir admin editar pedido aprovado (antes da entrega)
- **Impacto**: Médio | **Complexidade**: Média ⭐⭐
- **Componentes**: Backend (validação role) + Frontend (liberar edição)

### 3. IMPRIMIR APÓS APROVADO (antes de entregar)
- Permitir gerar recibo de pedido APROVADO (não só ENTREGUE)
- **Impacto**: Baixo | **Complexidade**: Pequena ⭐
- **Componentes**: Backend (remover validação status) + Frontend (mostrar botão)

### 4. DATA DE RETIRADA (MÊS SEGUINTE)
- Ao criar pedido, exibir automaticamente: "Entrega prevista: [MÊS+1]"
- **Impacto**: Baixo | **Complexidade**: Pequena ⭐
- **Componentes**: Frontend (cálculo + exibição)

### 5. DATA DE CORTE (DIA 20)
- Bloquear criação de pedido após dia 20 (exceto admin)
- **Impacto**: Médio | **Complexidade**: Média ⭐⭐
- **Componentes**: Backend (validação) + Frontend (mensagem bloqueio)

### 6. ANEXAR RECIBO ASSINADO
- Upload de foto/PDF do recibo assinado após entrega
- **Impacto**: Alto | **Complexidade**: Grande ⭐⭐⭐
- **Componentes**: Storage (S3/local) + Backend (upload) + DB (nova coluna) + Frontend (upload/visualização)

### 7. RECIBO 1 VIA (ao invés de 2)
- Remover duplicação de via no PDF
- **Impacto**: Baixo | **Complexidade**: Pequena ⭐
- **Componentes**: Backend (receipt.py)

### 8. ENTRADA MÚLTIPLA DE ESTOQUE
- Permitir entrada de vários produtos de uma vez + NF
- **Impacto**: Alto | **Complexidade**: Grande ⭐⭐⭐
- **Componentes**: DB (campo NF) + Backend (batch insert) + Frontend (formulário múltiplo)

### 9. ALTERAR PREÇO NA MOVIMENTAÇÃO
- Ao inserir estoque, permitir atualizar preço do produto
- **Impacto**: Médio | **Complexidade**: Média ⭐⭐
- **Componentes**: Backend (update produto) + Frontend (campo preço editável)

### 10. ABA INVENTÁRIO (NOVA)
- Sistema de contagem de estoque + ajuste automático
- **Impacto**: Alto | **Complexidade**: Grande ⭐⭐⭐⭐
- **Componentes**: DB (nova tabela) + Backend (CRUD inventário) + Frontend (nova página)

---

## 🎯 ANÁLISE TÉCNICA DETALHADA

### **CATEGORIA A - QUICK WINS** (1-3 dias cada)
Funcionalidades simples, alto valor, baixo risco

#### ✅ **#3 - Imprimir após aprovado**
- **Mudanças no código**:
  - Backend: `orders.py` - Remover `if order.status != "ENTREGUE"` da rota `/receipt`
  - Frontend: Mostrar botão "Imprimir" quando status = APROVADO
- **Migrations**: Não necessário
- **Riscos**: Nenhum
- **Tempo estimado**: 2 horas

#### ✅ **#7 - Recibo 1 via**
- **Mudanças no código**:
  - Backend: `services/receipt.py` - Remover chamadas `draw_receipt_page("COMPRADOR")`
  - Manter apenas via "ADMINISTRAÇÃO" ou renomear para via única
- **Migrations**: Não necessário
- **Riscos**: Nenhum
- **Tempo estimado**: 1 hora

#### ✅ **#1 - Filtro por data**
- **Mudanças no código**:
  - Backend: `services/orders.py` - Adicionar parâmetros `date_from`, `date_until` na listagem
  - Frontend: Adicionar DatePicker no componente de filtros
- **Migrations**: Não necessário (created_at já existe)
- **Riscos**: Performance em grandes volumes (adicionar índice se necessário)
- **Tempo estimado**: 4 horas

#### ✅ **#4 - Data de retirada (mês seguinte)**
- **Mudanças no código**:
  - Frontend: Ao criar pedido, calcular `new Date().getMonth() + 1` e exibir mensagem
  - Exemplo: "📅 Previsão de entrega: Janeiro/2026"
- **Migrations**: Não necessário
- **Riscos**: Nenhum
- **Tempo estimado**: 2 horas

---

### **CATEGORIA B - REGRAS DE NEGÓCIO** (3-5 dias cada)
Funcionalidades com lógica de permissões/validações

#### ⚠️ **#2 - Editar após aprovado**
- **Mudanças no código**:
  - Backend: `orders.py` - Permitir PUT se `status == APROVADO and user.role == ADMIN`
  - Recalcular estoque se itens mudarem (reverter saída anterior + aplicar nova)
  - Gerar auditoria da edição
  - Frontend: Liberar edição para admins em pedidos aprovados
- **Migrations**: Não necessário
- **Riscos**: 
  - ⚠️ Integridade do estoque (precisa reverter movimentação anterior)
  - ⚠️ Ordem já pode estar em processo de separação física
- **Recomendação**: Adicionar flag "pedido em separação" para bloquear edição
- **Tempo estimado**: 8 horas

#### ⚠️ **#5 - Data de corte (dia 20)**
- **Mudanças no código**:
  - Backend: `orders.py` - Validar `datetime.now().day > 20 and user.role != ADMIN` → HTTP 403
  - Frontend: Mostrar mensagem de bloqueio + desabilitar botão "Criar pedido"
- **Migrations**: Não necessário
- **Riscos**:
  - ⚠️ Timezone: garantir que usa horário de Brasília
  - ⚠️ Regra de dia 20: incluir 20 ou só a partir do 21?
- **Decisões necessárias**:
  - [ ] Dia 20 pode ou não pode?
  - [ ] Mensagem de bloqueio: "Período de pedidos encerrado. Aguarde até dia 1º do próximo mês"
- **Tempo estimado**: 6 horas

#### ⚠️ **#9 - Alterar preço na movimentação**
- **Mudanças no código**:
  - DB: Adicionar coluna `unit_price` em `stock_movements` (opcional, para histórico)
  - Backend: Ao criar movimento ENTRADA, permitir passar `new_price` → atualizar `products.price`
  - Frontend: Campo "Preço unitário" editável no form de entrada
- **Migrations**: 
  ```sql
  ALTER TABLE stock_movements ADD COLUMN unit_price NUMERIC(10,2);
  ```
- **Riscos**:
  - ⚠️ Pedidos em aberto com preço antigo (decidir: manter ou recalcular)
- **Decisões necessárias**:
  - [ ] Atualizar pedidos pendentes/aprovados com novo preço?
  - [ ] Ou deixar pedidos com preço congelado no momento da criação?
- **Tempo estimado**: 6 horas

---

### **CATEGORIA C - FEATURES COMPLEXAS** (1-2 semanas cada)
Alto impacto, muitas mudanças, múltiplos componentes

#### 🚧 **#8 - Entrada múltipla de estoque**
- **Mudanças no código**:
  - DB: Adicionar `invoice_number` (nota fiscal) e `invoice_date` em `stock_movements`
  - Backend: Nova rota `POST /stock/batch-entry` que recebe array de produtos
  - Frontend: Formulário com tabela dinâmica (adicionar/remover linhas)
- **Migrations**:
  ```sql
  ALTER TABLE stock_movements 
    ADD COLUMN invoice_number VARCHAR(50),
    ADD COLUMN invoice_date DATE;
  ```
- **Exemplo de payload**:
  ```json
  {
    "invoice_number": "NF-12345",
    "invoice_date": "2025-12-10",
    "items": [
      {"product_id": 1, "qty": 100, "unit_price": 5.50},
      {"product_id": 5, "qty": 50, "unit_price": 12.00}
    ]
  }
  ```
- **Riscos**:
  - ⚠️ Rollback parcial se um item falhar
  - ⚠️ Validação de NF duplicada (opcional)
- **Tempo estimado**: 12 horas

#### 🚧 **#6 - Anexar recibo assinado**
- **Mudanças no código**:
  - DB: Adicionar `signed_receipt_url` em `orders`
  - Backend: 
    - Rota `POST /orders/{id}/upload-receipt` (multipart/form-data)
    - Storage: salvar em `/uploads/receipts/{order_id}_{timestamp}.{ext}`
    - Rota `GET /orders/{id}/signed-receipt` para download
  - Frontend:
    - Botão "Anexar recibo" após entrega
    - Suporte para câmera (mobile) e upload de arquivo
    - Preview da imagem/PDF anexado
- **Migrations**:
  ```sql
  ALTER TABLE orders ADD COLUMN signed_receipt_url VARCHAR(500);
  ```
- **Riscos**:
  - ⚠️ Tamanho do arquivo (limitar 10MB)
  - ⚠️ Segurança: apenas admin pode fazer upload
  - ⚠️ Storage: usar filesystem local ou S3?
- **Decisões necessárias**:
  - [ ] Onde armazenar? Filesystem local (`/uploads`) ou cloud (AWS S3)?
  - [ ] Formato aceito: apenas imagens (JPG/PNG) ou PDF também?
  - [ ] Tamanho máximo: 10MB?
- **Tempo estimado**: 16 horas

#### 🚧 **#10 - Sistema de inventário**
- **Mudanças no código**:
  - DB: Nova tabela `inventory_counts`
    ```sql
    CREATE TABLE inventory_counts (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      created_by_id INT REFERENCES users(id),
      status VARCHAR(20), -- 'EM_ANDAMENTO', 'FINALIZADO'
      notes TEXT
    );
    CREATE TABLE inventory_items (
      id SERIAL PRIMARY KEY,
      inventory_id INT REFERENCES inventory_counts(id) CASCADE,
      product_id INT REFERENCES products(id),
      expected_qty INT,  -- Qty no sistema
      counted_qty INT,   -- Qty contada fisicamente
      difference INT,    -- counted - expected
      adjusted BOOLEAN DEFAULT FALSE
    );
    ```
  - Backend:
    - CRUD completo de inventário
    - Rota `POST /inventory/{id}/finalize` → gera movimentações de ajuste
  - Frontend:
    - Nova página "Inventário"
    - Listar produtos com campo para informar contagem
    - Mostrar divergências (falta/sobra)
    - Botão "Ajustar estoque" → cria movimentações
- **Riscos**:
  - ⚠️⚠️ Alto risco de erro no estoque se mal implementado
  - ⚠️ Concorrência: se alguém cria pedido durante contagem
  - ⚠️ Auditoria: registrar quem fez ajustes
- **Decisões necessárias**:
  - [ ] Bloquear pedidos durante inventário?
  - [ ] Permitir inventários parciais (só algumas categorias)?
  - [ ] Histórico de inventários anteriores?
- **Tempo estimado**: 24 horas (3 dias)

---

## 📅 PROPOSTA DE CRONOGRAMA

### **FASE 1 - Quick Wins** (1 semana)
Entregas rápidas, alto valor percebido
- ✅ #3 - Imprimir após aprovado (2h)
- ✅ #7 - Recibo 1 via (1h)
- ✅ #1 - Filtro por data (4h)
- ✅ #4 - Data de retirada (2h)
- **Total**: ~2 dias úteis

### **FASE 2 - Regras de Negócio** (2 semanas)
Validações e permissões
- ✅ #5 - Data de corte dia 20 (6h) - **IMPLEMENTADO**
- ✅ #9 - Alterar preço na movimentação (6h) - **TESTADO OK**
- ✅ #2 - Editar após aprovado (8h) - **IMPLEMENTADO**
- **Total**: ~3 dias úteis

### **FASE 3 - Features Complexas** (3-4 semanas)
Funcionalidades maiores
- ✅ #8 - Entrada múltipla estoque (12h / 2 dias) - **TESTADO OK**
- ✅ #6 - Anexar recibo (16h / 2 dias) - **TESTADO OK**
- ✅ #10 - Inventário (24h / 3 dias) - **TESTADO OK**
- **Total**: ~7 dias úteis

---

## ✅ DECISÕES APROVADAS

### Alta Prioridade
1. **#5 - Data de corte**: ✅ Pode criar até dia 20 (bloqueia a partir do dia 21)
2. **#6 - Storage de arquivos**: 📁 Local filesystem em `/uploads/receipts/`
3. **#6 - Formatos aceitos**: 📷 Imagens (JPG/PNG) e PDF (limite 10MB)
4. **#9 - Atualização de preço**: ✅ Atualiza pedidos PENDENTES e APROVADOS (não ENTREGUE)
5. **#10 - Inventário**: 🔒 Bloqueia criação de pedidos durante contagem

### Média Prioridade
6. **#2 - Edição aprovado**: ℹ️ Permitir edição sem status intermediário (por enquanto)
7. **#8 - NF duplicada**: ℹ️ Permitir duplicadas (mesmo número de NF)
8. **#10 - Inventário**: ℹ️ Inventário completo (todos produtos de uma vez)

---

## 🎯 RECOMENDAÇÃO

### Ordem Sugerida de Execução:

**SPRINT 1** (1 semana - Entregas rápidas)
1. #7 - Recibo 1 via
2. #3 - Imprimir após aprovado  
3. #4 - Data de retirada
4. #1 - Filtro por data

**SPRINT 2** (1 semana - Validações)
5. #5 - Data de corte dia 20
6. #9 - Alterar preço

**SPRINT 3** (1 semana - Edição)
7. #2 - Editar após aprovado

**SPRINT 4** (2 semanas - Features grandes)
8. #8 - Entrada múltipla
9. #6 - Anexar recibo

**SPRINT 5** (2 semanas - Sistema novo)
10. #10 - Inventário completo

---

## 📊 RESUMO DE ESFORÇO

| Categoria | Quantidade | Tempo Total |
|-----------|------------|-------------|
| Quick Wins (⭐) | 4 | ~2 dias |
| Médias (⭐⭐) | 3 | ~3 dias |
| Complexas (⭐⭐⭐) | 2 | ~4 dias |
| Muito Complexa (⭐⭐⭐⭐) | 1 | ~3 dias |
| **TOTAL** | **10 funcionalidades** | **~12 dias úteis** |

---

## ✅ PRÓXIMOS PASSOS

1. **REVISAR este documento** e responder decisões pendentes
2. **APROVAR a ordem** de implementação ou sugerir mudanças
3. **DECIDIR**: Fazer tudo de uma vez ou por fases?
4. **CONFIRMAR**: Posso começar pela Fase 1 (Quick Wins)?

---

**Aguardando aprovação para iniciar! 🚀**
