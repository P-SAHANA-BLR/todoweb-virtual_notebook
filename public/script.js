// Auth functions
let currentUser = null;

async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.loggedIn) {
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin();
    }
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Clear previous messages
    clearMessages();

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (data.success) {
            showApp();
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('Login failed. Please try again.', 'error');
    }
}

async function signup(event) {
    event.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    // Clear previous messages
    clearMessages();

    // Basic validation
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (data.success) {
            showMessage('Account created successfully!', 'success');
            // Auto login after signup
            setTimeout(() => showApp(), 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('Signup failed. Please try again.', 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        showLogin();
        clearForms();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.querySelector('.auth-form').style.display = 'block';
    clearMessages();
}

function showSignup() {
    document.getElementById('signupForm').style.display = 'block';
    document.querySelector('.auth-form').style.display = 'none';
    clearMessages();
}

function showApp() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    loadTasks();
    clearForms();
}

function clearForms() {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    clearMessages();
}

function showMessage(message, type) {
    clearMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    const currentForm = document.querySelector('.auth-form[style="display: block;"]') || 
                        document.getElementById('signupForm');
    currentForm.insertBefore(messageDiv, currentForm.firstChild);
}

function clearMessages() {
    const messages = document.querySelectorAll('.error-message, .success-message');
    messages.forEach(msg => msg.remove());
}

// Task functions (updated for auth)
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
            } else if (response.status === 401) {
                showMessage('Please login again', 'error');
                showLogin();
            } else {
                showMessage('Failed to add task', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error adding task', 'error');
        }
    } else {
        showMessage('Please enter a task', 'error');
    }
}

// Allow adding task with Enter key
document.getElementById('taskInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Load all tasks from server
async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (response.status === 401) {
            showLogin();
            return;
        }
        
        const tasks = await response.json();
        displayTasks(tasks);
        updateStats(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        if (error.message.includes('Unauthorized')) {
            showLogin();
        }
    }
}

// Display tasks in the UI
function displayTasks(tasks) {
    const taskList = document.getElementById('taskList');
    
    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = '<div class="no-tasks">No tasks yet. Add your first task above!</div>';
        return;
    }

    taskList.innerHTML = tasks.map(task => {
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
        <div class="task-item ${task.completed ? 'completed' : ''}">
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
            } else if (response.status === 401) {
                showLogin();
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
        } else if (response.status === 401) {
            showLogin();
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
            } else if (response.status === 401) {
                showLogin();
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

// Check if device is touch-enabled
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Check auth when page loads
document.addEventListener('DOMContentLoaded', checkAuth);