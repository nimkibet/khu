# Kenya Highlands University Portal - Admin System

This project has been updated with a comprehensive admin panel for student management using Firebase Firestore and Vercel serverless functions.

## 🚀 Quick Start

### 1. Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the steps
   - Name: `khu-portal` (or your preferred name)

2. **Enable Firestore Database**
   - In Firebase Console, go to "Firestore Database"
   - Click "Create database"
   - Start in **Test mode** for development (allows all reads/writes for 30 days)
   - Select a location near your users

3. **Get Firebase Admin SDK Credentials**
   - Go to Project Settings (gear icon)
   - Scroll to "Service accounts"
   - Click "Generate new private key"
   - This will download a JSON file - keep it safe!

4. **Get Firebase Web App Credentials**
   - In Project Settings, scroll to "Your apps"
   - Click the web icon (</>)
   - Register app (give it a name like "KHU Portal")
   - Copy the `firebaseConfig` values

### 2. Vercel Setup

1. **Create Vercel Account**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Sign up with GitHub/GitLab/Bitbucket

2. **Deploy the Project**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Login to Vercel
   vercel login

   # Deploy
   vercel
   ```

3. **Add Environment Variables**
   - In Vercel Dashboard, go to your project
   - Settings → Environment Variables
   - Add all variables from `.env.example`:
     ```
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_PRIVATE_KEY_ID=your-key-id
     FIREBASE_PRIVATE_KEY=your-private-key
     FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
     FIREBASE_CLIENT_ID=...
     FIREBASE_CLIENT_CERT_URL=...
     FIREBASE_DATABASE_URL=...
     
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
     VITE_FIREBASE_APP_ID=1:123456789:web:abc123
     ```

### 3. Local Development

```bash
# Clone and enter directory
cd school-app-main

# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env

# Run locally with Vercel
npm run dev
```

## 📁 Project Structure

```
school-app-main/
├── api/
│   └── students.js          # Serverless API for student CRUD
├── index.html                # Main portal page
├── admin.html                # Admin panel for student management
├── admin.js                  # Admin page JavaScript
├── firebase-config.js        # Firebase configuration
├── vercel.json              # Vercel deployment config
├── package.json             # Node.js dependencies
├── .env.example             # Environment variables template
└── README.md               # This file
```

## 🔧 Features

### Admin Panel (`admin.html`)
- ✅ Add new students with comprehensive information
- ✅ View all students in a searchable list
- ✅ Edit student details
- ✅ Delete students
- ✅ Real-time statistics (total, active, by course)
- ✅ Search by name, registration number, or course

### Student Information Stored
- First Name, Last Name
- Registration Number (unique)
- Email, Phone
- Course/Program
- Year of Study
- Date of Birth, Gender
- Residential Address
- Emergency Contact
- Status (Active/Inactive)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | Get all students |
| POST | `/api/students` | Add new student |
| PUT | `/api/students?id={id}` | Update student |
| DELETE | `/api/students?id={id}` | Delete student |

## 🔒 Security Notes

1. **Firestore Rules** - For production, set up proper security rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /students/{studentId} {
         // Allow read/write only to authenticated admins
         allow read, write: if request.auth != null && request.auth.token.admin == true;
       }
     }
   }
   ```

2. **Environment Variables** - Never commit `.env` files to version control!

3. **CORS** - The API currently allows all origins (`*`). For production, restrict this in `api/students.js`.

## 💰 Cost Estimation

### Firebase Firestore (Free Tier)
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage

### Vercel (Free Tier)
- 100 GB bandwidth/month
- 100 hours serverless functions/month

**This setup is completely FREE for small to medium usage!**

## 🆘 Troubleshooting

### "Firebase not initialized"
- Check your environment variables are set correctly
- Ensure `VITE_FIREBASE_API_KEY` is not "YOUR_API_KEY"

### "Failed to fetch students"
- Check browser console for errors
- Verify Firestore database is created
- Check that you've added environment variables in Vercel

### "Module not found" errors
- Run `npm install` again
- Make sure you're using Node.js 18+ (Vercel's default)

## 📞 Support

For issues with:
- **Firebase**: Check [Firebase Documentation](https://firebase.google.com/docs)
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **This project**: Review the code comments and error messages
