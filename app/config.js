/**
 * Firebase Configuration
 * Replace these values with your Firebase project credentials
 * Get these from: Firebase Console > Project Settings > Your apps
 */

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// This object will be populated after Firebase initialization
let db = null;
let auth = null;
let storage = null;

// Export for use in other modules
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
