const express = require('express');
const proxy = require('express-http-proxy');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { register, getRegistry, getService } = require('../shared/serviceRegistry');
const CircuitBreaker = require('../shared/CircuitBreaker');

const app = express();
const port = 3000;
const JWT_SECRET = 'your-secret-key';

// Mapa de circuit breakers para cada serviço
const circuitBreakers = {
    userService: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
    itemService: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 }),
    listService: new CircuitBreaker({ failureThreshold: 3, resetTimeout: 30000 })
};

app.use(express.json());

// Middleware de logging de requisições
app.use((req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
        const duration = Date.now() - startTime;
        console.log(`[GATEWAY LOG] ${new Date().toISOString()} - ${req.method} ${req.path} - Status: ${res.statusCode} - ${duration}ms`);
        res.send = originalSend;
        return res.send(data);
    };

    next();
});

// Health status dos serviços
const healthStatus = {
    userService: 'UNKNOWN',
    itemService: 'UNKNOWN',
    listService: 'UNKNOWN'
};

// Health check endpoint - ANTES de autenticação
app.get('/health', (req, res) => {
    const cbStatus = {};
    for (const serviceName in circuitBreakers) {
        cbStatus[serviceName] = circuitBreakers[serviceName].getState();
    }
    res.json({ 
        gateway: 'UP',
        services: healthStatus,
        circuitBreakers: cbStatus,
        timestamp: new Date().toISOString()
    });
});

app.get('/registry', async (req, res) => {
    const registry = await getRegistry();
    res.json(registry);
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (['/api/auth/login', '/api/auth/register'].includes(req.path)) {
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

const serviceProxy = (serviceName) => {
    return async (req, res, next) => {
        try {
            const service = await getService(serviceName);
            if (!service) {
                return res.status(503).json({ message: `Service ${serviceName} unavailable` });
            }

            const proxyOptions = {
                proxyReqPathResolver: (req) => {
                    const newPath = req.originalUrl.replace('/api', '');
                    return newPath;
                }
            };

            const breaker = circuitBreakers[serviceName];
            if (!breaker) {
                return proxy(service.url, proxyOptions)(req, res, next);
            }

            // Usar o circuit breaker para fazer a chamada
            await breaker.execute(async () => {
                // Delegar ao proxy
                return proxy(service.url, proxyOptions)(req, res, next);
            });
        } catch (error) {
            if (error.message && error.message.includes('Circuit breaker is OPEN')) {
                return res.status(503).json({ 
                    message: `Service ${serviceName} unavailable - Circuit breaker OPEN`,
                    error: error.message
                });
            }
            // Continuar com o próximo middleware/erro
            next(error);
        }
    };
};

app.use('/api/users', serviceProxy('userService'));
app.use('/api/auth', serviceProxy('userService'));
app.use('/api/items', serviceProxy('itemService'));
app.use('/api/lists', serviceProxy('listService'));

// Health check periódico a cada 30 segundos
let healthCheckInterval;

const startHealthChecks = async () => {
    healthCheckInterval = setInterval(async () => {
        const registry = await getRegistry();
        let hasIssues = false;
        
        for (const serviceName in registry.services) {
            try {
                await axios.get(`${registry.services[serviceName].url}/health`, { timeout: 5000 });
                healthStatus[serviceName] = 'UP';
            } catch (error) {
                healthStatus[serviceName] = 'DOWN';
                hasIssues = true;
            }
        }
        
        // Apenas logar se houver problemas
        if (hasIssues) {
            console.log(`[HEALTH CHECK] ${new Date().toISOString()} - Problemas detectados`);
            for (const serviceName in healthStatus) {
                if (healthStatus[serviceName] === 'DOWN') {
                    console.log(`  ✗ ${serviceName}: DOWN`);
                }
            }
        }
    }, 30000); // A cada 30 segundos
};

app.listen(port, async () => {
    await register('apiGateway', `http://localhost:${port}`);
    console.log(`API Gateway listening at http://localhost:${port}`);
    startHealthChecks();
    console.log(`[GATEWAY] Health checks iniciados - a cada 30 segundos`);
});

// Cleanup ao encerrar
process.on('SIGINT', () => {
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    console.log('\nAPI Gateway encerrado');
    process.exit(0);
});