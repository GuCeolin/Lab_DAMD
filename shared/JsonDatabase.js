const fs = require('fs').promises;
const path = require('path');

class JsonDatabase {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.data = {};
        this.load();
    }

    async load() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            this.data = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.save();
            } else {
                throw error;
            }
        }
    }

    async save() {
        await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    }

    get(key) {
        return this.data[key] || [];
    }

    async set(key, value) {
        this.data[key] = value;
        await this.save();
    }
}

module.exports = JsonDatabase;
