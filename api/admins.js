// Admins API - Firebase Admin SDK Backend
require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse from server.js if available, otherwise initialize)
let firebaseAdmin;
if (admin.apps.length === 0) {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} else {
  firebaseAdmin = admin;
}

const db = firebaseAdmin.firestore();

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// Handle all requests
module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const { method, query, body } = req;

    // GET - Fetch admin by username/password (for login)
    if (method === 'GET') {
      const { username, password } = query;

      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password required' });
      }

      // First check hardcoded admin for backward compatibility
      if (username.toLowerCase() === 'admin' && password === 'admin123') {
        return res.status(200).json({ 
          success: true, 
          data: [{
            id: 'admin001',
            firstName: 'System',
            lastName: 'Admin',
            email: 'admin@khu.ac.ke',
            username: 'admin',
            role: 'superadmin'
          }]
        });
      }

      // Check Firebase admins collection
      const snapshot = await db.collection('admins')
        .where('username', '==', username.toLowerCase())
        .get();

      if (snapshot.empty) {
        return res.status(404).json({ success: false, error: 'Invalid credentials' });
      }

      const admins = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // In production, compare hashed passwords!
        if (data.password === password) {
          admins.push({ id: doc.id, ...data });
        }
      });

      if (admins.length === 0) {
        return res.status(404).json({ success: false, error: 'Invalid credentials' });
      }

      return res.status(200).json({ success: true, data: admins });
    }

    // POST - Create new admin
    if (method === 'POST') {
      const { firstName, lastName, email, username, password, role } = body;

      // Validation
      if (!firstName || !lastName || !email || !username || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
      }

      // Check if username already exists
      const existingSnapshot = await db.collection('admins')
        .where('username', '==', username.toLowerCase())
        .get();

      if (!existingSnapshot.empty) {
        return res.status(400).json({ success: false, error: 'Username already exists' });
      }

      // Check if email already exists
      const emailSnapshot = await db.collection('admins')
        .where('email', '==', email.toLowerCase())
        .get();

      if (!emailSnapshot.empty) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
      }

      const adminData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password: password, // In production, hash this!
        role: role || 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('admins').add(adminData);

      return res.status(201).json({ 
        success: true, 
        message: 'Admin created',
        data: { id: docRef.id, ...adminData }
      });
    }

    // DELETE - Delete an admin
    if (method === 'DELETE') {
      const { id, username } = query;

      if (!id && !username) {
        return res.status(400).json({ success: false, error: 'Admin ID or username required' });
      }

      if (username && username.toLowerCase() === 'admin') {
        return res.status(400).json({ success: false, error: 'Cannot delete super admin' });
      }

      if (id) {
        const doc = await db.collection('admins').doc(id).get();
        if (doc.exists && doc.data().username === 'admin') {
          return res.status(400).json({ success: false, error: 'Cannot delete super admin' });
        }
        await db.collection('admins').doc(id).delete();
      } else {
        const snapshot = await db.collection('admins')
          .where('username', '==', username.toLowerCase())
          .get();
        
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            if (doc.data().username !== 'admin') {
              doc.ref.delete();
            }
          });
        }
      }

      return res.status(200).json({ success: true, message: 'Admin deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Admins API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};
