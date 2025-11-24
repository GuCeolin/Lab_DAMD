// shared/serviceRegistry.js
// Arquivo compartilhado para descoberta de serviços
// Registro automático na inicialização
// Health checks distribuídos

const fs = require('fs').promises;
const path = require('path');

const registryPath = path.join(__dirname, '..', 'service-registry.json');

async function getRegistry() {
    try {
        const data = await fs.readFile(registryPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { services: {} };
        }
        throw error;
    }
}

async function saveRegistry(registry) {
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

async function register(serviceName, serviceUrl) {
    const registry = await getRegistry();
    registry.services[serviceName] = { 
        url: serviceUrl, 
        registeredAt: new Date().toISOString(),
        status: 'UP'
    };
    await saveRegistry(registry);
    console.log(`[SERVICE REGISTRY] Service ${serviceName} registered at ${serviceUrl}`);
}

async function unregister(serviceName) {
    const registry = await getRegistry();
    delete registry.services[serviceName];
    await saveRegistry(registry);
    console.log(`[SERVICE REGISTRY] Service ${serviceName} unregistered.`);
}

async function getService(serviceName) {
    const registry = await getRegistry();
    return registry.services[serviceName];
}

module.exports = { register, unregister, getService, getRegistry };
