"""
Script para popular dados iniciais no sistema CNS
Execute: docker compose -f infra/docker-compose.yml exec api python -m app.seed_data
"""
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.church import Church
from app.models.product import Product
from decimal import Decimal


def seed_categories(db: Session):
    """Criar categorias iniciais"""
    categories_data = [
        "Utensílios de Cozinha",
        "Materiais de Limpeza",
        "Papelaria",
        "Alimentos Não Perecíveis",
        "Higiene Pessoal",
        "Manutenção",
        "Eletrônicos",
        "Diversos"
    ]
    
    for cat_name in categories_data:
        existing = db.query(Category).filter(Category.name == cat_name).first()
        if not existing:
            cat = Category(name=cat_name)
            db.add(cat)
    
    db.commit()
    print(f"✅ {len(categories_data)} categorias criadas/verificadas")


def seed_churches(db: Session):
    """Criar igrejas iniciais"""
    churches_data = [
        ("Igreja Central", "Santa Isabel"),
        ("Congregação Parque Esperança", "Santa Isabel"),
        ("Congregação Vila Rica", "Santa Isabel"),
        ("Congregação Jardim Paulista", "Santa Isabel"),
        ("Igreja Santo Antônio", "Arujá"),
        ("Congregação Vila Rosário", "Arujá"),
        ("Igreja São Paulo", "Guarulhos"),
        ("Congregação Centro", "Guarulhos"),
    ]
    
    for name, city in churches_data:
        existing = db.query(Church).filter(Church.name == name, Church.city == city).first()
        if not existing:
            church = Church(name=name, city=city)
            db.add(church)
    
    db.commit()
    print(f"✅ {len(churches_data)} igrejas criadas/verificadas")


def seed_products(db: Session):
    """Criar produtos iniciais"""
    # Buscar categorias
    cat_cozinha = db.query(Category).filter(Category.name == "Utensílios de Cozinha").first()
    cat_limpeza = db.query(Category).filter(Category.name == "Materiais de Limpeza").first()
    cat_papelaria = db.query(Category).filter(Category.name == "Papelaria").first()
    cat_alimentos = db.query(Category).filter(Category.name == "Alimentos Não Perecíveis").first()
    cat_higiene = db.query(Category).filter(Category.name == "Higiene Pessoal").first()
    
    products_data = [
        # Utensílios de Cozinha
        ("Prato Fundo Branco", cat_cozinha.id if cat_cozinha else None, "UN", Decimal("5.50"), 150, 20),
        ("Prato Raso Branco", cat_cozinha.id if cat_cozinha else None, "UN", Decimal("4.80"), 200, 25),
        ("Copo 200ml Descartável", cat_cozinha.id if cat_cozinha else None, "PCT", Decimal("12.00"), 50, 10),
        ("Talher Descartável (kit)", cat_cozinha.id if cat_cozinha else None, "PCT", Decimal("15.00"), 40, 8),
        ("Panela Alumínio 10L", cat_cozinha.id if cat_cozinha else None, "UN", Decimal("45.00"), 15, 3),
        
        # Materiais de Limpeza
        ("Detergente Neutro 500ml", cat_limpeza.id if cat_limpeza else None, "UN", Decimal("3.20"), 80, 15),
        ("Desinfetante 1L", cat_limpeza.id if cat_limpeza else None, "UN", Decimal("6.50"), 60, 12),
        ("Sabão em Pó 1kg", cat_limpeza.id if cat_limpeza else None, "CX", Decimal("8.90"), 45, 10),
        ("Vassoura de Nylon", cat_limpeza.id if cat_limpeza else None, "UN", Decimal("12.00"), 25, 5),
        ("Rodo 40cm", cat_limpeza.id if cat_limpeza else None, "UN", Decimal("15.00"), 20, 5),
        ("Pano de Chão", cat_limpeza.id if cat_limpeza else None, "UN", Decimal("4.50"), 50, 10),
        
        # Papelaria
        ("Papel A4 (resma 500 folhas)", cat_papelaria.id if cat_papelaria else None, "UN", Decimal("25.00"), 30, 5),
        ("Caneta Esferográfica Azul", cat_papelaria.id if cat_papelaria else None, "CX", Decimal("18.00"), 25, 5),
        ("Grampeador", cat_papelaria.id if cat_papelaria else None, "UN", Decimal("22.00"), 10, 2),
        ("Grampo 26/6 (caixa)", cat_papelaria.id if cat_papelaria else None, "CX", Decimal("5.00"), 20, 5),
        
        # Alimentos
        ("Café Torrado 500g", cat_alimentos.id if cat_alimentos else None, "PCT", Decimal("12.50"), 60, 10),
        ("Açúcar Cristal 1kg", cat_alimentos.id if cat_alimentos else None, "PCT", Decimal("4.20"), 80, 15),
        ("Biscoito Cream Cracker", cat_alimentos.id if cat_alimentos else None, "PCT", Decimal("3.50"), 100, 20),
        ("Óleo de Soja 900ml", cat_alimentos.id if cat_alimentos else None, "UN", Decimal("6.80"), 50, 10),
        
        # Higiene
        ("Papel Higiênico (fardo 12 rolos)", cat_higiene.id if cat_higiene else None, "FD", Decimal("28.00"), 35, 8),
        ("Sabonete Líquido 250ml", cat_higiene.id if cat_higiene else None, "UN", Decimal("8.50"), 40, 8),
        ("Toalha de Papel (pacote)", cat_higiene.id if cat_higiene else None, "PCT", Decimal("6.00"), 50, 10),
    ]
    
    for name, category_id, unit, price, stock, threshold in products_data:
        existing = db.query(Product).filter(Product.name == name).first()
        if not existing:
            product = Product(
                name=name,
                category_id=category_id,
                unit=unit,
                price=price,
                stock_qty=stock,
                low_stock_threshold=threshold,
                is_active=True
            )
            db.add(product)
    
    db.commit()
    print(f"✅ {len(products_data)} produtos criados/verificados")


def main():
    """Executar seed de dados"""
    db = SessionLocal()
    try:
        print("🌱 Iniciando seed de dados...")
        seed_categories(db)
        seed_churches(db)
        seed_products(db)
        print("✅ Seed concluído com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao executar seed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
