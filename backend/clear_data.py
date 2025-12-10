#!/usr/bin/env python3
"""
Script para limpar dados de teste do sistema.
Remove: pedidos, produtos, categorias, igrejas, movimentações de estoque
Mantém: usuários (especialmente o admin)
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Pega DATABASE_URL do ambiente ou usa padrão
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://ccb:Apx7G05Le2n6TM4kN06G7VMPP@host.docker.internal:5433/ccb"
)

def clear_test_data():
    """Limpa todos os dados de teste mantendo usuários"""
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🗑️  Iniciando limpeza de dados de teste...")
        
        # Ordem importante: deletar filhos antes dos pais
        tables_to_clear = [
            ("order_items", "itens de pedidos"),
            ("orders", "pedidos"),
            ("stock_movements", "movimentações de estoque"),
            ("products", "produtos"),
            ("categories", "categorias"),
            ("churches", "igrejas"),
            ("audit_logs", "logs de auditoria"),
        ]
        
        for table_name, description in tables_to_clear:
            result = session.execute(text(f"DELETE FROM {table_name}"))
            count = result.rowcount
            session.commit()
            print(f"   ✓ {count} {description} removidos")
        
        # Reset sequences para começar do 1 novamente
        print("\n🔄 Resetando sequências...")
        sequences = [
            "orders_id_seq",
            "order_items_id_seq",
            "products_id_seq",
            "categories_id_seq",
            "churches_id_seq",
            "stock_movements_id_seq",
            "audit_logs_id_seq",
        ]
        
        for seq in sequences:
            try:
                session.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1"))
                session.commit()
                print(f"   ✓ Sequência {seq} resetada")
            except Exception as e:
                print(f"   ⚠ Sequência {seq} não encontrada ou erro: {e}")
        
        print("\n✅ Limpeza concluída com sucesso!")
        print("💡 Usuários foram mantidos (incluindo admin)")
        print("🚀 Sistema pronto para dados de produção!")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Erro durante limpeza: {e}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    confirm = input("⚠️  Isso vai DELETAR todos os dados de teste (pedidos, produtos, categorias, igrejas).\n"
                   "   Usuários serão mantidos.\n"
                   "   Tem certeza? Digite 'SIM' para confirmar: ")
    
    if confirm.strip().upper() == "SIM":
        clear_test_data()
    else:
        print("❌ Operação cancelada.")
        sys.exit(0)
