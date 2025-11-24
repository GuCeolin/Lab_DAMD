const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const amqp = require('amqplib');
const JsonDatabase = require('../../shared/JsonDatabase');
const { register, getService } = require('../../shared/serviceRegistry');

const app = express();
const port = 3002;
const JWT_SECRET = 'your-secret-key';

// RabbitMQ Config - Deixe a sua URL aqui
const AMQP_URL = "amqps://xhutorux:Ru5T7D-E9l006utkEjXfkr_ocPdg-9At@jaragua.lmq.cloudamqp.com/xhutorux";
const EXCHANGE_NAME = 'shopping_events';

const db = new JsonDatabase(path.join(__dirname, 'lists.json'));

/**
 * Publica um evento de checkout no RabbitMQ.
 * @param {object} payload - O conteúdo da mensagem a ser enviada.
 */
async function publishCheckoutEvent(payload) {
    console.log('Attempting to connect to RabbitMQ...');
    try {
        const connection = await amqp.connect(AMQP_URL);
        const channel = await connection.createChannel();
        
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        
        const routingKey = 'list.checkout.completed';
        channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)));
        
        console.log(`[SUCCESS] Published event '${routingKey}' to exchange '${EXCHANGE_NAME}'`);
        
        setTimeout(() => {
            channel.close();
            connection.close();
            console.log('RabbitMQ connection closed.');
        }, 500);

    } catch (error) {
        console.error('Error publishing message to RabbitMQ:', error);
    }
}


app.use(express.json());

// Health check endpoint - ANTES de autenticação
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'List Service', timestamp: new Date().toISOString() });
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token missing' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

app.use(authMiddleware);

const calculateSummary = (items) => {
    const totalItems = items.length;
    const purchasedItems = items.filter(i => i.purchased).length;
    const estimatedTotal = items.reduce((sum, i) => sum + (i.estimatedPrice * i.quantity), 0);
    return { totalItems, purchasedItems, estimatedTotal: parseFloat(estimatedTotal.toFixed(2)) };
};

app.post('/lists', async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'List name is required' });

    await db.load();
    const lists = db.get('lists') || [];
    const newList = {
        id: uuidv4(),
        userId: req.user.id,
        name,
        description: description || '',
        status: 'active',
        items: [],
        summary: { totalItems: 0, purchasedItems: 0, estimatedTotal: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    lists.push(newList);
    await db.set('lists', lists);
    res.status(201).json(newList);
});

app.get('/lists', async (req, res) => {
    await db.load();
    const lists = db.get('lists') || [];
    const userLists = lists.filter(l => l.userId === req.user.id);
    res.json(userLists);
});

app.get('/lists/:id', async (req, res) => {
    await db.load();
    const lists = db.get('lists') || [];
    const list = lists.find(l => l.id === req.params.id && l.userId === req.user.id);
    if (!list) return res.status(404).json({ message: 'List not found' });
    res.json(list);
});

app.put('/lists/:id', async (req, res) => {
    const { name, description, status } = req.body;
    if (!name) return res.status(400).json({ message: 'List name is required' });

    await db.load();
    const lists = db.get('lists') || [];
    const listIndex = lists.findIndex(l => l.id === req.params.id && l.userId === req.user.id);
    if (listIndex === -1) return res.status(404).json({ message: 'List not found' });

    lists[listIndex] = { ...lists[listIndex], name, description, status: status || lists[listIndex].status, updatedAt: new Date().toISOString() };
    await db.set('lists', lists);
    res.json(lists[listIndex]);
});

app.delete('/lists/:id', async (req, res) => {
    await db.load();
    let lists = db.get('lists') || [];
    const initialLength = lists.length;
    lists = lists.filter(l => !(l.id === req.params.id && l.userId === req.user.id));
    if (lists.length === initialLength) return res.status(404).json({ message: 'List not found' });

    await db.set('lists', lists);
    res.status(204).send();
});

app.post('/lists/:id/items', async (req, res) => {
    const { itemId, quantity, notes } = req.body;
    if (!itemId || !quantity) return res.status(400).json({ message: 'itemId and quantity are required' });

    const itemService = await getService('itemService');
    if (!itemService) return res.status(503).json({ message: 'Item Service unavailable' });

    let itemDetails;
    try {
        const response = await axios.get(`${itemService.url}/items/${itemId}`);
        itemDetails = response.data;
    } catch (error) {
        return res.status(404).json({ message: 'Item not found in catalog' });
    }

    await db.load();
    const lists = db.get('lists') || [];
    const listIndex = lists.findIndex(l => l.id === req.params.id && l.userId === req.user.id);
    if (listIndex === -1) return res.status(404).json({ message: 'List not found' });

    const list = lists[listIndex];
    const newListItem = {
        itemId,
        itemName: itemDetails.name,
        quantity,
        unit: itemDetails.unit,
        estimatedPrice: itemDetails.averagePrice,
        purchased: false,
        notes: notes || '',
        addedAt: new Date().toISOString()
    };
    list.items.push(newListItem);
    list.summary = calculateSummary(list.items);
    list.updatedAt = new Date().toISOString();

    await db.set('lists', lists);
    res.status(201).json(list);
});

app.put('/lists/:id/items/:itemId', async (req, res) => {
    const { quantity, purchased, notes } = req.body;

    await db.load();
    const lists = db.get('lists') || [];
    const listIndex = lists.findIndex(l => l.id === req.params.id && l.userId === req.user.id);
    if (listIndex === -1) return res.status(404).json({ message: 'List not found' });

    const list = lists[listIndex];
    const itemIndex = list.items.findIndex(i => i.itemId === req.params.itemId);
    if (itemIndex === -1) return res.status(404).json({ message: 'Item not found in list' });

    const item = list.items[itemIndex];
    item.quantity = quantity !== undefined ? quantity : item.quantity;
    item.purchased = purchased !== undefined ? purchased : item.purchased;
    item.notes = notes !== undefined ? notes : item.notes;
    list.summary = calculateSummary(list.items);
    list.updatedAt = new Date().toISOString();

    await db.set('lists', lists);
    res.json(list);
});

app.delete('/lists/:id/items/:itemId', async (req, res) => {
    await db.load();
    const lists = db.get('lists') || [];
    const listIndex = lists.findIndex(l => l.id === req.params.id && l.userId === req.user.id);
    if (listIndex === -1) return res.status(404).json({ message: 'List not found' });

    const list = lists[listIndex];
    const initialLength = list.items.length;
    list.items = list.items.filter(i => i.itemId !== req.params.itemId);
    if (list.items.length === initialLength) return res.status(404).json({ message: 'Item not found in list' });

    list.summary = calculateSummary(list.items);
    list.updatedAt = new Date().toISOString();

    await db.set('lists', lists);
    res.json(list);
});

app.get('/lists/:id/summary', async (req, res) => {
    await db.load();
    const lists = db.get('lists') || [];
    const list = lists.find(l => l.id === req.params.id && l.userId === req.user.id);
    if (!list) return res.status(404).json({ message: 'List not found' });
    res.json(list.summary);
});

// Endpoint de Checkout assíncrono
app.post('/lists/:id/checkout', async (req, res) => {
    await db.load();
    const lists = db.get('lists') || [];
    const list = lists.find(l => l.id === req.params.id && l.userId === req.user.id);

    if (!list) {
        return res.status(404).json({ message: 'List not found' });
    }
    
    // Simula a obtenção do email do usuário (em um cenário real, viria de outro serviço)
    const userEmail = `${req.user.username}@example.com`;

    const payload = {
        listId: list.id,
        userId: req.user.id,
        userEmail: userEmail,
        listName: list.name,
        summary: list.summary,
        checkoutTimestamp: new Date().toISOString()
    };

    // Publica o evento de forma assíncrona
    publishCheckoutEvent(payload);

    // Atualiza o status da lista localmente
    const listIndex = lists.findIndex(l => l.id === list.id);
    if (listIndex !== -1) {
        lists[listIndex].status = 'completed';
        lists[listIndex].updatedAt = new Date().toISOString();
        await db.set('lists', lists);
    }
    
    // Retorna 202 Accepted imediatamente
    res.status(202).json({ message: 'Checkout process has been initiated.', listId: list.id });
});


app.listen(port, async () => {
    await register('listService', `http://localhost:${port}`);
    console.log(`List Service listening at http://localhost:${port}`);
});
