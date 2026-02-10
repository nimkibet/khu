require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log('Initializing Firebase with project:', process.env.FIREBASE_PROJECT_ID);
  
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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.firestore();

// API Routes
app.all('/api/students', async (req, res) => {
  const { method, query, body } = req;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    if (method === 'GET') {
      const snapshot = await db.collection('students').orderBy('createdAt', 'desc').get();
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ success: true, data: students });
    }

    if (method === 'POST') {
      const studentData = {
        ...body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      const docRef = await db.collection('students').add(studentData);
      return res.status(201).json({ success: true, message: 'Student added', data: { id: docRef.id, ...studentData } });
    }

    if (method === 'PUT') {
      const { id } = query;
      if (!id) return res.status(400).json({ success: false, error: 'Student ID required' });
      const updateData = { ...body, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      await db.collection('students').doc(id).update(updateData);
      return res.status(200).json({ success: true, message: 'Student updated' });
    }

    if (method === 'DELETE') {
      const { id } = query;
      if (!id) return res.status(400).json({ success: false, error: 'Student ID required' });
      await db.collection('students').doc(id).delete();
      return res.status(200).json({ success: true, message: 'Student deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin.html
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
