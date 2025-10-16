const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

const session = require('express-session');

// Add after other middleware
app.use(session({
    secret: 'todo-app-secret',
    resave: false,
    saveUninitialized: false
}));

// Add auth routes
app.use('/api/auth', require('./routes/auth'));

// Connect to MongoDB (with environment variable for deployment)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp')
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
app.use('/api/tasks', require('./routes/tasks'));

// Basic route to test server
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use environment port or 3000 for local
// Use environment port or 3000 for local
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});