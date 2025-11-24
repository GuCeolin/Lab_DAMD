const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const JsonDatabase = require('../../shared/JsonDatabase');
const { register } = require('../../shared/serviceRegistry');

const app = express();
const port = 3001;
const JWT_SECRET = 'your-secret-key';

const db = new JsonDatabase(path.join(__dirname, 'users.json'));

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

app.post('/auth/register', async (req, res) => {
    const { email, username, password, firstName, lastName, preferences } = req.body;
    if (!email || !username || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    await db.load();
    const users = db.get('users');
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: uuidv4(),
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        preferences: preferences || { defaultStore: '', currency: 'BRL' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    await db.set('users', users);

    res.status(201).json({ id: newUser.id, username: newUser.username });
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    await db.load();
    const users = db.get('users');
    const user = users.find(u => u.email === email);

    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/users/:id', authMiddleware, async (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    await db.load();
    const users = db.get('users');
    const user = users.find(u => u.id === req.params.id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

app.put('/users/:id', authMiddleware, async (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const { firstName, lastName, preferences } = req.body;
    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    await db.load();
    const users = db.get('users');
    const userIndex = users.findIndex(u => u.id === req.params.id);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }

    users[userIndex] = {
        ...users[userIndex],
        firstName,
        lastName,
        preferences: preferences || users[userIndex].preferences,
        updatedAt: new Date().toISOString()
    };

    await db.set('users', users);
    const { password, ...updatedUser } = users[userIndex];
    res.json(updatedUser);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'User Service', timestamp: new Date().toISOString() });
});

app.listen(port, async () => {
    await register('userService', `http://localhost:${port}`);
    console.log(`User Service listening at http://localhost:${port}`);
});