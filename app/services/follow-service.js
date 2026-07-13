/**
 * Follow Service Module
 * Manages follow/unfollow relationships between users
 * Firebase SDK v12.16.0 compatible
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db, auth } from "./firebase-init.js";

class FollowService {
  constructor() {
    this.followsCollection = 'follows';
  }

  /**
   * Follow a user
   */
  async followUser(targetUserId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to follow');
      }

      if (user.uid === targetUserId) {
        throw new Error('You cannot follow yourself');
      }

      // Check if already following
      const isFollowing = await this.isFollowing(user.uid, targetUserId);
      if (isFollowing.success && isFollowing.isFollowing) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      const followId = `${user.uid}_${targetUserId}`;
      const followRef = doc(db, this.followsCollection, followId);

      await setDoc(followRef, {
        followerId: user.uid,
        followedId: targetUserId,
        createdAt: serverTimestamp()
      });

      // Update follower's following count
      await updateDoc(doc(db, 'users', user.uid), {
        following: increment(1)
      });

      // Update target user's followers count
      await updateDoc(doc(db, 'users', targetUserId), {
        followers: increment(1)
      });

      console.log('✓ User followed successfully');

      return {
        success: true,
        message: 'User followed successfully'
      };
    } catch (error) {
      console.error('✗ Follow user error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(targetUserId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to unfollow');
      }

      if (user.uid === targetUserId) {
        throw new Error('You cannot unfollow yourself');
      }

      // Check if following
      const isFollowing = await this.isFollowing(user.uid, targetUserId);
      if (!isFollowing.success || !isFollowing.isFollowing) {
        throw new Error('Not following this user');
      }

      // Delete follow relationship
      const followId = `${user.uid}_${targetUserId}`;
      await deleteDoc(doc(db, this.followsCollection, followId));

      // Update follower's following count
      await updateDoc(doc(db, 'users', user.uid), {
        following: increment(-1)
      });

      // Update target user's followers count
      await updateDoc(doc(db, 'users', targetUserId), {
        followers: increment(-1)
      });

      console.log('✓ User unfollowed successfully');

      return {
        success: true,
        message: 'User unfollowed successfully'
      };
    } catch (error) {
      console.error('✗ Unfollow user error:', error.message);
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
      const followId = `${followerId}_${followedId}`;
      const followSnap = await getDoc(doc(db, this.followsCollection, followId));

      return {
        success: true,
        isFollowing: followSnap.exists()
      };
    } catch (error) {
      console.error('✗ Check following error:', error.message);
      return {
        success: false,
        error: error.message,
        isFollowing: false
      };
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const q = query(
        collection(db, this.followsCollection),
        where('followedId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const followers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        followers,
        count: followers.length
      };
    } catch (error) {
      console.error('✗ Get followers error:', error.message);
      return {
        success: false,
        error: error.message,
        followers: [],
        count: 0
      };
    }
  }

  /**
   * Get user's following
   */
  async getFollowing(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const q = query(
        collection(db, this.followsCollection),
        where('followerId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const following = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        following,
        count: following.length
      };
    } catch (error) {
      console.error('✗ Get following error:', error.message);
      return {
        success: false,
        error: error.message,
        following: [],
        count: 0
      };
    }
  }

  /**
   * Get followers count
   */
  async getFollowersCount(userId) {
    try {
      const result = await this.getFollowers(userId);
      return {
        success: true,
        count: result.count
      };
    } catch (error) {
      console.error('✗ Get followers count error:', error.message);
      return {
        success: false,
        error: error.message,
        count: 0
      };
    }
  }

  /**
   * Get following count
   */
  async getFollowingCount(userId) {
    try {
      const result = await this.getFollowing(userId);
      return {
        success: true,
        count: result.count
      };
    } catch (error) {
      console.error('✗ Get following count error:', error.message);
      return {
        success: false,
        error: error.message,
        count: 0
      };
    }
  }

  /**
   * Get list of users being followed by target user
   * Useful for loading feed from followed users
   */
  async getFollowingUserIds(userId) {
    try {
      const result = await this.getFollowing(userId);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const userIds = result.following.map(follow => follow.followedId);

      return {
        success: true,
        userIds,
        count: userIds.length
      };
    } catch (error) {
      console.error('✗ Get following user IDs error:', error.message);
      return {
        success: false,
        error: error.message,
        userIds: [],
        count: 0
      };
    }
  }

  /**
   * Get mutual followers (users who follow each other)
   */
  async getMutualFollowers(userId1, userId2) {
    try {
      const isUser1FollowingUser2 = await this.isFollowing(userId1, userId2);
      const isUser2FollowingUser1 = await this.isFollowing(userId2, userId1);

      const isMutual = isUser1FollowingUser2.isFollowing && isUser2FollowingUser1.isFollowing;

      return {
        success: true,
        isMutual,
        user1FollowsUser2: isUser1FollowingUser2.isFollowing,
        user2FollowsUser1: isUser2FollowingUser1.isFollowing
      };
    } catch (error) {
      console.error('✗ Get mutual followers error:', error.message);
      return {
        success: false,
        error: error.message,
        isMutual: false
      };
    }
  }
}

// Export FollowService
export const followService = new FollowService();
