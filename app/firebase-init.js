/**
 * Firebase Initialization Module
 * Loads Firebase SDK v12+ and initializes services
 * This must run before any other Firebase code
 */

// Load Firebase SDK v12+ from CDN
async function initializeFirebase() {
  try {
    // Firebase SDK scripts - v12+
    const scripts = [
      'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js',
      'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js',
      'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js',
      'https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js'
    ];

    // Load all Firebase scripts
    for (const src of scripts) {
      await loadScript(src);
    }

    console.log('✓ Firebase SDK loaded successfully');

    // Initialize Firebase with config from config.js
    const app = firebase.initializeApp(window.FIREBASE_CONFIG);
    console.log('✓ Firebase app initialized');

    // Get services
    window.auth = firebase.auth(app);
    window.db = firebase.firestore(app);
    window.storage = firebase.storage(app);

    console.log('✓ Firebase Authentication initialized');
    console.log('✓ Firestore Database initialized');
    console.log('✓ Firebase Storage initialized');

    // Set up auth state listener
    firebase.auth(app).onAuthStateChanged((user) => {
      if (user) {
        console.log('✓ User authenticated:', user.email);
        window.currentUser = user;
        // Dispatch custom event for auth state change
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
      } else {
        console.log('✓ User not authenticated');
        window.currentUser = null;
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
      }
    });

    return { app, auth: window.auth, db: window.db, storage: window.storage };
  } catch (error) {
    console.error('✗ Firebase initialization failed:', error);
    throw error;
  }
}

/**
 * Helper function to load scripts dynamically
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Initialize Firebase when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  initializeFirebase();
}
