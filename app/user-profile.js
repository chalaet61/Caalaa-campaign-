/**
 * User Profile Service Module
 * Manages user profiles, images, and stats in Firestore
 * Handles profile picture uploads to Firebase Storage
 */

class UserProfileService {
  constructor() {
    this.defaultProfileImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%239CA3AF%22/%3E%3Ctext x=%2250%22 y=%2250%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22white%22%3E👤%3C/text%3E%3C/svg%3E';
  }

  /**
   * Get user profile by UID
   */
  async getUserProfile(uid) {
    try {
      if (!uid) {
        throw new Error('UID is required');
      }

      const doc = await window.db.collection('users').doc(uid).get();

      if (!doc.exists) {
        throw new Error('User profile not found');
      }

      return {
        success: true,
        data: {
          ...doc.data(),
          id: doc.id
        }
      };
    } catch (error) {
      console.error('✗ Get user profile error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user profile by username
   */
  async getUserProfileByUsername(username) {
    try {
      if (!username) {
        throw new Error('Username is required');
      }

      const snapshot = await window.db
        .collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new Error('User not found');
      }

      const doc = snapshot.docs[0];
      return {
        success: true,
        data: {
          ...doc.data(),
          id: doc.id
        }
      };
    } catch (error) {
      console.error('✗ Get user by username error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user profile
   * Allowed fields: username, displayName, bio, profileImage
   */
  async updateUserProfile(uid, updateData) {
    try {
      if (!uid) {
        throw new Error('UID is required');
      }

      const allowedFields = ['username', 'displayName', 'bio', 'profileImage'];
      const filteredData = {};

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No valid fields to update');
      }

      filteredData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

      await window.db.collection('users').doc(uid).update(filteredData);

      console.log('✓ User profile updated');

      // Also update Firebase Auth display name if username changed
      if (filteredData.username || filteredData.displayName) {
        const currentUser = window.auth.currentUser;
        if (currentUser) {
          await currentUser.updateProfile({
            displayName: filteredData.displayName || filteredData.username
          });
        }
      }

      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('✗ Update user profile error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload profile picture to Firebase Storage
   * Accepts File object from input element
   */
  async uploadProfilePicture(uid, file) {
    try {
      if (!uid || !file) {
        throw new Error('UID and file are required');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB');
      }

      // Create storage reference
      const fileName = `profile_${uid}_${Date.now()}.jpg`;
      const storageRef = window.storage.ref(`profile-pictures/${uid}/${fileName}`);

      console.log('⏳ Uploading profile picture...');

      // Upload file
      const snapshot = await storageRef.put(file);

      console.log('✓ File uploaded successfully');

      // Get download URL
      const downloadURL = await snapshot.ref.getDownloadURL();

      console.log('✓ Download URL obtained');

      // Delete old profile picture if exists
      await this.deleteOldProfilePicture(uid);

      // Update user profile with new image URL
      const updateResult = await this.updateUserProfile(uid, {
        profileImage: downloadURL
      });

      if (!updateResult.success) {
        throw new Error('Failed to update profile with new image');
      }

      return {
        success: true,
        imageUrl: downloadURL,
        message: 'Profile picture uploaded successfully'
      };
    } catch (error) {
      console.error('✗ Upload profile picture error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete old profile picture from storage
   */
  async deleteOldProfilePicture(uid) {
    try {
      const profileRef = window.storage.ref(`profile-pictures/${uid}`);
      const files = await profileRef.listAll();

      for (const file of files.items) {
        await file.delete();
        console.log('✓ Old profile picture deleted');
      }
    } catch (error) {
      console.warn('⚠ Could not delete old profile picture:', error.message);
      // Don't throw - old image may not exist
    }
  }

  /**
   * Get user's posts count
   */
  async getUserPostsCount(uid) {
    try {
      const snapshot = await window.db
        .collection('posts')
        .where('authorId', '==', uid)
        .get();

      return {
        success: true,
        count: snapshot.size
      };
    } catch (error) {
      console.error('✗ Get posts count error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Increment user stats
   */
  async incrementStat(uid, statName, value = 1) {
    try {
      await window.db.collection('users').doc(uid).update({
        [statName]: firebase.firestore.FieldValue.increment(value)
      });

      console.log(`✓ Updated ${statName}`);
      return { success: true };
    } catch (error) {
      console.error(`✗ Increment stat error:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(uid) {
    try {
      const snapshot = await window.db
        .collection('followers')
        .where('followedId', '==', uid)
        .get();

      return {
        success: true,
        count: snapshot.size,
        followers: snapshot.docs.map(doc => doc.data())
      };
    } catch (error) {
      console.error('✗ Get followers error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's following
   */
  async getFollowing(uid) {
    try {
      const snapshot = await window.db
        .collection('followers')
        .where('followerId', '==', uid)
        .get();

      return {
        success: true,
        count: snapshot.size,
        following: snapshot.docs.map(doc => doc.data())
      };
    } catch (error) {
      console.error('✗ Get following error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId, followedId) {
    try {
      const doc = await window.db
        .collection('followers')
        .doc(`${followerId}_${followedId}`)
        .get();

      return {
        success: true,
        isFollowing: doc.exists
      };
    } catch (error) {
      console.error('✗ Check following error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search users by username
   */
  async searchUsers(searchTerm, limit = 10) {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        throw new Error('Search term must be at least 2 characters');
      }

      const snapshot = await window.db
        .collection('users')
        .where('username', '>=', searchTerm.toLowerCase())
        .where('username', '<', searchTerm.toLowerCase() + '\uf8ff')
        .limit(limit)
        .get();

      return {
        success: true,
        results: snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }))
      };
    } catch (error) {
      console.error('✗ Search users error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's public profile data (safe to expose)
   */
  async getPublicProfile(uid) {
    try {
      const profile = await this.getUserProfile(uid);

      if (!profile.success) {
        return profile;
      }

      const publicData = {
        id: profile.data.id,
        username: profile.data.username,
        displayName: profile.data.displayName,
        profileImage: profile.data.profileImage || this.defaultProfileImage,
        bio: profile.data.bio || '',
        followers: profile.data.followers || 0,
        following: profile.data.following || 0,
        postsCount: profile.data.postsCount || 0,
        createdAt: profile.data.createdAt
      };

      return {
        success: true,
        data: publicData
      };
    } catch (error) {
      console.error('✗ Get public profile error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export UserProfileService instance
const userProfileService = new UserProfileService();
window.userProfileService = userProfileService;
