import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getRandomColor } from '../utils/colors';
import type { User } from '../types/canvas';

/**
 * Creates a new user profile in Firestore
 */
export const createUserProfile = async (
  userId: string, 
  email: string, 
  displayName?: string
): Promise<User> => {
  try {
    const userProfile: Omit<User, 'id'> = {
      displayName: displayName || email.split('@')[0], // Use email prefix if no display name
      email,
      cursorColor: getRandomColor(),
      createdAt: Date.now(),
    };

    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      ...userProfile,
      createdAt: serverTimestamp(), // Use server timestamp for consistency
    });

    return {
      id: userId,
      ...userProfile,
    };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new Error('Failed to create user profile');
  }
};

/**
 * Gets an existing user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return {
      id: userId,
      displayName: userData.displayName,
      email: userData.email,
      cursorColor: userData.cursorColor,
      createdAt: userData.createdAt?.toMillis?.() || userData.createdAt,
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get user profile');
  }
};

/**
 * Gets or creates a user profile
 */
export const getOrCreateUserProfile = async (
  userId: string,
  email: string,
  displayName?: string
): Promise<User> => {
  try {
    // Try to get existing profile first
    const existingProfile = await getUserProfile(userId);
    
    if (existingProfile) {
      return existingProfile;
    }

    // Create new profile if none exists
    return await createUserProfile(userId, email, displayName);
  } catch (error) {
    console.error('Error getting or creating user profile:', error);
    throw new Error('Failed to get or create user profile');
  }
};
