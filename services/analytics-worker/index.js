const amqp = require('amqplib');

// --- RabbitMQ Config ---
// Cole sua URL de conexão AMQP aqui
const AMQP_URL = "amqps://xhutorux:Ru5T7D-E9l006utkEjXfkr_ocPdg-9At@jaragua.lmq.cloudamqp.com/xhutorux";
const EXCHANGE_NAME = 'shopping_events';
const QUEUE_NAME = 'fila_analytics';
const BINDING_KEY = 'list.checkout.#';

/**
 * Função principal para iniciar o worker de analytics.
 */
async function startAnalyticsWorker() {
    console.log('Starting Analytics Worker...');
    
    try {
        // 1. Conectar ao servidor RabbitMQ
        const connection = await amqp.connect(AMQP_URL);
        console.log('[SUCCESS] Connected to RabbitMQ.');

        // 2. Criar um canal
        const channel = await connection.createChannel();
        console.log('[SUCCESS] Channel created.');

        // 3. Garantir que o Exchange 'topic' existe
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        console.log(`[SUCCESS] Exchange '${EXCHANGE_NAME}' asserted.`);

        // 4. Garantir que a Fila existe
        const q = await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`[SUCCESS] Queue '${QUEUE_NAME}' asserted.`);

        // 5. Fazer o "bind" da fila ao exchange
        await channel.bindQueue(q.queue, EXCHANGE_NAME, BINDING_KEY);
        console.log(`[SUCCESS] Queue bound to exchange with key '${BINDING_KEY}'.`);

        console.log('\n[*] Waiting for checkout events. To exit press CTRL+C');

        // 6. Começar a consumir mensagens
        channel.consume(q.queue, (msg) => {
            if (msg.content) {
                const payload = JSON.parse(msg.content.toString());
                
                // ---- Lógica do Worker ----
                console.log("\n=====================================================");
                console.log(`[EVENT RECEIVED] Routing Key: '${msg.fields.routingKey}'`);
                
                const { listId, summary } = payload;
                const totalValue = summary.estimatedTotal;
                
                console.log(`[Analytics] Calculando estatísticas para a lista ${listId}.`);
                console.log(`[Analytics] Valor total da compra: R$ ${totalValue.toFixed(2)}`);
                console.log(`[Analytics] Total de itens: ${summary.totalItems}`);
                console.log("=====================================================\n");
                // --------------------------

                // 7. Fazer o ACK manual da mensagem
                channel.ack(msg);
            }
        }, {
            noAck: false // ACK manual
        });

    } catch (error) {
        console.error('[ERROR] Failed to start worker:', error);
        setTimeout(startAnalyticsWorker, 5000); // Tenta reconectar
    }
}

startAnalyticsWorker();
