const axios = require('axios');

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

const userData = {
    email: `testuser-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
};

let authToken = '';

const setAuthToken = (token) => {
    authToken = token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Função auxiliar para aguardar API estar pronta
const waitForApi = async (maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get('http://localhost:3000/health', { timeout: 3000 });
            if (response.status === 200) {
                console.log('✓ API Gateway está pronto!\n');
                return true;
            }
        } catch (error) {
            const tentativa = i + 1;
            if (tentativa % 5 === 0) {
                console.log(`⏳ Aguardando API Gateway... tentativa ${tentativa}/${maxAttempts}`);
            }
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    throw new Error('API Gateway não respondeu após 60 segundos');
};

async function runDemo() {
    console.log('=== DEMONSTRAÇÃO DO SISTEMA DE LISTA DE COMPRAS ===\n');
    
    try {
        // Aguardar API estar pronta
        await waitForApi();

        console.log('1. Registrando novo usuário...');
        const registerResponse = await api.post('/auth/register', userData);
        console.log('✓ Usuário registrado:', registerResponse.data.username);

        console.log('\n2. Fazendo login...');
        const loginResponse = await api.post('/auth/login', { email: userData.email, password: userData.password });
        setAuthToken(loginResponse.data.token);
        console.log('✓ Login bem-sucedido!');

        console.log('\n3. Buscando itens no catálogo (categoria: Alimentos)...');
        const itemsResponse = await api.get('/items?category=Alimentos');
        const firstItem = itemsResponse.data[0];
        console.log(`✓ Encontrados ${itemsResponse.data.length} itens em "Alimentos"`);
        console.log(`  Primeiro item: ${firstItem.name} - R$ ${firstItem.averagePrice}`);

        console.log('\n4. Criando uma nova lista de compras...');
        const newListData = { name: 'Minha Lista de Compras', description: 'Itens para a semana' };
        const listResponse = await api.post('/lists', newListData);
        const listId = listResponse.data.id;
        console.log('✓ Lista criada:', listResponse.data.name);

        console.log('\n5. Adicionando item à lista...');
        const addItemData = { itemId: firstItem.id, quantity: 2, notes: 'Comprar 2 unidades' };
        const updatedListResponse = await api.post(`/lists/${listId}/items`, addItemData);
        console.log(`✓ Item adicionado! Total na lista: ${updatedListResponse.data.summary.totalItems} item(ns)`);
        console.log(`  Preço estimado: R$ ${updatedListResponse.data.summary.estimatedTotal.toFixed(2)}`);

        console.log('\n6. Buscando mais itens e adicionando...');
        const beveragesResponse = await api.get('/items?category=Bebidas');
        if (beveragesResponse.data.length > 0) {
            const beverageItem = beveragesResponse.data[0];
            const addBeverageData = { itemId: beverageItem.id, quantity: 1 };
            const updatedList2 = await api.post(`/lists/${listId}/items`, addBeverageData);
            console.log(`✓ ${beverageItem.name} adicionado`);
            console.log(`  Total estimado agora: R$ ${updatedList2.data.summary.estimatedTotal.toFixed(2)}`);
        }

        console.log('\n7. Obtendo resumo da lista...');
        const summaryResponse = await api.get(`/lists/${listId}/summary`);
        console.log('✓ Resumo da lista:');
        console.log(`  Total de itens: ${summaryResponse.data.totalItems}`);
        console.log(`  Itens comprados: ${summaryResponse.data.purchasedItems}`);
        console.log(`  Valor estimado: R$ ${summaryResponse.data.estimatedTotal.toFixed(2)}`);

        console.log('\n8. Visualizando o dashboard...');
        const dashboardResponse = await api.get('/dashboard');
        console.log('✓ Dashboard do usuário:');
        console.log(`  Usuário: ${dashboardResponse.data.username}`);
        console.log(`  Total de listas: ${dashboardResponse.data.totalLists}`);
        console.log(`  Total de itens: ${dashboardResponse.data.totalItemsInAllLists}`);

        console.log('\n9. Verificando saúde dos serviços...');
        const healthResponse = await axios.get('http://localhost:3000/health');
        console.log('✓ Status dos serviços:');
        for (const [service, status] of Object.entries(healthResponse.data.services)) {
            const icon = status === 'UP' ? '✓' : '✗';
            console.log(`  ${icon} ${service}: ${status}`);
        }

        console.log('\n10. Verificando Circuit Breakers...');
        console.log('✓ Estado dos Circuit Breakers:');
        for (const [service, state] of Object.entries(healthResponse.data.circuitBreakers)) {
            console.log(`  ${service}: ${state.state} (falhas: ${state.failureCount})`);
        }

        console.log('\n=== ✓ DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO! ===\n');

    } catch (error) {
        console.error('\n❌ Ocorreu um erro durante a demonstração:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Dados:', error.response.data);
        } else {
            console.error('Mensagem:', error.message);
        }
        process.exit(1);
    }
}

// Esperar um pouco para todos os serviços iniciarem
setTimeout(runDemo, 3000);