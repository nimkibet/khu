// Posts API - Firebase Admin SDK Backend
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
    console.log("Firebase Admin initialized successfully for Posts API");
  } catch (error) {
    console.error("Firebase initialization error:", error.message);
  }
}

const db = admin.firestore();

// Handle all requests
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const { method, query, body } = req;

    // GET - Fetch posts (most recent 20)
    if (method === 'GET') {
      const limitNum = parseInt(query.limit) || 20;
      const snapshot = await db.collection('posts')
        .orderBy('timestamp', 'desc')
        .limit(limitNum)
        .get();

      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Convert Firestore timestamps to serializable dates
      posts.forEach(post => {
        if (post.timestamp && post.timestamp.toDate) {
          post.timestamp = post.timestamp.toDate().toISOString();
        }
        if (post.createdAt && post.createdAt.toDate) {
          post.createdAt = post.createdAt.toDate().toISOString();
        }
      });

      return res.status(200).json({ success: true, data: posts });
    }

    // POST - Create new post
    if (method === 'POST') {
      const { content, authorName, regNo } = body;

      // Validation
      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, error: 'Post content is required' });
      }

      if (!authorName || !authorName.trim()) {
        return res.status(400).json({ success: false, error: 'Author name is required' });
      }

      const postData = {
        content: content.trim().substring(0, 280), // Limit to 280 chars
        authorName: authorName.trim(),
        regNo: regNo ? regNo.trim().toUpperCase() : '',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('posts').add(postData);

      return res.status(201).json({ 
        success: true, 
        message: 'Post created',
        data: { id: docRef.id, ...postData }
      });
    }

    // DELETE - Delete a post
    if (method === 'DELETE') {
      const { id } = query;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Post ID required' });
      }

      await db.collection('posts').doc(id).delete();

      return res.status(200).json({ success: true, message: 'Post deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Posts API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};
