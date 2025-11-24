# Sistema de Lista de Compras com Microsserviços

Este projeto implementa um sistema de backend para uma aplicação de lista de compras, utilizando uma arquitetura de microsserviços com Node.js.

## Arquitetura

O sistema é composto por serviços independentes que se comunicam de forma síncrona (via HTTP) e assíncrona (via **RabbitMQ**). Um API Gateway serve como ponto único de entrada para todas as requisições externas.

- **Comunicação Assíncrona**: Para operações que podem ser executadas em segundo plano (como a finalização de uma compra), o sistema utiliza o RabbitMQ para publicar eventos, permitindo que múltiplos serviços (workers) reajam a eles de forma desacoplada.
- **Service Registry**: Um arquivo JSON compartilhado (`service-registry.json`) é usado para que os serviços descubram os endereços uns dos outros dinamicamente.
- **Banco de Dados**: Cada serviço gerencia seus próprios dados através de arquivos JSON, simulando um banco de dados NoSQL.

### Serviços

1.  **User Service** (`porta 3001`): Responsável pelo gerenciamento de usuários, incluindo cadastro, login com autenticação JWT e atualização de perfis.
2.  **Item Service** (`porta 3003`): Funciona como um catálogo de produtos, permitindo a criação, listagem, busca e atualização de itens.
3.  **List Service** (`porta 3002`): Gerencia as listas de compras dos usuários. Ele publica eventos no RabbitMQ quando uma compra é finalizada.
4.  **API Gateway** (`porta 3000`): É o ponto de entrada da aplicação. Ele autentica as requisições, as roteia para o serviço apropriado e agrega dados.
5.  **Notification Worker**: Serviço que consome eventos de checkout para simular o envio de notificações ao usuário.
6.  **Analytics Worker**: Serviço que consome os mesmos eventos de checkout para simular o processamento de dados e estatísticas.

## Tecnologias

- **Node.js**
- **Express.js** para a criação dos servidores e APIs.
- **amqplib** para integração com RabbitMQ.
- **JSON Web Tokens (JWT)** para autenticação.
- **Axios** para a comunicação HTTP entre os serviços.

## Como Executar

### 1. Instalação

Na raiz do projeto, instale todas as dependências (dos serviços e da raiz) com um único comando:

```bash
npm run install:all
```
*(Lembre-se de instalar as dependências dos novos workers se ainda não o fez)*.

### 2. Iniciando os Serviços

Abra **6 terminais** diferentes na raiz do projeto e execute um comando em cada um para iniciar todos os componentes:

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

**Terminal 5 (Notification Worker):**
```bash
cd services/notification-worker && npm start
```

**Terminal 6 (Analytics Worker):**
```bash
cd services/analytics-worker && npm start
```

### 3. Executando a Demonstração

Com os 6 serviços/workers rodando, abra um **sétimo terminal** na raiz do projeto e execute o cliente de demonstração:

```bash
node client-demo.js
```

Para testar a nova funcionalidade de checkout, você precisará fazer uma requisição `POST` para `http://localhost:3000/api/lists/:id/checkout` (substituindo `:id` pelo ID de uma lista e incluindo o token de autenticação).

## Principais Endpoints (via API Gateway)

- `POST /api/auth/register`: Cadastra um novo usuário.
- `POST /api/auth/login`: Realiza o login e retorna um token JWT.
- `GET /api/items`: Lista os itens do catálogo.
- `POST /api/lists`: Cria uma nova lista de compras (requer autenticação).
- `GET /api/lists`: Lista as listas de compras do usuário autenticado.
- `POST /api/lists/:id/items`: Adiciona um item a uma lista.
- **`POST /api/lists/:id/checkout`**: Inicia o processo de checkout de uma lista (operação assíncrona).**
- `GET /api/dashboard`: Retorna um dashboard agregado com estatísticas do usuário.
- `GET /health`: Verifica e retorna o status de todos os serviços registrados.
  
