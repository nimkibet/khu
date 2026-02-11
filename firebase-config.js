// Firebase Configuration for Frontend (Client-side)
// Compatible with regular script tags (not ES modules)

// Get Firebase config from window (set by inline script) or use fallbacks
const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || window.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: window.FIREBASE_AUTH_DOMAIN || window.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: window.FIREBASE_PROJECT_ID || window.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: window.FIREBASE_STORAGE_BUCKET || window.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || window.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: window.FIREBASE_APP_ID || window.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Export for both ES modules and global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
} else {
  window.firebaseConfig = firebaseConfig;
}
