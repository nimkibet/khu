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
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error.message);
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  const { method, query, body } = req;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // GET - Fetch all students
    if (method === 'GET') {
      const snapshot = await db.collection('students').orderBy('createdAt', 'desc').get();
      const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return res.status(200).json({ success: true, data: students });
    }

    // POST - Add new student
    if (method === 'POST') {
      const studentData = {
        ...body,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('students').add(studentData);
      return res.status(201).json({
        success: true,
        message: 'Student added successfully',
        data: { id: docRef.id, ...studentData }
      });
    }

    // PUT - Update student
    if (method === 'PUT') {
      const { id } = query;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Student ID required' });
      }

      const updateData = {
        ...body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('students').doc(id).update(updateData);
      return res.status(200).json({
        success: true,
        message: 'Student updated successfully'
      });
    }

    // DELETE - Remove student
    if (method === 'DELETE') {
      const { id } = query;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Student ID required' });
      }

      await db.collection('students').doc(id).delete();
      return res.status(200).json({
        success: true,
        message: 'Student deleted successfully'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
