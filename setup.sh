#!/bin/bash

# CNS-CCB Setup Script
# Este script configura o ambiente completo em uma nova máquina

set -e

echo "🚀 Iniciando setup do CNS-CCB..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Instale o Docker primeiro."
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Instale o Docker Compose primeiro."
    exit 1
fi

echo "✅ Docker e Docker Compose verificados"

# Copiar dump para backend se não existir
if [ ! -f "backend/dump_ccb.backup" ]; then
    echo "📋 Copiando dump do banco para backend..."
    cp dump_ccb.backup backend/
fi

# Entrar no diretório infra
cd infra

echo "🐳 Iniciando containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

echo "⏳ Aguardando inicialização completa (isso pode levar alguns minutos)..."
sleep 30

# Verificar se a API está saudável
echo "🏥 Verificando saúde da API..."
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo "✅ API está saudável!"
        break
    fi

    echo "⏳ Tentativa $attempt/$max_attempts - Aguardando API..."
    sleep 10
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ API não ficou saudável após $max_attempts tentativas"
    echo "📋 Verificando logs..."
    if command -v docker-compose &> /dev/null; then
        docker-compose logs api
    else
        docker compose logs api
    fi
    exit 1
fi

# Testar login
echo "🔐 Testando login..."
login_response=$(curl -s -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin@example.com","password":"changeme"}')

if echo "$login_response" | grep -q "access"; then
    echo "✅ Login funcionando!"
else
    echo "❌ Problema no login"
    echo "Resposta: $login_response"
fi

# Verificar frontend
echo "🌐 Verificando frontend..."
if curl -s -I http://localhost:5173 | grep -q "200 OK"; then
    echo "✅ Frontend acessível!"
else
    echo "❌ Problema no frontend"
fi

echo ""
echo "🎉 Setup concluído com sucesso!"
echo ""
echo "📋 Acesse:"
echo "   • Frontend: http://localhost:5173"
echo "   • API: http://localhost:8000"
echo "   • API Docs: http://localhost:8000/docs"
echo ""
echo "👤 Credenciais:"
echo "   • Email: admin@example.com"
echo "   • Senha: changeme"
echo ""
echo "🛑 Para parar: cd infra && docker-compose down"
echo "🔄 Para reiniciar: cd infra && docker-compose restart"