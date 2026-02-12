// Feed.js - Real-time Student Feed (Twitter-like)
// Uses Firebase onSnapshot for real-time updates

const API_BASE_URL = '/api';

// Firebase configuration (loaded from firebase-config.js)
let firebaseApp;
let db;
let postsUnsubscribe = null;

// Current user state
let currentUser = null;

// DOM Elements
let postsContainer;
let postModal;
let postTextarea;
let charCount;
let postBtn;
let closeModalBtn;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    initializeFeed();
    setupEventListeners();
});

// Initialize Firebase for real-time updates
async function initializeFirebase() {
    try {
        // Wait for Firebase SDK to load
        if (typeof firebase !== 'undefined' && firebase.apps) {
            try {
                if (!firebase.apps.length) {
                    firebaseApp = firebase.initializeApp(firebaseConfig);
                } else {
                    firebaseApp = firebase.app();
                }
                
                db = firebase.firestore();
                console.log('Firebase initialized for real-time feed');
                
                // Start the real-time listener once Firebase is ready
                startRealtimeListener();
            } catch (error) {
                console.log('Firebase initialization error:', error.message);
            }
        } else {
            console.log('Firebase not loaded yet, will retry...');
            // Retry after a short delay
            setTimeout(() => {
                if (typeof firebase !== 'undefined' && firebase.apps) {
                    try {
                        if (!firebase.apps.length) {
                            firebaseApp = firebase.initializeApp(firebaseConfig);
                        } else {
                            firebaseApp = firebase.app();
                        }
                        db = firebase.firestore();
                        console.log('Firebase initialized on retry');
                        startRealtimeListener();
                    } catch (error) {
                        console.log('Firebase retry error:', error.message);
                    }
                }
            }, 1000);
        }
    } catch (error) {
        console.log('Firebase initialization skipped:', error.message);
    }
}

// Initialize feed with real-time listener
async function initializeFeed() {
    postsContainer = document.getElementById('postsContainer');
    postModal = document.getElementById('postModal');
    postTextarea = document.getElementById('postContent');
    charCount = document.getElementById('charCount');
    
    // Get the Post button from the modal (second button is Post)
    const modalButtons = document.querySelectorAll('#postModal button');
    postBtn = modalButtons.length > 1 ? modalButtons[1] : null;
    closeModalBtn = modalButtons.length > 0 ? modalButtons[0] : null;

    // Check if user is logged in
    const savedUser = localStorage.getItem('khu_currentUser') || localStorage.getItem('khu_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updatePostInputPlaceholder();
        } catch (e) {
            console.error('Error parsing user:', e);
        }
    }

    // If Firebase wasn't ready when initializeFirebase ran, try again
    if (db && !postsUnsubscribe) {
        startRealtimeListener();
    } else if (!db) {
        // Fallback: Load posts via API
        setTimeout(() => {
            if (db && !postsUnsubscribe) {
                startRealtimeListener();
            } else {
                fetchPosts();
            }
        }, 2000);
    }
}

// Start Firestore onSnapshot listener for real-time updates
function startRealtimeListener() {
    if (!db) {
        console.log('Firestore not available, using API fallback');
        fetchPosts();
        return;
    }

    if (postsUnsubscribe) {
        postsUnsubscribe(); // Clean up existing listener
    }

    try {
        const { collection, query, orderBy, limit } = firebase.firestore;
        const postsRef = collection(db, 'posts');
        const postsQuery = query(postsRef, orderBy('timestamp', 'desc'), limit(20));

        postsUnsubscribe = onSnapshot(postsQuery, 
            (snapshot) => {
                console.log('Real-time feed update received, docs:', snapshot.size);
                const posts = [];
                
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    // Convert Firestore timestamp to Date
                    let timestamp = data.timestamp;
                    if (timestamp && typeof timestamp.toDate === 'function') {
                        timestamp = timestamp.toDate();
                    } else if (timestamp instanceof Date) {
                        timestamp = timestamp;
                    } else if (typeof timestamp === 'string') {
                        timestamp = new Date(timestamp);
                    } else {
                        timestamp = new Date();
                    }
                    
                    posts.push({
                        id: doc.id,
                        content: data.content,
                        authorName: data.authorName,
                        regNo: data.regNo,
                        timestamp: timestamp,
                        likes: data.likes || 0
                    });
                });

                renderPosts(posts);
            },
            (error) => {
                console.error('Error listening to posts:', error);
                // Fallback to API on error
                fetchPosts();
            }
        );

        console.log('Real-time listener started');
    } catch (error) {
        console.error('Failed to start real-time listener:', error);
        fetchPosts();
    }
}

// Fetch posts via API (fallback or initial load)
async function fetchPosts() {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderPosts(result.data);
        } else {
            throw new Error(result.error || 'Failed to fetch posts');
        }
    } catch (error) {
        console.error('Error fetching posts:', error);
        showEmptyState('Unable to load posts. Please try again later.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Open post modal
    const createPostBtn = document.querySelector('.post-input');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', openPostModal);
    }

    // Character count for post
    if (postTextarea) {
        postTextarea.addEventListener('input', updateCharCount);
    }

    // Submit post
    if (postBtn) {
        postBtn.addEventListener('click', handleCreatePost);
    }

    // Close modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePostModal);
    }

    // Close modal on outside click
    if (postModal) {
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) {
                closePostModal();
            }
        });
    }

    // Enter key to submit post
    if (postTextarea) {
        postTextarea.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreatePost();
            }
        });
    }
}

// Update placeholder with user's name
function updatePostInputPlaceholder() {
    const postInput = document.querySelector('.post-input');
    if (postInput && currentUser) {
        const name = currentUser.firstName || currentUser.name || 'Student';
        postInput.placeholder = `What's on your mind, ${name}?`;
    }
}

// Open post modal
function openPostModal() {
    if (!currentUser) {
        alert('Please login to post!');
        return;
    }
    
    if (postModal) {
        postModal.classList.add('active');
        postTextarea?.focus();
    }
}

// Close post modal
function closePostModal() {
    if (postModal) {
        postModal.classList.remove('active');
        if (postTextarea) {
            postTextarea.value = '';
        }
        updateCharCount();
    }
}

// Update character count
function updateCharCount() {
    if (!postTextarea || !charCount) return;
    
    const length = postTextarea.value.length;
    charCount.textContent = `${length}/280`;
    
    if (length > 280) {
        charCount.style.color = '#e41e3f';
        if (postBtn) postBtn.disabled = true;
    } else if (length > 260) {
        charCount.style.color = '#f39c12';
        if (postBtn) postBtn.disabled = false;
    } else {
        charCount.style.color = '#65676b';
        if (postBtn) postBtn.disabled = false;
    }
}

// Handle create post
async function handleCreatePost() {
    if (!currentUser) {
        alert('Please login to post!');
        return;
    }

    const content = postTextarea?.value?.trim();
    
    if (!content) {
        alert('Please enter some content for your post.');
        return;
    }

    if (content.length > 280) {
        alert('Post must be 280 characters or less.');
        return;
    }

    // Disable button during submission
    if (postBtn) {
        postBtn.disabled = true;
        postBtn.textContent = 'Posting...';
    }

    try {
        const firstName = currentUser.firstName || currentUser.name?.split(' ')[0] || 'Student';
        const lastName = currentUser.lastName || currentUser.name?.split(' ').slice(1).join(' ') || '';
        
        const postData = {
            content: content,
            authorName: `${firstName} ${lastName}`.trim(),
            regNo: currentUser.regNumber || currentUser.regNo || ''
        };

        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        const result = await response.json();

        if (result.success) {
            closePostModal();
            showToast('Post created successfully!', 'success');
        } else {
            throw new Error(result.error || 'Failed to create post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showToast(error.message || 'Failed to create post', 'error');
    } finally {
        if (postBtn) {
            postBtn.disabled = false;
            postBtn.textContent = 'Post';
        }
    }
}

// Render posts to the feed
function renderPosts(posts) {
    if (!postsContainer) return;

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #65676b;">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p>No posts yet. Be the first to share something!</p>
            </div>
        `;
        return;
    }

    postsContainer.innerHTML = posts.map(post => createPostHTML(post)).join('');
}

// Create HTML for a single post
function createPostHTML(post) {
    const timestamp = formatTimestamp(post.timestamp);
    const initials = getInitials(post.authorName);
    
    return `
        <div class="post-card">
            <div class="post-header">
                <div class="user-avatar">${initials}</div>
                <div class="post-info">
                    <h4>${escapeHtml(post.authorName)}</h4>
                    <div class="post-meta">
                        ${post.regNo ? escapeHtml(post.regNo) + ' • ' : ''}${timestamp}
                    </div>
                </div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
        </div>
    `;
}

// Format timestamp to relative time
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    
    let date;
    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        return 'Just now';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Get initials from name
function getInitials(name) {
    if (!name) return '??';
    return name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Show loading state
function showLoading() {
    if (postsContainer) {
        postsContainer.innerHTML = `
            <div class="loading" style="display: flex; justify-content: center; padding: 40px;">
                <div class="spinner"></div>
            </div>
        `;
    }
}

// Show empty state
function showEmptyState(message) {
    if (postsContainer) {
        postsContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #65676b;">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#42b983' : '#e41e3f'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.handleCreatePost = handleCreatePost;
