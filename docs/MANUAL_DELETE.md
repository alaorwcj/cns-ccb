# Manual de Limpeza de Dados

## Como deletar pedidos específicos

### Deletar pedidos por IDs específicos

```bash
# Substitua 1,2,3,4 pelos IDs que deseja deletar
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
BEGIN;
DELETE FROM stock_movements WHERE related_order_id IN (1, 2, 3, 4);
DELETE FROM orders WHERE id IN (1, 2, 3, 4);
COMMIT;
SELECT 'Remaining orders:' as info, COUNT(*) as count FROM orders;
"
```

### Deletar TODOS os pedidos (mantém produtos, categorias, igrejas)

```bash
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
BEGIN;
DELETE FROM stock_movements;
DELETE FROM orders;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_movements_id_seq RESTART WITH 1;
COMMIT;
"
```

## Como deletar produtos

### Deletar produto específico por ID

```bash
# Substitua 17 pelo ID do produto
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
DELETE FROM stock_movements WHERE product_id = 17;
DELETE FROM products WHERE id = 17;
"
```

### Deletar TODOS os produtos

```bash
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
BEGIN;
DELETE FROM stock_movements;
DELETE FROM orders;  -- Necessário porque order_items referenciam produtos
DELETE FROM products;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
COMMIT;
"
```

## Como deletar categorias

### Deletar categoria específica

```bash
# Substitua 5 pelo ID da categoria
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
DELETE FROM categories WHERE id = 5;
"
```

⚠️ **ATENÇÃO:** Não é possível deletar categoria que tem produtos vinculados. Delete os produtos primeiro.

## Limpeza completa (reset total - CUIDADO!)

### Deletar TUDO exceto usuários e igrejas

```bash
cd /root/app/cns-ccb/backend
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -f clear_test_data.sql
```

Ou via comando direto:

```bash
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
BEGIN;
DELETE FROM stock_movements;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM categories;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_movements_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
COMMIT;
"
```

## Verificar dados atuais

```bash
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Churches', COUNT(*) FROM churches
UNION ALL SELECT 'Categories', COUNT(*) FROM categories
UNION ALL SELECT 'Products', COUNT(*) FROM products
UNION ALL SELECT 'Orders', COUNT(*) FROM orders
UNION ALL SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL SELECT 'Stock Movements', COUNT(*) FROM stock_movements;
"
```

## Listar IDs antes de deletar

### Ver todos os pedidos

```bash
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
SELECT id, status, created_at, 
       (SELECT name FROM churches WHERE id = orders.church_id) as church
FROM orders 
ORDER BY id;
"
```

### Ver todos os produtos

```bash
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb -c "
SELECT id, name, 
       (SELECT name FROM categories WHERE id = products.category_id) as category,
       stock_qty, price
FROM products 
ORDER BY id;
"
```

## Dicas importantes

1. **Sempre verifique os IDs antes de deletar** - Use os comandos de listagem acima
2. **Use BEGIN/COMMIT** - Para poder fazer ROLLBACK se errar
3. **Delete na ordem correta**:
   - Primeiro: stock_movements
   - Depois: orders (cascade deleta order_items)
   - Por último: products ou categories
4. **Backup antes de operações grandes**: 
   ```bash
   pg_dump -h 127.0.0.1 -p 5433 -U ccb ccb > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

## Caso de emergência: Restaurar backup

```bash
# Fazer backup primeiro
pg_dump -h 127.0.0.1 -p 5433 -U ccb ccb > backup_emergency.sql

# Restaurar de um backup
PGPASSWORD='Apx7G05Le2n6TM4kN06G7VMPP' psql -h 127.0.0.1 -p 5433 -U ccb -d ccb < backup_YYYYMMDD_HHMMSS.sql
```
