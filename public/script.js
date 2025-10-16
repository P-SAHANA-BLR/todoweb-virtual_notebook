// Load tasks when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
});

// Check if device is touch-enabled
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Make buttons more touch-friendly on mobile
if (isTouchDevice()) {
    document.addEventListener('DOMContentLoaded', function() {
        // Add larger touch targets
        const style = document.createElement('style');
        style.textContent = `
            .task-actions button {
                min-height: 44px;
                min-width: 44px;
            }
            .task-item {
                padding: 15px;
            }
        `;
        document.head.appendChild(style);
    });
}

// Add new task with due date support
async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('dueDate');
    const title = taskInput.value.trim();
    const dueDate = dueDateInput.value;

    if (title) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    title,
                    dueDate: dueDate || null
                })
            });

            if (response.ok) {
                taskInput.value = '';
                dueDateInput.value = '';
                loadTasks();
            } else {
                alert('Failed to add task');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error adding task');
        }
    } else {
        alert('Please enter a task');
    }
}

// Allow adding task with Enter key
document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Load all tasks from server
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();
        
        displayTasks(tasks);
        updateStats(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Display tasks in the UI (Mobile & Desktop friendly)
function displayTasks(tasks) {
    let filteredTasks = tasks;
    
    // Apply filter
    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    
    const taskList = document.getElementById('taskList');
    
    if (filteredTasks.length === 0) {
        const message = currentFilter === 'all' ? 'No tasks yet.' : 
                       currentFilter === 'active' ? 'No active tasks.' : 'No completed tasks.';
        taskList.innerHTML = `<div class="no-tasks">${message} Add your first task above!</div>`;
        return;
    }

    taskList.innerHTML = filteredTasks.map(task => {
        // Escape special characters in task title for JavaScript
        const safeTitle = task.title
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');
        
        // Format due date if it exists
        let dueDateHtml = '';
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const isOverdue = dueDate < today && !task.completed;
            const dueDateClass = isOverdue ? 'overdue' : '';
            const dueDateText = dueDate.toLocaleDateString();
            
            dueDateHtml = `<div class="due-date ${dueDateClass}">Due: ${dueDateText}</div>`;
        }
        
        return `
        <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
            <div class="task-content">
                <span class="task-text" 
                      ondblclick="enableEdit('${task._id}', '${safeTitle}')" 
                      onclick="handleTaskClick('${task._id}', '${safeTitle}', event)">
                    ${task.title}
                </span>
                ${dueDateHtml}
            </div>
            <div class="task-actions">
                <button class="complete-btn" onclick="toggleTask('${task._id}')" title="Mark Complete">
                    ${task.completed ? '↶' : '✓'}
                </button>
                <button class="edit-btn" onclick="enableEdit('${task._id}', '${safeTitle}')" title="Edit Task">✎</button>
                <button class="delete-btn" onclick="deleteTask('${task._id}')" title="Delete Task">✕</button>
            </div>
        </div>
        `;
    }).join('');
}

// Handle task clicks differently for touch vs mouse devices
function handleTaskClick(taskId, taskTitle, event) {
    // Only proceed if this is a touch device
    if (!isTouchDevice()) {
        return; // On desktop, let double-click handle editing
    }
    
    // Prevent double execution
    if (event.detail > 1) return;
    
    // For touch devices: single tap opens edit mode after a short delay
    setTimeout(() => {
        // Check if another action hasn't already been triggered
        if (!event.defaultPrevented) {
            enableEdit(taskId, taskTitle);
        }
    }, 300); // 300ms delay to distinguish from button clicks
}

// Enable editing for a task (touch-friendly)
function enableEdit(id, currentTitle) {
    const taskItem = event.target.closest('.task-item');
    if (!taskItem) return;
    
    const taskText = taskItem.querySelector('.task-text');
    taskText.innerHTML = `
        <input type="text" class="edit-input" value="${currentTitle}" 
               onblur="updateTask('${id}', this.value)"
               onkeypress="if(event.key==='Enter') this.blur()"
               autofocus>
    `;
    
    const input = taskText.querySelector('.edit-input');
    input.focus();
    input.select(); // Select all text for easy editing
    
    // For mobile: larger font in edit mode
    if (isTouchDevice()) {
        input.style.fontSize = '18px';
        input.style.padding = '12px';
        input.style.minHeight = '44px'; // Minimum touch target size
    }
}

// Update task title
async function updateTask(id, newTitle) {
    if (newTitle.trim()) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newTitle.trim() })
            });

            if (response.ok) {
                loadTasks();
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    } else {
        loadTasks(); // Reload to cancel edit if empty
    }
}

// Toggle task completion
async function toggleTask(id) {
    try {
        const response = await fetch(`/api/tasks/${id}`, {
            method: 'PATCH'
        });

        if (response.ok) {
            loadTasks();
        }
    } catch (error) {
        console.error('Error toggling task:', error);
    }
}

// Delete task
async function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadTasks();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }
}

// Update task statistics
function updateStats(tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    
    document.getElementById('totalTasks').textContent = `Total: ${totalTasks} tasks`;
    document.getElementById('completedTasks').textContent = `Completed: ${completedTasks}`;
}

// Filtering variables and functions
let currentFilter = 'all';

// Set filter and reload tasks
function setFilter(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadTasks();
}