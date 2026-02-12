// Login API - Firebase Admin SDK Backend
require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
let firebaseAdmin;
let firebaseInitError = null;
try {
  if (admin.apps.length === 0) {
    console.log('Initializing Firebase Admin SDK...');
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
    
    console.log('Service account project_id:', process.env.FIREBASE_PROJECT_ID);
    
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    firebaseAdmin = admin;
  }
} catch (initError) {
  console.error('Firebase Admin initialization error:', initError);
  firebaseInitError = initError.message || 'Firebase initialization failed';
}

let db = null;
if (!firebaseInitError) {
  try {
    db = firebaseAdmin.firestore();
  } catch (dbError) {
    console.error('Firestore initialization error:', dbError);
    firebaseInitError = dbError.message || 'Firestore initialization failed';
  }
}

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

  // Check if Firebase was initialized successfully
  if (firebaseInitError) {
    console.error('Firebase init error:', firebaseInitError);
    return res.status(500).json({ 
      success: false, 
      error: 'Server configuration error: ' + firebaseInitError 
    });
  }
  
  // Debug: Log environment variables (without exposing sensitive data)
  console.log('FIREBASE_PROJECT_ID set:', !!process.env.FIREBASE_PROJECT_ID);
  console.log('FIREBASE_CLIENT_EMAIL set:', !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log('FIREBASE_DATABASE_URL set:', !!process.env.FIREBASE_DATABASE_URL);
  
  // Parse request body for Vercel serverless functions
  let body = {};
  console.log('req.body:', req.body);
  console.log('req.rawBody:', req.rawBody);
  console.log('req.buffer:', req.buffer);
  
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
  
  console.log('Parsed body:', body);

  try {
    const { method } = req;

    // POST - Login authentication
    if (method === 'POST') {
      const { regNo, idNumber } = body;

      // Validation
      if (!regNo || !idNumber) {
        console.error('Missing credentials - regNo:', regNo, 'idNumber:', idNumber);
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
