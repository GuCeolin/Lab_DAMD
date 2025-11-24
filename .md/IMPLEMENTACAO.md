# Sistema de Gerenciamento de Lista de Compras - Arquitetura de Microsserviços

Sistema distribuído para gerenciamento de listas de compras utilizando arquitetura de microsserviços com API Gateway, Service Discovery e bancos NoSQL independentes.

## 📋 Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Client Demo                           │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│         API Gateway (porta 3000)                         │
│  - Roteamento de requisições                            │
│  - Circuit Breaker (3 falhas = abrir)                   │
│  - Health Checks a cada 30s                             │
│  - Logs de requisições                                   │
│  - Autenticação JWT                                      │
└──┬─────────────────┬──────────────────┬─────────────────┘
   │                 │                  │
┌──▼──────┐  ┌──────▼──────┐  ┌────────▼──────┐
│ User    │  │ Item        │  │ List          │
│ Service │  │ Service     │  │ Service       │
│ :3001   │  │ :3003       │  │ :3002         │
└────┬────┘  └──────┬──────┘  └────────┬──────┘
     │              │                  │
┌────▼────┐  ┌──────▼──────┐  ┌────────▼──────┐
│users.json│  │items.json   │  │lists.json     │
└─────────┘  └─────────────┘  └───────────────┘

┌──────────────────────────────────────────────────────────┐
│  Service Registry (service-registry.json)                │
│  Descoberta dinâmica de serviços                        │
└──────────────────────────────────────────────────────────┘
```

## 🚀 Tecnologias

- **Node.js + Express** - Framework web
- **JWT** - Autenticação
- **bcrypt** - Hash de senhas
- **JSON File Storage** - Banco NoSQL baseado em arquivos
- **Axios** - HTTP client
- **Circuit Breaker** - Padrão de resiliência

## 📦 Instalação

```bash
# Clonar o repositório
git clone <repo-url>
cd lista-compras-microservices

# Instalar dependências de todos os serviços
npm run install:all
```

## ▶️ Execução

Abra **5 terminais diferentes** e execute os comandos em ordem:

### Terminal 1 - User Service
```bash
cd services/user-service
npm start
```

### Terminal 2 - Item Service
```bash
cd services/item-service
npm start
```

### Terminal 3 - List Service
```bash
cd services/list-service
npm start
```

### Terminal 4 - API Gateway
```bash
cd api-gateway
npm start
```

### Terminal 5 - Cliente de Teste
```bash
node client-demo.js
```

## 🔧 Funcionalidades Implementadas

### ✅ User Service (Porta 3001)
- `POST /auth/register` - Cadastro de usuário
- `POST /auth/login` - Login com JWT
- `GET /users/:id` - Buscar dados do usuário
- `PUT /users/:id` - Atualizar perfil
- `GET /health` - Status do serviço

### ✅ Item Service (Porta 3003)
- `GET /items` - Listar itens (com filtros de categoria e nome)
- `GET /items/:id` - Buscar item específico
- `POST /items` - Criar novo item (requer autenticação)
- `PUT /items/:id` - Atualizar item
- `GET /categories` - Listar categorias disponíveis
- `GET /search?q=termo` - Buscar itens por nome
- `GET /health` - Status do serviço
- **20 itens pré-carregados** em 5 categorias

### ✅ List Service (Porta 3002)
- `POST /lists` - Criar nova lista
- `GET /lists` - Listar listas do usuário
- `GET /lists/:id` - Buscar lista específica
- `PUT /lists/:id` - Atualizar lista
- `DELETE /lists/:id` - Deletar lista
- `POST /lists/:id/items` - Adicionar item à lista
- `PUT /lists/:id/items/:itemId` - Atualizar item na lista
- `DELETE /lists/:id/items/:itemId` - Remover item da lista
- `GET /lists/:id/summary` - Resumo da lista
- `GET /health` - Status do serviço

### ✅ API Gateway (Porta 3000)
- `GET /api/dashboard` - Dashboard agregado do usuário
- `GET /api/search?q=termo` - Busca global
- `GET /health` - Status de todos os serviços + Circuit Breakers
- `GET /registry` - Lista de serviços registrados
- Roteamento automático para todos os serviços
- **Circuit Breaker** com limite de 3 falhas
- **Health Checks automáticos** a cada 30 segundos
- **Logs detalhados** de todas as requisições

## 📊 Exemplo de Fluxo

```javascript
// 1. Registrar usuário
POST /api/auth/register
{
  "email": "user@example.com",
  "username": "user123",
  "password": "senha123",
  "firstName": "João",
  "lastName": "Silva",
  "preferences": { "defaultStore": "Mercado X", "currency": "BRL" }
}

// 2. Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "senha123"
}
// Retorna: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }

// 3. Criar lista (com token no header)
POST /api/lists
Header: Authorization: Bearer <token>
{
  "name": "Compras da semana",
  "description": "Alimentos para segunda a sexta"
}

// 4. Adicionar item à lista
POST /api/lists/:listId/items
{
  "itemId": "1",
  "quantity": 2,
  "notes": "Comprar 2 pacotes"
}

// 5. Visualizar dashboard
GET /api/dashboard
Header: Authorization: Bearer <token>
```

## 🛡️ Segurança

- **Autenticação JWT** em todos os endpoints protegidos
- **Hash de senhas** com bcrypt (10 salt rounds)
- **Validação de propriedade** - usuários só podem ver suas próprias listas
- **Isolamento de dados** por usuário

## 📈 Circuit Breaker

O API Gateway implementa um Circuit Breaker simples com os seguintes estados:

- **CLOSED** - Normal, requisições passam normalmente
- **OPEN** - 3 falhas consecutivas, requisições são bloqueadas
- **HALF_OPEN** - Tentando se recuperar, permite 2 sucessos para voltar a CLOSED

Timeout de recuperação: **30 segundos**

## 🔍 Health Checks

O API Gateway executa health checks automáticos a cada **30 segundos**:

```bash
curl http://localhost:3000/health
```

Resposta:
```json
{
  "services": {
    "userService": "UP",
    "itemService": "UP",
    "listService": "UP"
  },
  "circuitBreakers": {
    "userService": { "state": "CLOSED", "failureCount": 0 },
    "itemService": { "state": "CLOSED", "failureCount": 0 },
    "listService": { "state": "CLOSED", "failureCount": 0 }
  }
}
```

## 📝 Logs

Todos os logs incluem timestamp e detalhes:

```
[GATEWAY LOG] 2025-11-23T10:30:45.123Z - GET /api/items - Status: 200 - 45ms
[HEALTH CHECK] 2025-11-23T10:30:45.456Z
  ✓ userService: UP
  ✓ itemService: UP
  ✓ listService: UP
[CIRCUIT BREAKERS STATUS]
  userService: CLOSED (falhas: 0)
  itemService: CLOSED (falhas: 0)
  listService: CLOSED (falhas: 0)
```

## 📁 Estrutura de Diretórios

```
lista-compras-microservices/
├── package.json                    # Dependências principais
├── README.md                       # Este arquivo
├── client-demo.js                  # Cliente de teste
├── shared/
│   ├── JsonDatabase.js             # Banco NoSQL em JSON
│   ├── serviceRegistry.js          # Service Discovery
│   └── CircuitBreaker.js           # Implementação de Circuit Breaker
├── services/
│   ├── user-service/
│   │   ├── package.json
│   │   ├── index.js
│   │   └── users.json              # Banco de usuários
│   ├── item-service/
│   │   ├── package.json
│   │   ├── index.js
│   │   └── items.json              # Catálogo de itens (20 itens pré-carregados)
│   └── list-service/
│       ├── package.json
│       ├── index.js
│       └── lists.json              # Listas de compras
├── api-gateway/
│   ├── package.json
│   └── index.js
└── service-registry.json           # Registro dinâmico de serviços
```

## 🧪 Testando a Aplicação

### 1. Executar o cliente de teste automático
```bash
node client-demo.js
```

### 2. Teste manual com curl

```bash
# Health Check
curl http://localhost:3000/health

# Registry
curl http://localhost:3000/registry

# Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "pass123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "pass123"
  }'

# Listar itens (substitua TOKEN pelo valor do token)
curl http://localhost:3000/api/items \
  -H "Authorization: Bearer TOKEN"

# Criar lista
curl -X POST http://localhost:3000/api/lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Compras Semanais",
    "description": "Itens para a semana"
  }'
```

## ⚠️ Troubleshooting

### "Service unavailable" no API Gateway
- Verifique se todos os serviços foram iniciados
- Verifique as portas: 3000 (Gateway), 3001 (User), 3002 (List), 3003 (Item)
- Aguarde 5 segundos após iniciar cada serviço

### "Circuit Breaker is OPEN"
- Um dos serviços falhou 3 vezes consecutivas
- O circuit breaker se recuperará após 30 segundos
- Verifique os logs do serviço problemático

### Token inválido
- Verifique se o token foi incluído corretamente no header: `Authorization: Bearer <token>`
- Tokens expiram após 1 hora
- Faça login novamente se necessário

## 🎯 Critérios de Avaliação Atendidos

✅ **Implementação Técnica (40%)**
- Microsserviços funcionais independentes
- Service Discovery operacional
- API Gateway com roteamento correto
- Bancos NoSQL com schema adequado

✅ **Integração (30%)**
- Comunicação entre serviços
- Autenticação distribuída com JWT
- Circuit breaker funcionando
- Health checks automáticos

✅ **Funcionalidades (30%)**
- CRUD completo de listas
- Busca e filtros operacionais
- Dashboard agregado
- Cliente demonstrando fluxo completo

## 📚 Referências

- Express.js: https://expressjs.com/
- JWT: https://jwt.io/
- bcrypt: https://github.com/kelektiv/node.bcrypt.js
- Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html

---

**Desenvolvido como projeto final de Arquitetura de Microsserviços**
