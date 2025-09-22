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

async function runDemo() {
    console.log('Iniciando demonstração...\n');

    console.log('1. Registrando novo usuário...');
    const registerResponse = await api.post('/auth/register', userData);
    console.log('Resposta:', registerResponse.data);

    console.log('\n2. Fazendo login...');
    const loginResponse = await api.post('/auth/login', { email: userData.email, password: userData.password });
    setAuthToken(loginResponse.data.token);
    console.log('Login bem-sucedido! Token armazenado.');

    console.log('\n3. Buscando itens no catálogo (categoria: Alimentos)...');
    const itemsResponse = await api.get('/items?category=Alimentos');
    const firstItem = itemsResponse.data[0];
    console.log('Itens encontrados:', itemsResponse.data.length);
    console.log('Primeiro item:', firstItem.name);

    console.log('\n4. Criando uma nova lista de compras...');
    const newListData = { name: 'Minha Lista de Compras', description: 'Itens para a semana' };
    const listResponse = await api.post('/lists', newListData);
    const listId = listResponse.data.id;
    console.log('Lista criada:', listResponse.data.name);

    console.log('\n5. Adicionando item à lista...');
    const addItemData = { itemId: firstItem.id, quantity: 2, notes: 'Comprar 2 caixas' };
    const updatedListResponse = await api.post(`/lists/${listId}/items`, addItemData);
    console.log('Item adicionado! Itens na lista:', updatedListResponse.data.summary.totalItems);

    console.log('\n6. Visualizando o dashboard...');
    const dashboardResponse = await api.get('/dashboard');
    console.log('Dados do Dashboard:', dashboardResponse.data);

    console.log('\nDemonstração concluída com sucesso!');
}

runDemo().catch(error => {
    console.error('\nOcorreu um erro durante a demonstração:');
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
    } else {
        console.error('Mensagem:', error.message);
    }
});