// KHU Portal - Main Page JavaScript
// Student login and authentication

const API_BASE_URL = '/api';

// Current user state
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    initializeChat();
});

// Check if user is already logged in
function checkLoginStatus() {
    const savedUser = localStorage.getItem('khu_currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showMainContent();
            updateUserDisplay();
        } catch (e) {
            localStorage.removeItem('khu_currentUser');
            showLoginPage();
        }
    } else {
        showLoginPage();
    }
}

// Show main content (hide login page)
function showMainContent() {
    const loginPage = document.getElementById('loginPage');
    const mainHeader = document.querySelector('.header');
    const mainContainer = document.querySelector('.container');
    const floatingLogout = document.getElementById('floatingLogoutBtn');
    
    if (loginPage) loginPage.style.display = 'none';
    if (mainHeader) mainHeader.style.display = 'flex';
    if (mainContainer) mainContainer.style.display = 'grid';
    if (floatingLogout) floatingLogout.style.display = 'flex';
}

// Show login page (hide main content)
function showLoginPage() {
    const loginPage = document.getElementById('loginPage');
    const mainHeader = document.querySelector('.header');
    const mainContainer = document.querySelector('.container');
    const floatingLogout = document.getElementById('floatingLogoutBtn');
    
    if (loginPage) loginPage.style.display = 'flex';
    if (mainHeader) mainHeader.style.display = 'none';
    if (mainContainer) mainContainer.style.display = 'none';
    if (floatingLogout) floatingLogout.style.display = 'none';
}

// Handle login
async function handleLogin() {
    const regNo = document.getElementById('regNo')?.value.trim().toUpperCase();
    const idNumber = document.getElementById('idNumber')?.value.trim();
    const errorMsg = document.getElementById('loginError');
    
    if (!regNo || !idNumber) {
        showLoginError('Please enter both registration number and ID/Birth Certificate number.');
        return;
    }
    
    try {
        // Fetch all students to find matching credentials
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Find student with matching regNumber and idNumber
            const student = result.data.find(s => 
                s.regNumber?.toUpperCase() === regNo && 
                s.idNumber === idNumber
            );
            
            if (student) {
                // Login successful
                currentUser = student;
                localStorage.setItem('khu_currentUser', JSON.stringify(student));
                showMainContent();
                updateUserDisplay();
                errorMsg.style.display = 'none';
                
                // Clear form
                document.getElementById('regNo').value = '';
                document.getElementById('idNumber').value = '';
            } else {
                showLoginError('Invalid registration number or ID/Birth Certificate number.');
            }
        } else {
            showLoginError('Unable to verify credentials. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Connection error. Please check your internet connection.');
    }
}

// Show login error
function showLoginError(message) {
    const errorMsg = document.getElementById('loginError');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
}

// Update user display in sidebar
function updateUserDisplay() {
    const displayName = document.getElementById('displayUserName');
    const displayCourse = document.getElementById('displayUserCourse');
    const postInput = document.querySelector('.post-input');
    const userAvatar = document.querySelector('.user-avatar');
    
    if (currentUser) {
        if (displayName) displayName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
        if (displayCourse) displayCourse.textContent = currentUser.course || 'No course assigned';
        if (postInput) postInput.placeholder = `What's on your mind, ${currentUser.firstName}?`;
        if (userAvatar) {
            const initials = `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`.toUpperCase();
            userAvatar.textContent = initials;
        }
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('khu_currentUser');
        showLoginPage();
    }
}

// Make logout available globally
window.logout = logout;

// Section navigation
function showSection(sectionId, event) {
    // Hide all sections
    document.querySelectorAll('.main-content').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Make showSection available globally
window.showSection = showSection;

// Post modal (placeholder)
function openPostModal() {
    alert('Post functionality would open here. For now, you can write posts when fully logged in!');
}

// Make openPostModal available globally
window.openPostModal = openPostModal;

// AI Chat initialization
function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (chatMessages) {
        // Add welcome message
        chatMessages.innerHTML = `
            <div class="message ai">
                <div class="message-avatar">AI</div>
                <div class="message-bubble">
                    Welcome to Highlands AI! I'm here to help you with any questions about KHU, courses, campus life, or anything else. What would you like to know?
                </div>
            </div>
        `;
    }
    
    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => sendMessage(chatMessages, chatInput));
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage(chatMessages, chatInput);
        });
    }
}

// Send message to AI
function sendMessage(chatMessages, chatInput) {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.innerHTML = `
        <div class="message-bubble">${escapeHtml(message)}</div>
        <div class="message-avatar">${currentUser?.firstName?.[0] || 'U'}</div>
    `;
    chatMessages.appendChild(userMessage);
    
    // Clear input
    chatInput.value = '';
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Simulate AI response (in real app, this would call an AI API)
    setTimeout(() => {
        const aiMessage = document.createElement('div');
        aiMessage.className = 'message ai';
        aiMessage.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-bubble">
                Thanks for your question! This is a demo of the AI chat feature. In a production environment, this would connect to an AI service to provide intelligent responses about KHU, courses, campus information, and more.
            </div>
        `;
        chatMessages.appendChild(aiMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// Utility function
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
