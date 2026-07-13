/**
 * Posts Service Module
 * Manages posts creation, reading, updating, and deletion
 * Handles media uploads to Firebase Storage
 * Firebase SDK v12.16.0 compatible
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  getDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject,
  listAll
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

import { db, storage, auth } from "./firebase-init.js";

class PostsService {
  constructor() {
    this.postsCollection = 'posts';
    this.maxImageSize = 10 * 1024 * 1024; // 10MB
    this.maxVideoSize = 100 * 1024 * 1024; // 100MB
  }

  /**
   * Create a new post
   */
  async createPost(postData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated to create posts');
      }

      const { text, mediaFiles } = postData;

      if (!text || text.trim().length === 0) {
        throw new Error('Post text is required');
      }

      if (text.length > 5000) {
        throw new Error('Post text cannot exceed 5000 characters');
      }

      // Upload media files if provided
      let mediaUrls = [];
      if (mediaFiles && mediaFiles.length > 0) {
        mediaUrls = await this.uploadMediaFiles(user.uid, mediaFiles);
      }

      // Create post document
      const postRef = await addDoc(collection(db, this.postsCollection), {
        text: text.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email,
        media: mediaUrls,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✓ Post created successfully:', postRef.id);

      return {
        success: true,
        postId: postRef.id,
        message: 'Post created successfully'
      };
    } catch (error) {
      console.error('✗ Create post error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload media files to Firebase Storage
   */
  async uploadMediaFiles(userId, files) {
    try {
      const uploadedUrls = [];

      for (const file of files) {
        if (!this.isValidMediaFile(file)) {
          console.warn(`⚠ Invalid media file: ${file.name}`);
          continue;
        }

        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `posts/${userId}/${fileName}`;
        const fileRef = ref(storage, filePath);

        console.log(`⏳ Uploading: ${file.name}`);

        // Upload file
        const snapshot = await uploadBytes(fileRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        uploadedUrls.push({
          url: downloadURL,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          name: file.name
        });

        console.log(`✓ Uploaded: ${file.name}`);
      }

      return uploadedUrls;
    } catch (error) {
      console.error('✗ Upload media error:', error.message);
      throw error;
    }
  }

  /**
   * Validate media file
   */
  isValidMediaFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    
    if (!validTypes.includes(file.type)) {
      return false;
    }

    if (file.type.startsWith('image/') && file.size > this.maxImageSize) {
      return false;
    }

    if (file.type.startsWith('video/') && file.size > this.maxVideoSize) {
      return false;
    }

    return true;
  }

  /**
   * Get post by ID
   */
  async getPost(postId) {
    try {
      const postRef = doc(db, this.postsCollection, postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }

      return {
        success: true,
        post: {
          id: postSnap.id,
          ...postSnap.data()
        }
      };
    } catch (error) {
      console.error('✗ Get post error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's posts
   */
  async getUserPosts(userId, limitNum = 20) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const q = query(
        collection(db, this.postsCollection),
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitNum)
      );

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        posts,
        count: posts.length
      };
    } catch (error) {
      console.error('✗ Get user posts error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get feed (posts from followed users)
   */
  async getFeed(followingList, limitNum = 20) {
    try {
      if (!followingList || followingList.length === 0) {
        // If not following anyone, return recent posts
        const q = query(
          collection(db, this.postsCollection),
          orderBy('createdAt', 'desc'),
          limit(limitNum)
        );
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return {
          success: true,
          posts,
          count: posts.length
        };
      }

      // Get posts from followed users
      const q = query(
        collection(db, this.postsCollection),
        where('authorId', 'in', followingList),
        orderBy('createdAt', 'desc'),
        limit(limitNum)
      );

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        posts,
        count: posts.length
      };
    } catch (error) {
      console.error('✗ Get feed error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update post
   */
  async updatePost(postId, updateData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Get post to verify ownership
      const postSnap = await getDoc(doc(db, this.postsCollection, postId));
      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }

      if (postSnap.data().authorId !== user.uid) {
        throw new Error('You can only edit your own posts');
      }

      const allowedFields = ['text'];
      const filteredData = {};

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      filteredData.updatedAt = serverTimestamp();

      await updateDoc(doc(db, this.postsCollection, postId), filteredData);

      console.log('✓ Post updated successfully');

      return {
        success: true,
        message: 'Post updated successfully'
      };
    } catch (error) {
      console.error('✗ Update post error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete post
   */
  async deletePost(postId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Get post to verify ownership
      const postSnap = await getDoc(doc(db, this.postsCollection, postId));
      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }

      if (postSnap.data().authorId !== user.uid) {
        throw new Error('You can only delete your own posts');
      }

      // Delete media files from storage
      const post = postSnap.data();
      if (post.media && post.media.length > 0) {
        await this.deleteMediaFiles(user.uid, postId);
      }

      // Delete post document
      await deleteDoc(doc(db, this.postsCollection, postId));

      console.log('✓ Post deleted successfully');

      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      console.error('✗ Delete post error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete media files from storage
   */
  async deleteMediaFiles(userId, postId) {
    try {
      const folderRef = ref(storage, `posts/${userId}`);
      const files = await listAll(folderRef);

      for (const file of files.items) {
        if (file.name.includes(postId)) {
          await deleteObject(file);
          console.log(`✓ Deleted media: ${file.name}`);
        }
      }
    } catch (error) {
      console.warn('⚠ Could not delete some media files:', error.message);
    }
  }

  /**
   * Increment post stats
   */
  async incrementPostStat(postId, statName, value = 1) {
    try {
      await updateDoc(doc(db, this.postsCollection, postId), {
        [statName]: increment(value)
      });

      console.log(`✓ Updated ${statName} for post`);
      return { success: true };
    } catch (error) {
      console.error('✗ Increment stat error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export PostsService
export const postsService = new PostsService();
