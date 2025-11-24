#!/bin/bash

# Script para iniciar todos os serviços do sistema

echo "═══════════════════════════════════════════════════════════"
echo "  Sistema de Lista de Compras - Microsserviços"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado"
    exit 1
fi

echo "✓ Node.js encontrado: $(node --version)"
echo ""

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não está instalado"
    exit 1
fi

echo "✓ npm encontrado: $(npm --version)"
echo ""

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências globais..."
    npm install
fi

# Verificar e instalar dependências dos serviços
for service in services/user-service services/item-service services/list-service api-gateway; do
    if [ ! -d "$service/node_modules" ]; then
        echo "📦 Instalando dependências de $service..."
        (cd "$service" && npm install)
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Iniciando serviços..."
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "⚠️  Este script não inicia os serviços automaticamente."
echo "Por favor, abra 5 terminais diferentes e execute:"
echo ""
echo "Terminal 1 (User Service):    cd services/user-service && npm start"
echo "Terminal 2 (Item Service):    cd services/item-service && npm start"
echo "Terminal 3 (List Service):    cd services/list-service && npm start"
echo "Terminal 4 (API Gateway):     cd api-gateway && npm start"
echo "Terminal 5 (Cliente Demo):    node client-demo.js"
echo ""
echo "═══════════════════════════════════════════════════════════"
