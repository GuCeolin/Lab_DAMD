const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const jwt = require('jsonwebtoken');
const JsonDatabase = require('../../shared/JsonDatabase');
const { register } = require('../../shared/serviceRegistry');

const app = express();
const port = 3003;
const JWT_SECRET = 'your-secret-key';

const db = new JsonDatabase(path.join(__dirname, 'items.json'));

app.use(express.json());

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Token missing' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

app.get('/items', async (req, res) => {
    const { category, name } = req.query;
    await db.load();
    let items = db.get('items');

    if (category) {
        items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }
    if (name) {
        items = items.filter(i => i.name.toLowerCase().includes(name.toLowerCase()));
    }

    res.json(items);
});

app.get('/items/:id', async (req, res) => {
    await db.load();
    const items = db.get('items');
    const item = items.find(i => i.id === req.params.id);
    if (item) {
        res.json(item);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.post('/items', authMiddleware, async (req, res) => {
    const { name, category, brand, unit, averagePrice, barcode, description } = req.body;
    if (!name || !category || !unit) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    await db.load();
    const items = db.get('items');
    const newItem = {
        id: uuidv4(),
        name,
        category,
        brand: brand || '',
        unit,
        averagePrice: averagePrice || 0,
        barcode: barcode || '',
        description: description || '',
        active: true,
        createdAt: new Date().toISOString()
    };

    items.push(newItem);
    await db.set('items', items);
    res.status(201).json(newItem);
});

app.put('/items/:id', authMiddleware, async (req, res) => {
    const { name, category, brand, unit, averagePrice, barcode, description, active } = req.body;
    if (!name || !category || !unit) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    await db.load();
    const items = db.get('items');
    const itemIndex = items.findIndex(i => i.id === req.params.id);

    if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found' });
    }

    items[itemIndex] = {
        ...items[itemIndex],
        name,
        category,
        brand,
        unit,
        averagePrice,
        barcode,
        description,
        active: active !== undefined ? active : items[itemIndex].active
    };

    await db.set('items', items);
    res.json(items[itemIndex]);
});

app.get('/categories', async (req, res) => {
    await db.load();
    const items = db.get('items');
    const categories = [...new Set(items.map(i => i.category))];
    res.json(categories);
});

app.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ message: 'Query parameter q is required' });
    }
    await db.load();
    const items = db.get('items');
    const results = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
    res.json(results);
});

app.listen(port, async () => {
    await register('itemService', `http://localhost:${port}`);
    console.log(`Item Service listening at http://localhost:${port}`);
});