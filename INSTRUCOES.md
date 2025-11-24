# Instruções para Executar o Projeto com Mensageria

Este guia descreve como iniciar todos os serviços e workers necessários para rodar a aplicação completa, incluindo o sistema de mensageria com RabbitMQ.

## 1. Pré-requisitos

- Node.js instalado.
- Acesso à instância do RabbitMQ (a URL já está configurada no código).

## 2. Instalação das Dependências

Se você ainda não instalou as dependências de todos os serviços e workers, execute o seguinte comando na raiz do projeto:

```bash
npm run install:all
```

Este comando pode não incluir os novos workers. Caso encontre problemas, instale as dependências manualmente:
```bash
# No diretório services/notification-worker
npm install

# No diretório services/analytics-worker
npm install
```

## 3. Iniciando os Serviços e Workers

Para que o sistema funcione por completo, você precisa iniciar os 4 serviços originais e os 2 novos workers. Abra **6 terminais** diferentes na raiz do projeto e execute os seguintes comandos, um em cada terminal:

**Terminal 1: User Service**
```bash
cd services/user-service && npm start
```

**Terminal 2: Item Service**
```bash
cd services/item-service && npm start
```

**Terminal 3: List Service**
```bash
cd services/list-service && npm start
```

**Terminal 4: API Gateway**
```bash
cd api-gateway && npm start
```

**Terminal 5: Notification Worker**
```bash
cd services/notification-worker && npm start
```

**Terminal 6: Analytics Worker**
```bash
cd services/analytics-worker && npm start
```

Ao final, você terá 6 processos rodando. Os terminais dos workers exibirão a mensagem "[*] Waiting for checkout events..." e ficarão aguardando novas mensagens do RabbitMQ.
