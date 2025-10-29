#!/bin/bash
# Script de gerenciamento do projeto CNS-CCB
# Uso: ./manage.sh [comando]

set -e

COMPOSE_FILE="/root/app/cns-ccb/infra/docker-compose.yml"
INFRA_DIR="/root/app/cns-ccb/infra"

cd "$INFRA_DIR"

case "$1" in
  start|up)
    echo "🚀 Iniciando containers..."
    docker compose up -d
    echo "✅ Containers iniciados!"
    docker compose ps
    ;;
    
  stop|down)
    echo "🛑 Parando containers..."
    docker compose down
    echo "✅ Containers parados!"
    ;;
    
  restart)
    echo "🔄 Reiniciando containers..."
    if [ -n "$2" ]; then
      docker compose restart "$2"
      echo "✅ Container $2 reiniciado!"
    else
      docker compose restart
      echo "✅ Todos os containers reiniciados!"
    fi
    docker compose ps
    ;;
    
  status|ps)
    echo "📊 Status dos containers:"
    docker compose ps
    ;;
    
  logs)
    if [ -n "$2" ]; then
      docker compose logs -f "$2"
    else
      docker compose logs -f
    fi
    ;;
    
  build)
    echo "🔨 Reconstruindo containers..."
    if [ "$2" == "--no-cache" ]; then
      docker compose build --no-cache
    else
      docker compose build
    fi
    echo "✅ Build concluído!"
    ;;
    
  rebuild)
    echo "🔨 Rebuild completo (build + restart)..."
    if [ "$2" == "--no-cache" ]; then
      docker compose build --no-cache
    else
      docker compose build
    fi
    docker compose up -d
    echo "✅ Rebuild concluído!"
    docker compose ps
    ;;
    
  health|check)
    echo "🏥 Verificando saúde da aplicação..."
    echo ""
    echo "Status dos containers:"
    docker compose ps
    echo ""
    echo "Testando API (health endpoint):"
    curl -s https://cns.admsiga.org.br/api/health || echo "❌ API não respondeu"
    echo ""
    echo "Testando Frontend:"
    curl -sI https://cns.admsiga.org.br/ | head -3 || echo "❌ Frontend não respondeu"
    ;;
    
  test)
    echo "🧪 Executando testes..."
    docker compose run --rm api-test
    ;;
    
  shell)
    if [ -z "$2" ]; then
      echo "❌ Especifique o container: api, web"
      exit 1
    fi
    docker exec -it "cns-$2" sh
    ;;
    
  update|deploy)
    echo "📦 Atualizando aplicação..."
    cd /root/app/cns-ccb
    
    echo "1️⃣ Git pull..."
    git pull origin main
    
    echo "2️⃣ Rebuild containers..."
    cd infra
    docker compose build
    
    echo "3️⃣ Reiniciando serviços..."
    docker compose up -d
    
    echo "4️⃣ Verificando saúde..."
    sleep 5
    docker compose ps
    curl -s https://cns.admsiga.org.br/api/health
    
    echo ""
    echo "✅ Deploy concluído!"
    ;;
    
  backup-db)
    echo "💾 Fazendo backup do banco de dados..."
    BACKUP_FILE="/root/app/cns-ccb/infra/backups/ccb_$(date +%Y%m%d_%H%M%S).dump"
    sudo -u postgres pg_dump -p 5433 ccb > "$BACKUP_FILE"
    echo "✅ Backup salvo em: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE"
    ;;
    
  clean)
    echo "🧹 Limpando containers órfãos e recursos não utilizados..."
    docker compose down --remove-orphans
    docker system prune -f
    echo "✅ Limpeza concluída!"
    ;;
    
  *)
    echo "🔧 Gerenciador do Projeto CNS-CCB"
    echo ""
    echo "Uso: $0 [comando] [opções]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  start, up          - Inicia todos os containers"
    echo "  stop, down         - Para todos os containers"
    echo "  restart [service]  - Reinicia containers (ou um específico)"
    echo "  status, ps         - Mostra status dos containers"
    echo "  logs [service]     - Mostra logs (em tempo real)"
    echo "  build              - Reconstrói as imagens"
    echo "  rebuild            - Build + restart completo"
    echo "  health, check      - Verifica saúde da aplicação"
    echo "  test               - Executa testes"
    echo "  shell <service>    - Abre shell em um container (api|web)"
    echo "  update, deploy     - Atualiza código e faz deploy"
    echo "  backup-db          - Faz backup do PostgreSQL"
    echo "  clean              - Remove containers órfãos e limpa sistema"
    echo ""
    echo "Exemplos:"
    echo "  $0 start           # Inicia tudo"
    echo "  $0 restart api     # Reinicia apenas a API"
    echo "  $0 logs api        # Logs da API em tempo real"
    echo "  $0 shell api       # Shell dentro do container da API"
    echo "  $0 health          # Verifica se tudo está OK"
    echo ""
    exit 1
    ;;
esac
