-- Script para limpar dados de teste
-- Mantém: usuários e igrejas
-- Remove: pedidos, produtos, categorias, movimentações de estoque, logs de auditoria

BEGIN;

-- Deletar movimentações de estoque (antes dos pedidos por causa da FK)
DELETE FROM stock_movements;

-- Deletar pedidos (cascade vai deletar order_items automaticamente)
DELETE FROM orders;

-- Deletar produtos
DELETE FROM products;

-- Deletar categorias
DELETE FROM categories;

-- Limpar logs de auditoria (opcional - descomente se quiser limpar)
-- DELETE FROM audit_log;

-- Resetar sequences para começar do ID 1 novamente
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_movements_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;

COMMIT;

-- Verificar dados restantes
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Churches:', COUNT(*) FROM churches
UNION ALL
SELECT 'Categories:', COUNT(*) FROM categories
UNION ALL
SELECT 'Products:', COUNT(*) FROM products
UNION ALL
SELECT 'Orders:', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items:', COUNT(*) FROM order_items
UNION ALL
SELECT 'Stock Movements:', COUNT(*) FROM stock_movements;
