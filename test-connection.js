const axios = require('axios');

console.log('=== TEST CONNECTION ===\n');

const tests = [
    { name: 'Gateway Health', url: 'http://localhost:3000/health' },
    { name: 'User Service Health', url: 'http://localhost:3001/health' },
    { name: 'List Service Health', url: 'http://localhost:3002/health' },
    { name: 'Item Service Health', url: 'http://localhost:3003/health' },
    { name: 'Gateway Registry', url: 'http://localhost:3000/registry' }
];

async function runTests() {
    for (const test of tests) {
        try {
            console.log(`Testing ${test.name}...`);
            const response = await axios.get(test.url, { timeout: 5000 });
            console.log(`✓ ${test.name}: OK (status ${response.status})`);
            console.log(`  Response:`, JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log(`✗ ${test.name}: FAILED`);
            if (error.code === 'ECONNREFUSED') {
                console.log(`  Error: Connection refused - service not running on port`);
            } else if (error.code === 'ENOTFOUND') {
                console.log(`  Error: Host not found`);
            } else {
                console.log(`  Error: ${error.message}`);
            }
        }
        console.log('');
    }
}

runTests();
