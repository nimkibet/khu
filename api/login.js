i// Login API - Firebase Admin SDK Backend
require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// Handle all requests
module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // Parse request body for Vercel serverless functions
  let body = {};
  if (req.body) {
    body = req.body;
  } else if (req.rawBody) {
    // Fallback for different Vercel versions
    try {
      body = JSON.parse(req.rawBody);
    } catch (e) {
      console.error('Failed to parse rawBody:', e);
    }
  } else if (req.buffer) {
    // Another Vercel body parsing approach
    try {
      body = typeof req.buffer === 'string' ? JSON.parse(req.buffer) : req.buffer;
    } catch (e) {
      console.error('Failed to parse buffer:', e);
    }
  }

  // Debug logging
  console.log('Request method:', req.method);
  console.log('Request body:', body);

  try {
    const { method } = req;

    // POST - Login authentication
    if (method === 'POST') {
      const { regNo, idNumber } = body;

      // Validation
      if (!regNo || !idNumber) {
        return res.status(400).json({ 
          success: false, 
          error: 'Registration number and ID number are required' 
        });
      }

      const regNoUpper = regNo.trim().toUpperCase();

      // Check hardcoded admin first (backward compatibility)
      if (regNoUpper === 'ADMIN' && idNumber === 'admin123') {
        return res.status(200).json({
          success: true,
          user: {
            id: 'admin',
            firstName: 'Admin',
            lastName: 'Administrator',
            regNumber: 'ADMIN',
            email: 'admin@khu.ac.ke',
            course: 'Administrator',
            isAdmin: true
          }
        });
      }

      // Query Firestore students collection
      const snapshot = await db.collection('students')
        .where('regNumber', '==', regNoUpper)
        .get();

      if (snapshot.empty) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid registration number or ID' 
        });
      }

      // Find matching student with correct ID number
      let matchedStudent = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        // Compare idNumber (password)
        if (data.idNumber === idNumber.trim()) {
          matchedStudent = { id: doc.id, ...data };
        }
      });

      if (!matchedStudent) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid registration number or ID' 
        });
      }

      // Return user profile (exclude sensitive data)
      return res.status(200).json({
        success: true,
        user: {
          id: matchedStudent.id,
          firstName: matchedStudent.firstName,
          lastName: matchedStudent.lastName,
          regNumber: matchedStudent.regNumber,
          email: matchedStudent.email,
          course: matchedStudent.course,
          yearOfStudy: matchedStudent.yearOfStudy,
          isAdmin: false
        }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Login API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};
