# Sistema de Lista de Compras com Microsserviços

Este projeto implementa um sistema de backend para uma aplicação de lista de compras, utilizando uma arquitetura de microsserviços com Node.js.

## Arquitetura

O sistema é composto por 4 serviços independentes que se comunicam de forma distribuída, com um API Gateway como ponto único de entrada.

- **Service Registry**: Um arquivo JSON compartilhado (`service-registry.json`) é usado para que os serviços descubram os endereços uns dos outros dinamicamente.
- **Banco de Dados**: Cada serviço gerencia seus próprios dados através de arquivos JSON, simulando um banco de dados NoSQL.

### Serviços

1.  **User Service** (`porta 3001`): Responsável pelo gerenciamento de usuários, incluindo cadastro, login com autenticação JWT e atualização de perfis.
2.  **Item Service** (`porta 3003`): Funciona como um catálogo de produtos, permitindo a criação, listagem, busca e atualização de itens.
3.  **List Service** (`porta 3002`): Gerencia as listas de compras dos usuários. Permite criar/deletar listas e adicionar/remover itens delas, comunicando-se com o Item Service para obter os detalhes dos produtos.
4.  **API Gateway** (`porta 3000`): É o ponto de entrada da aplicação. Ele autentica as requisições, as roteia para o serviço apropriado e agrega dados de múltiplos serviços para endpoints específicos (como o `/dashboard`).

## Tecnologias

- **Node.js**
- **Express.js** para a criação dos servidores e APIs.
- **JSON Web Tokens (JWT)** para autenticação.
- **Axios** para a comunicação HTTP entre os serviços.

## Como Executar

### 1. Instalação

Na raiz do projeto (`lista-compras-microservices`), instale todas as dependências (dos serviços e da raiz) com um único comando:

```bash
npm run install:all
```

### 2. Iniciando os Serviços

Abra **4 terminais** diferentes na raiz do projeto e execute um comando em cada um para iniciar os serviços:

**Terminal 1 (User Service):**
```bash
cd services/user-service && npm start
```

**Terminal 2 (Item Service):**
```bash
cd services/item-service && npm start
```

**Terminal 3 (List Service):**
```bash
cd services/list-service && npm start
```

**Terminal 4 (API Gateway):**
```bash
cd api-gateway && npm start
```

### 3. Executando a Demonstração

Com os 4 serviços rodando, abra um **quinto terminal** na raiz do projeto e execute o cliente de demonstração:

```bash
node client-demo.js
```

Este script simulará um fluxo de usuário completo e exibirá os resultados no console.

## Principais Endpoints (via API Gateway)

- `POST /api/auth/register`: Cadastra um novo usuário.
- `POST /api/auth/login`: Realiza o login e retorna um token JWT.
- `GET /api/items`: Lista os itens do catálogo (pode ser filtrado por `?category=` ou `?name=`).
- `POST /api/lists`: Cria uma nova lista de compras (requer autenticação).
- `GET /api/lists`: Lista as listas de compras do usuário autenticado.
- `POST /api/lists/:id/items`: Adiciona um item a uma lista.
- `GET /api/dashboard`: Retorna um dashboard agregado com estatísticas do usuário.
- `GET /health`: Verifica e retorna o status de todos os serviços registrados.
