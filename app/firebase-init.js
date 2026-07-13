/**
 * Firebase Initialization Module
 * Firebase SDK v12.16.0 with ES6 module imports
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU44rjWS1F_WjcopZ0zSHU5IgDJp1KXFQ",
  authDomain: "caalaa-campaign.firebaseapp.com",
  projectId: "caalaa-campaign",
  storageBucket: "caalaa-campaign.firebasestorage.app",
  messagingSenderId: "351994411691",
  appId: "1:351994411691:web:677bad8cb566f62029d5ee"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log('✓ Firebase initialized successfully');
