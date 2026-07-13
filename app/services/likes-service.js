/**
 * Likes Service Module
 * Manages likes on posts and comments
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
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db, auth } from "./firebase-init.js";

class LikesService {
  constructor() {
    this.likesCollection = 'likes';
  }

  /**
   * Like a post
   */
  async likePost(postId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to like posts');
      }

      const likeId = `${user.uid}_${postId}`;
      const likeRef = doc(db, this.likesCollection, likeId);

      // Check if already liked
      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        throw new Error('You have already liked this post');
      }

      // Add like
      await setDoc(likeRef, {
        userId: user.uid,
        postId: postId,
        type: 'post',
        createdAt: new Date()
      });

      console.log('✓ Post liked');

      return {
        success: true,
        message: 'Post liked'
      };
    } catch (error) {
      console.error('✗ Like post error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const likeId = `${user.uid}_${postId}`;
      await deleteDoc(doc(db, this.likesCollection, likeId));

      console.log('✓ Post unliked');

      return {
        success: true,
        message: 'Post unliked'
      };
    } catch (error) {
      console.error('✗ Unlike post error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get post likes count
   */
  async getPostLikesCount(postId) {
    try {
      const q = query(
        collection(db, this.likesCollection),
        where('postId', '==', postId),
        where('type', '==', 'post')
      );

      const querySnapshot = await getDocs(q);
      return {
        success: true,
        count: querySnapshot.size
      };
    } catch (error) {
      console.error('✗ Get likes count error:', error.message);
      return {
        success: false,
        error: error.message,
        count: 0
      };
    }
  }

  /**
   * Check if user liked a post
   */
  async isPostLiked(postId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        return {
          success: true,
          liked: false
        };
      }

      const likeId = `${user.uid}_${postId}`;
      const likeSnap = await getDoc(doc(db, this.likesCollection, likeId));

      return {
        success: true,
        liked: likeSnap.exists()
      };
    } catch (error) {
      console.error('✗ Check like error:', error.message);
      return {
        success: false,
        error: error.message,
        liked: false
      };
    }
  }

  /**
   * Get all likes for a post
   */
  async getPostLikes(postId) {
    try {
      const q = query(
        collection(db, this.likesCollection),
        where('postId', '==', postId),
        where('type', '==', 'post')
      );

      const querySnapshot = await getDocs(q);
      const likes = querySnapshot.docs.map(doc => doc.data());

      return {
        success: true,
        likes,
        count: likes.length
      };
    } catch (error) {
      console.error('✗ Get post likes error:', error.message);
      return {
        success: false,
        error: error.message,
        likes: [],
        count: 0
      };
    }
  }

  /**
   * Like a comment
   */
  async likeComment(commentId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to like comments');
      }

      const likeId = `${user.uid}_${commentId}`;
      const likeRef = doc(db, this.likesCollection, likeId);

      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        throw new Error('You have already liked this comment');
      }

      await setDoc(likeRef, {
        userId: user.uid,
        commentId: commentId,
        type: 'comment',
        createdAt: new Date()
      });

      console.log('✓ Comment liked');

      return {
        success: true,
        message: 'Comment liked'
      };
    } catch (error) {
      console.error('✗ Like comment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const likeId = `${user.uid}_${commentId}`;
      await deleteDoc(doc(db, this.likesCollection, likeId));

      console.log('✓ Comment unliked');

      return {
        success: true,
        message: 'Comment unliked'
      };
    } catch (error) {
      console.error('✗ Unlike comment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comment likes count
   */
  async getCommentLikesCount(commentId) {
    try {
      const q = query(
        collection(db, this.likesCollection),
        where('commentId', '==', commentId),
        where('type', '==', 'comment')
      );

      const querySnapshot = await getDocs(q);
      return {
        success: true,
        count: querySnapshot.size
      };
    } catch (error) {
      console.error('✗ Get comment likes count error:', error.message);
      return {
        success: false,
        error: error.message,
        count: 0
      };
    }
  }
}

// Export LikesService
export const likesService = new LikesService();
