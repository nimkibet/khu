// Login API - Firebase Admin SDK Backend
require('dotenv').config();
const admin = require('firebase-admin');

// Format the private key - replace escaped newlines with actual newlines
const formattedPrivateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedPrivateKey
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error.message);
  }
}

const db = admin.firestore();

// Handle all requests
module.exports = async (req, res) => {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const { method, body } = req;

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
