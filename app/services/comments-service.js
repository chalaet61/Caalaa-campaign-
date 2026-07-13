/**
 * Comments Service Module
 * Manages comments on posts
 * Firebase SDK v12.16.0 compatible
 */

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  increment,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db, auth } from "./firebase-init.js";

class CommentsService {
  constructor() {
    this.commentsCollection = 'comments';
  }

  /**
   * Add a comment to a post
   */
  async addComment(postId, commentText) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to comment');
      }

      if (!postId || !commentText) {
        throw new Error('Post ID and comment text are required');
      }

      if (commentText.trim().length === 0) {
        throw new Error('Comment cannot be empty');
      }

      if (commentText.length > 1000) {
        throw new Error('Comment cannot exceed 1000 characters');
      }

      // Create comment document
      const commentRef = await addDoc(collection(db, this.commentsCollection), {
        postId: postId,
        authorId: user.uid,
        authorName: user.displayName || user.email,
        text: commentText.trim(),
        likes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✓ Comment added successfully:', commentRef.id);

      // Increment post comments count
      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(1)
      });

      return {
        success: true,
        commentId: commentRef.id,
        message: 'Comment added successfully'
      };
    } catch (error) {
      console.error('✗ Add comment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all comments for a post
   */
  async getPostComments(postId, limitNum = 50) {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }

      const q = query(
        collection(db, this.commentsCollection),
        where('postId', '==', postId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const comments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        comments,
        count: comments.length
      };
    } catch (error) {
      console.error('✗ Get comments error:', error.message);
      return {
        success: false,
        error: error.message,
        comments: [],
        count: 0
      };
    }
  }

  /**
   * Get single comment by ID
   */
  async getComment(commentId) {
    try {
      if (!commentId) {
        throw new Error('Comment ID is required');
      }

      const commentSnap = await getDoc(doc(db, this.commentsCollection, commentId));

      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      return {
        success: true,
        comment: {
          id: commentSnap.id,
          ...commentSnap.data()
        }
      };
    } catch (error) {
      console.error('✗ Get comment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update comment
   */
  async updateComment(commentId, newText) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      if (!commentId || !newText) {
        throw new Error('Comment ID and text are required');
      }

      if (newText.length > 1000) {
        throw new Error('Comment cannot exceed 1000 characters');
      }

      // Get comment to verify ownership
      const commentSnap = await getDoc(doc(db, this.commentsCollection, commentId));
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      if (commentSnap.data().authorId !== user.uid) {
        throw new Error('You can only edit your own comments');
      }

      // Update comment
      await updateDoc(doc(db, this.commentsCollection, commentId), {
        text: newText.trim(),
        updatedAt: serverTimestamp()
      });

      console.log('✓ Comment updated successfully');

      return {
        success: true,
        message: 'Comment updated successfully'
      };
    } catch (error) {
      console.error('✗ Update comment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      if (!commentId) {
        throw new Error('Comment ID is required');
      }

      // Get comment to verify ownership and get postId
      const commentSnap = await getDoc(doc(db, this.commentsCollection, commentId));
      if (!commentSnap.exists()) {
        throw new Error('Comment not found');
      }

      if (commentSnap.data().authorId !== user.uid) {
        throw new Error('You can only delete your own comments');
      }

      const postId = commentSnap.data().postId;

      // Delete comment
      await deleteDoc(doc(db, this.commentsCollection, commentId));

      // Decrement post comments count
      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(-1)
      });

      console.log('✓ Comment deleted successfully');

      return {
        success: true,
        message: 'Comment deleted successfully'
      };
    } catch (error) {
      console.error('✗ Delete comment error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comment count for a post
   */
  async getCommentCount(postId) {
    try {
      const q = query(
        collection(db, this.commentsCollection),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(q);
      return {
        success: true,
        count: querySnapshot.size
      };
    } catch (error) {
      console.error('✗ Get comment count error:', error.message);
      return {
        success: false,
        error: error.message,
        count: 0
      };
    }
  }

  /**
   * Get user's comments
   */
  async getUserComments(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const q = query(
        collection(db, this.commentsCollection),
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const comments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        comments,
        count: comments.length
      };
    } catch (error) {
      console.error('✗ Get user comments error:', error.message);
      return {
        success: false,
        error: error.message,
        comments: [],
        count: 0
      };
    }
  }
}

// Export CommentsService
export const commentsService = new CommentsService();
