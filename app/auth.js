/**
 * Authentication Module
 * Handles user registration, login, logout, and password reset
 * Uses Firebase Authentication v12+
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  /**
   * Initialize auth state listener
   */
  init() {
    window.addEventListener('userLoggedIn', (e) => {
      this.currentUser = e.detail;
    });
    window.addEventListener('userLoggedOut', () => {
      this.currentUser = null;
    });
  }

  /**
   * Register new user with email and password
   * Creates user in Firebase Auth and user document in Firestore
   */
  async register(email, password, username) {
    try {
      if (!email || !password || !username) {
        throw new Error('Email, password, and username are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Create user in Firebase Authentication
      const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      console.log('✓ User created in Firebase Auth:', user.uid);

      // Set username as display name
      await user.updateProfile({
        displayName: username
      });

      console.log('✓ User profile updated with username:', username);

      // Create user document in Firestore
      await window.db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: email,
        username: username,
        displayName: username,
        profileImage: null,
        bio: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        followers: 0,
        following: 0,
        postsCount: 0
      });

      console.log('✓ User document created in Firestore');

      // Send verification email
      await user.sendEmailVerification();
      console.log('✓ Verification email sent');

      return {
        success: true,
        user: user,
        message: 'Registration successful! Check your email to verify your account.'
      };
    } catch (error) {
      console.error('✗ Registration error:', error.message);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
        code: error.code
      };
    }
  }

  /**
   * Login user with email and password
   */
  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      console.log('✓ User logged in:', user.uid);

      // Check if email is verified
      if (!user.emailVerified) {
        console.warn('⚠ Email not verified');
      }

      return {
        success: true,
        user: user,
        emailVerified: user.emailVerified
      };
    } catch (error) {
      console.error('✗ Login error:', error.message);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
        code: error.code
      };
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      await window.auth.signOut();
      console.log('✓ User logged out');
      return { success: true };
    } catch (error) {
      console.error('✗ Logout error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      await window.auth.sendPasswordResetEmail(email);
      console.log('✓ Password reset email sent to:', email);
      return {
        success: true,
        message: 'Password reset email sent. Check your inbox.'
      };
    } catch (error) {
      console.error('✗ Password reset error:', error.message);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
        code: error.code
      };
    }
  }

  /**
   * Resend email verification
   */
  async resendVerificationEmail() {
    try {
      const user = window.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      await user.sendEmailVerification();
      console.log('✓ Verification email resent');
      return {
        success: true,
        message: 'Verification email sent. Check your inbox.'
      };
    } catch (error) {
      console.error('✗ Resend verification error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return window.auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!window.auth.currentUser;
  }

  /**
   * Update user email
   */
  async updateEmail(newEmail) {
    try {
      const user = window.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      await user.updateEmail(newEmail);
      await user.sendEmailVerification();
      console.log('✓ Email updated:', newEmail);
      return {
        success: true,
        message: 'Email updated. Verification email sent.'
      };
    } catch (error) {
      console.error('✗ Update email error:', error.message);
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword) {
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const user = window.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      await user.updatePassword(newPassword);
      console.log('✓ Password updated');
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('✗ Update password error:', error.message);
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  getErrorMessage(code) {
    const errorMap = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/weak-password': 'Password is too weak. Use at least 6 characters',
      'auth/invalid-email': 'Invalid email address',
      'auth/user-not-found': 'User not found',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many failed login attempts. Try again later',
      'auth/user-disabled': 'This account has been disabled',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/invalid-credential': 'Invalid email or password',
      'auth/network-request-failed': 'Network error. Check your connection'
    };

    return errorMap[code] || 'An error occurred. Please try again.';
  }
}

// Create and export AuthService instance
const authService = new AuthService();
window.authService = authService;
