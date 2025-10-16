const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Add this check to ALL routes in tasks.js
if (!req.session.userId) {
    return res.status(401).json({ message: 'Please login first' });
}

// And modify task creation to include userId
const task = new Task({
    title: req.body.title,
    dueDate: req.body.dueDate || null,
    userId: req.session.userId  // Add this line
});

// GET all tasks
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new task (with due date support)
router.post('/', async (req, res) => {
    const task = new Task({
        title: req.body.title,
        dueDate: req.body.dueDate || null
    });

    try {
        const newTask = await task.save();
        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE task (toggle complete/incomplete)
router.patch('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        task.completed = !task.completed;
        const updatedTask = await task.save();
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE task title and due date
router.put('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        task.title = req.body.title;
        if (req.body.dueDate !== undefined) {
            task.dueDate = req.body.dueDate;
        }
        const updatedTask = await task.save();
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE task
router.delete('/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;