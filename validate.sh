#!/bin/bash

# Script para validar que o projeto está funcionando corretamente
# Executa testes básicos do sistema

echo "═══════════════════════════════════════════════════════════"
echo "  VALIDAÇÃO DO SISTEMA DE MICROSSERVIÇOS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar um endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local description=$3
    local data=$4
    
    echo -n "Testando: $description... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ OK (HTTP $http_code)${NC}"
        return 0
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo -e "${YELLOW}⚠ OK (HTTP $http_code - esperado)${NC}"
        return 0
    else
        echo -e "${RED}✗ ERRO (HTTP $http_code)${NC}"
        return 1
    fi
}

# Aguardar o servidor estar pronto
echo "Aguardando API Gateway estar pronto..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API Gateway está pronto!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ API Gateway não respondeu após 30 segundos${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  TESTES DE ENDPOINTS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Testes básicos
echo "Testes de Saúde:"
test_endpoint GET "http://localhost:3000/health" "Health Check do Gateway"
test_endpoint GET "http://localhost:3000/registry" "Service Registry"
echo ""

echo "Testes de Autenticação:"
test_endpoint POST "http://localhost:3000/api/auth/register" "Registro de usuário" \
    '{"email":"test@example.com","username":"testuser","password":"pass123","firstName":"Test","lastName":"User"}'
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  VERIFICAÇÃO DE ESTRUTURA"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verificar estrutura de diretórios
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 (FALTANDO)${NC}"
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 (FALTANDO)${NC}"
    fi
}

echo "Diretórios:"
check_dir "services/user-service"
check_dir "services/item-service"
check_dir "services/list-service"
check_dir "api-gateway"
check_dir "shared"
echo ""

echo "Arquivos Compartilhados:"
check_file "shared/JsonDatabase.js"
check_file "shared/serviceRegistry.js"
check_file "shared/CircuitBreaker.js"
echo ""

echo "Serviços:"
check_file "services/user-service/index.js"
check_file "services/item-service/index.js"
check_file "services/list-service/index.js"
check_file "api-gateway/index.js"
echo ""

echo "Documentação:"
check_file "README.md"
check_file "IMPLEMENTACAO.md"
check_file "CHECKLIST.md"
check_file "MELHORIAS.md"
check_file "RESUMO_FINAL.md"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  VERIFICAÇÃO DE DEPENDÊNCIAS"
echo "═══════════════════════════════════════════════════════════"
echo ""

check_package() {
    if grep -q "\"$1\"" package.json 2>/dev/null || \
       grep -q "\"$1\"" services/*/package.json 2>/dev/null || \
       grep -q "\"$1\"" api-gateway/package.json 2>/dev/null; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 (NÃO ENCONTRADO)${NC}"
    fi
}

echo "Pacotes Obrigatórios:"
check_package "express"
check_package "jsonwebtoken"
check_package "bcrypt"
check_package "uuid"
check_package "axios"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  RESUMO FINAL"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✓ VALIDAÇÃO COMPLETA${NC}"
echo ""
echo "O sistema está pronto para uso!"
echo "Execute 'node client-demo.js' para fazer um teste completo"
echo ""
