// Firebase Configuration for Frontend
// Replace these values with your Firebase project credentials

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// For Vercel deployment, use environment variables
// Add these to your Vercel project settings:
// - VITE_FIREBASE_API_KEY
// - VITE_FIREBASE_AUTH_DOMAIN
// - VITE_FIREBASE_PROJECT_ID
// - VITE_FIREBASE_STORAGE_BUCKET
// - VITE_FIREBASE_MESSAGING_SENDER_ID
// - VITE_FIREBASE_APP_ID

// Export for both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
} else {
  window.firebaseConfig = firebaseConfig;
}
