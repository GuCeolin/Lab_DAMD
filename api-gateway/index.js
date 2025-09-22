const express = require('express');
const proxy = require('express-http-proxy');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { register, getRegistry, getService } = require('../shared/serviceRegistry');

const app = express();
const port = 3000;
const JWT_SECRET = 'your-secret-key';

app.use(express.json());

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (['/api/auth/login', '/api/auth/register', '/health', '/registry'].includes(req.path)) {
        return next();
    }
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

app.get('/api/dashboard', async (req, res) => {
    try {
        const listService = await getService('listService');
        if (!listService) return res.status(503).json({ message: 'List Service unavailable' });

        const config = { headers: { Authorization: req.headers.authorization } };
        const listsResponse = await axios.get(`${listService.url}/lists`, config);

        const totalLists = listsResponse.data.length;
        const totalItems = listsResponse.data.reduce((sum, list) => sum + list.summary.totalItems, 0);
        const mostRecentList = listsResponse.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

        res.json({
            userId: req.user.id,
            username: req.user.username,
            totalLists,
            totalItemsInAllLists: totalItems,
            mostRecentList: mostRecentList ? { id: mostRecentList.id, name: mostRecentList.name, updatedAt: mostRecentList.updatedAt } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data', details: error.message });
    }
});

app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Query parameter q is required' });

    try {
        const itemService = await getService('itemService');
        if (!itemService) return res.status(503).json({ message: 'Item Service unavailable' });

        const config = { headers: { Authorization: req.headers.authorization } };
        const itemsResponse = await axios.get(`${itemService.url}/search?q=${q}`, config);

        res.json({ items: itemsResponse.data });
    } catch (error) {
        res.status(500).json({ message: 'Error searching items', details: error.message });
    }
});

app.get('/health', async (req, res) => {
    const registry = await getRegistry();
    const healthStatus = {};
    for (const serviceName in registry.services) {
        try {
            await axios.get(registry.services[serviceName].url);
            healthStatus[serviceName] = 'UP';
        } catch (error) {
            healthStatus[serviceName] = 'DOWN';
        }
    }
    res.json(healthStatus);
});

app.get('/registry', async (req, res) => {
    const registry = await getRegistry();
    res.json(registry);
});

const serviceProxy = (serviceName) => {
    return async (req, res, next) => {
        const service = await getService(serviceName);
        if (service) {
            proxy(service.url)(req, res, next);
        } else {
            res.status(503).json({ message: `Service ${serviceName} unavailable` });
        }
    };
};

app.use('/api/users', serviceProxy('userService'));
app.use('/api/auth', serviceProxy('userService'));
app.use('/api/items', serviceProxy('itemService'));
app.use('/api/lists', serviceProxy('listService'));

app.listen(port, async () => {
    await register('apiGateway', `http://localhost:${port}`);
    console.log(`API Gateway listening at http://localhost:${port}`);
});