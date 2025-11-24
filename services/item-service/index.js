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

// Dados iniciais para seed
const seedData = [
    { id: "1", name: "Arroz Integral", category: "Alimentos", brand: "Tio João", unit: "kg", averagePrice: 15.50, barcode: "789000000001", description: "Arroz integral parboilizado", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "2", name: "Feijão Carioca", category: "Alimentos", brand: "Camil", unit: "kg", averagePrice: 8.99, barcode: "789000000002", description: "Feijão carioca tipo 1", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "3", name: "Leite Integral", category: "Bebidas", brand: "Italac", unit: "litro", averagePrice: 4.50, barcode: "789000000003", description: "Leite UHT integral", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "4", name: "Pão de Forma", category: "Padaria", brand: "Wickbold", unit: "un", averagePrice: 7.25, barcode: "789000000004", description: "Pão de forma tradicional", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "5", name: "Sabão em Pó", category: "Limpeza", brand: "Omo", unit: "kg", averagePrice: 22.90, barcode: "789000000005", description: "Sabão em pó para lavagem de roupas", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "6", name: "Creme Dental", category: "Higiene", brand: "Colgate", unit: "un", averagePrice: 3.99, barcode: "789000000006", description: "Creme dental tripla ação", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "7", name: "Refrigerante Cola", category: "Bebidas", brand: "Coca-Cola", unit: "litro", averagePrice: 8.00, barcode: "789000000007", description: "Refrigerante de cola 2L", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "8", name: "Macarrão Espaguete", category: "Alimentos", brand: "Barilla", unit: "un", averagePrice: 6.50, barcode: "789000000008", description: "Macarrão de sêmola", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "9", name: "Pão Francês", category: "Padaria", brand: "Padaria do Zé", unit: "un", averagePrice: 0.75, barcode: "789000000009", description: "Pão francês fresco", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "10", name: "Água Sanitária", category: "Limpeza", brand: "Qboa", unit: "litro", averagePrice: 5.00, barcode: "789000000010", description: "Água sanitária 2L", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "11", name: "Shampoo", category: "Higiene", brand: "Pantene", unit: "un", averagePrice: 18.75, barcode: "789000000011", description: "Shampoo Restauração", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "12", name: "Café em Pó", category: "Alimentos", brand: "Pilão", unit: "un", averagePrice: 12.00, barcode: "789000000012", description: "Café torrado e moído 500g", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "13", name: "Suco de Laranja", category: "Bebidas", brand: "Del Valle", unit: "litro", averagePrice: 7.99, barcode: "789000000013", description: "Néctar de laranja 1L", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "14", name: "Biscoito Recheado", category: "Alimentos", brand: "Oreo", unit: "un", averagePrice: 4.20, barcode: "789000000014", description: "Biscoito de chocolate com recheio de baunilha", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "15", name: "Desinfetante", category: "Limpeza", brand: "Pinho Sol", unit: "litro", averagePrice: 9.99, barcode: "789000000015", description: "Desinfetante pinho 1L", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "16", name: "Sabonete", category: "Higiene", brand: "Dove", unit: "un", averagePrice: 2.50, barcode: "789000000016", description: "Sabonete em barra", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "17", name: "Queijo Mussarela", category: "Alimentos", brand: "Sadia", unit: "kg", averagePrice: 45.00, barcode: "789000000017", description: "Queijo mussarela fatiado", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "18", name: "Cerveja Pilsen", category: "Bebidas", brand: "Skol", unit: "un", averagePrice: 3.50, barcode: "789000000018", description: "Lata 350ml", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "19", name: "Bolo de Chocolate", category: "Padaria", brand: "Padaria do Zé", unit: "un", averagePrice: 25.00, barcode: "789000000019", description: "Bolo de chocolate caseiro", active: true, createdAt: "2025-09-21T10:00:00Z" },
    { id: "20", name: "Lava Louças", category: "Limpeza", brand: "Ypê", unit: "un", averagePrice: 2.80, barcode: "789000000020", description: "Detergente líquido 500ml", active: true, createdAt: "2025-09-21T10:00:00Z" }
];

// Função para inicializar banco com seed data
const initializeSeedData = async () => {
    await db.load();
    let items = db.get('items');
    
    if (!items || items.length === 0) {
        console.log('[ITEM SERVICE] Inicializando banco com dados de exemplo...');
        await db.set('items', seedData);
        console.log(`[ITEM SERVICE] ${seedData.length} itens carregados com sucesso`);
    } else {
        console.log(`[ITEM SERVICE] Banco já contém ${items.length} itens`);
    }
};

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'Item Service', timestamp: new Date().toISOString() });
});

app.listen(port, async () => {
    await initializeSeedData();
    await register('itemService', `http://localhost:${port}`);
    console.log(`Item Service listening at http://localhost:${port}`);
});