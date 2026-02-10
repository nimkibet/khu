// Admin Page JavaScript - Student Management
// Uses Firebase Firestore for data persistence

// API Configuration - Points to local Express server
const API_BASE_URL = '/api';

// Initialize Firebase for direct Firestore access (optional)
let firebaseApp;
let db;

try {
    // Try to initialize Firebase if config is available
    if (typeof firebase !== 'undefined' && 
        import.meta.env?.VITE_FIREBASE_API_KEY && 
        import.meta.env?.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY") {
        
        firebaseApp = firebase.initializeApp({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
        });
        
        db = firebaseApp.firestore();
        console.log('Firebase initialized successfully');
    } else {
        console.log('Firebase not configured - using API only mode');
    }
} catch (error) {
    console.log('Firebase initialization skipped:', error.message);
}

// State
let students = [];
let filteredStudents = [];

// DOM Elements
const addStudentForm = document.getElementById('addStudentForm');
const editStudentForm = document.getElementById('editStudentForm');
const studentList = document.getElementById('studentList');
const searchInput = document.getElementById('searchInput');
const toastContainer = document.getElementById('toastContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchStudents();
    setupEventListeners();
    setAgeRestriction();
});

// Set minimum age of 12 years for date of birth
function setAgeRestriction() {
    const dateOfBirthInput = document.getElementById('dateOfBirth');
    if (dateOfBirthInput) {
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
        dateOfBirthInput.max = minDate.toISOString().split('T')[0];
    }
}

// Event Listeners
function setupEventListeners() {
    // Add Student Form
    addStudentForm.addEventListener('submit', handleAddStudent);
    
    // Edit Student Form
    editStudentForm.addEventListener('submit', handleEditStudent);
    
    // Search
    searchInput.addEventListener('input', handleSearch);
    
    // Phone formatting for Kenyan numbers
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', formatKenyanPhone);
    }
    
    const emergencyPhoneInput = document.getElementById('emergencyContactPhone');
    if (emergencyPhoneInput) {
        emergencyPhoneInput.addEventListener('blur', formatKenyanPhone);
    }
    
    // Close modal on outside click
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeEditModal();
        }
    });
}

// Format Kenyan phone numbers
function formatKenyanPhone(e) {
    const input = e.target;
    let phone = input.value.trim();
    
    if (!phone) return;
    
    // Remove any spaces or dashes
    phone = phone.replace(/[\s-]/g, '');
    
    // Convert 07XX format to +254XX format
    if (/^07\d{8}$/.test(phone)) {
        phone = '+254' + phone.substring(1);
    }
    
    // Validate format
    if (/^\+254\d{9}$/.test(phone)) {
        input.value = phone;
    } else if (!/^\+254/.test(phone) && /^07\d{8}$/.test(phone)) {
        // Already handled above, but keep for safety
        input.value = '+254' + phone.substring(1);
    }
}

// Validate Kenyan phone number
function validateKenyanPhone(phone) {
    if (!phone) return true; // Empty is allowed
    const cleaned = phone.replace(/[\s-]/g, '');
    return /^(\+254\d{9}|07\d{8})$/.test(cleaned);
}

// Validate ID number (alphanumeric, 7-12 characters)
function validateIdNumber(idNumber) {
    if (!idNumber) return false;
    return /^[A-Za-z0-9]{7,12}$/.test(idNumber);
}

// API Functions
async function fetchStudents() {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            students = result.data;
            filteredStudents = [...students];
            renderStudents();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to fetch students');
        }
    } catch (error) {
        console.error('Error fetching students:', error);
        showEmptyState('Unable to load students. Please check your connection.');
    }
}

async function handleAddStudent(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;
    
    try {
        // Get form values
        const idNumber = document.getElementById('idNumber').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const emergencyPhone = document.getElementById('emergencyContactPhone').value.trim();
        
        // Validate ID Number
        if (!validateIdNumber(idNumber)) {
            throw new Error('ID/Birth Certificate Number must be 7-12 alphanumeric characters');
        }
        
        // Validate phone numbers
        if (!validateKenyanPhone(phone)) {
            throw new Error('Please enter a valid Kenyan phone number (+254XXXXXXXXX or 07XXXXXXXX)');
        }
        
        if (!validateKenyanPhone(emergencyPhone)) {
            throw new Error('Please enter a valid Guardian phone number (+254XXXXXXXXX or 07XXXXXXXX)');
        }
        
        const studentData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            regNumber: document.getElementById('regNumber').value.trim().toUpperCase(),
            idNumber: idNumber,
            email: document.getElementById('email').value.trim().toLowerCase(),
            phone: phone,
            course: document.getElementById('course').value,
            yearOfStudy: document.getElementById('yearOfStudy').value,
            dateOfBirth: document.getElementById('dateOfBirth').value,
            gender: document.getElementById('gender').value,
            address: document.getElementById('address').value.trim(),
            emergencyContactName: document.getElementById('emergencyContactName').value.trim(),
            emergencyContactPhone: emergencyPhone,
            username: document.getElementById('regNumber').value.trim().toUpperCase(),
            password: idNumber, // Default password is ID number
            status: 'Active',
            createdBy: 'admin'
        };
        
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Student added successfully! Login credentials: Username=' + studentData.username + ', Password=' + studentData.password, 'success');
            addStudentForm.reset();
            students.unshift(result.data);
            filteredStudents = [...students];
            renderStudents();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to add student');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        showToast(error.message || 'Failed to add student', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleEditStudent(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('editStudentId').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const studentData = {
            firstName: document.getElementById('editFirstName').value.trim(),
            lastName: document.getElementById('editLastName').value.trim(),
            regNumber: document.getElementById('editRegNumber').value.trim().toUpperCase(),
            email: document.getElementById('editEmail').value.trim().toLowerCase(),
            course: document.getElementById('editCourse').value,
            status: document.getElementById('editStatus').value
        };
        
        const response = await fetch(`${API_BASE_URL}/students?id=${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Student updated successfully!', 'success');
            closeEditModal();
            
            // Update local data
            const index = students.findIndex(s => s.id === studentId);
            if (index !== -1) {
                students[index] = { ...students[index], ...studentData };
                filteredStudents = [...students];
                renderStudents();
                updateStats();
            }
        } else {
            throw new Error(result.error || 'Failed to update student');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showToast(error.message || 'Failed to update student', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/students?id=${studentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Student deleted successfully!', 'success');
            students = students.filter(s => s.id !== studentId);
            filteredStudents = [...students];
            renderStudents();
            updateStats();
        } else {
            throw new Error(result.error || 'Failed to delete student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showToast(error.message || 'Failed to delete student', 'error');
    }
}

// UI Functions
function renderStudents() {
    if (filteredStudents.length === 0) {
        showEmptyState('No students found. Add a student to get started.');
        return;
    }
    
    studentList.innerHTML = filteredStudents.map(student => `
        <div class="student-item">
            <div class="student-info">
                <h4>${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</h4>
                <p>${escapeHtml(student.regNumber)} • ${escapeHtml(student.course || 'N/A')}</p>
                <p>${escapeHtml(student.email || 'No email')}</p>
                <span class="status-badge status-${student.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}">
                    ${student.status || 'Active'}
                </span>
            </div>
            <div class="student-actions">
                <button class="btn btn-secondary btn-icon" onclick="openEditModal('${student.id}')">Edit</button>
                <button class="btn btn-danger btn-icon" onclick="deleteStudent('${student.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function showEmptyState(message) {
    studentList.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>${message}</p>
        </div>
    `;
}

function showLoading() {
    studentList.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

function updateStats() {
    const total = students.length;
    const active = students.filter(s => s.status?.toLowerCase() === 'active').length;
    const courses = [...new Set(students.map(s => s.course))].filter(Boolean).length;
    
    document.getElementById('totalStudents').textContent = total;
    document.getElementById('activeStudents').textContent = active;
    document.getElementById('totalCourses').textContent = courses;
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredStudents = [...students];
    } else {
        filteredStudents = students.filter(student => 
            student.firstName?.toLowerCase().includes(searchTerm) ||
            student.lastName?.toLowerCase().includes(searchTerm) ||
            student.regNumber?.toLowerCase().includes(searchTerm) ||
            student.email?.toLowerCase().includes(searchTerm) ||
            student.course?.toLowerCase().includes(searchTerm)
        );
    }
    
    renderStudents();
}

// Modal Functions
function openEditModal(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    document.getElementById('editStudentId').value = studentId;
    document.getElementById('editFirstName').value = student.firstName || '';
    document.getElementById('editLastName').value = student.lastName || '';
    document.getElementById('editRegNumber').value = student.regNumber || '';
    document.getElementById('editEmail').value = student.email || '';
    document.getElementById('editCourse').value = student.course || '';
    document.getElementById('editStatus').value = student.status || 'Active';
    
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : '✕'}</span>
        <span>${escapeHtml(message)}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteStudent = deleteStudent;
