
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getCurrentLocation, Location } from '../utils/geolocation';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  languages: string[];
  location: string | Location;
  role: 'seeker' | 'helper';
  isAvailable?: boolean;
  isOnline?: boolean;
  lastSeen?: Date;
  emailVerified?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, profileData: Omit<UserProfile, 'id' | 'email' | 'isOnline' | 'lastSeen' | 'emailVerified'>) => Promise<void>;
  logout: () => Promise<void>;
  updateUserLocation: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  const updateUserLocation = async () => {
    if (!userProfile) return;

    try {
      const location = await getCurrentLocation();
      await updateDoc(doc(db, 'users', userProfile.id), {
        location: location
      });
      setUserProfile(prev => prev ? { ...prev, location } : null);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isOnline: isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const sendVerificationEmail = async () => {
    if (currentUser && !currentUser.emailVerified) {
      try {
        await sendEmailVerification(currentUser, {
          url: window.location.origin,
          handleCodeInApp: false
        });
      } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
      }
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // For new Google users, we need to create a basic profile
        // The user will need to complete their profile later
        console.log('New Google user, will need profile setup');
      } else {
        // Update online status for existing users
        await updateOnlineStatus(user.uid, true);
      }
    } catch (error) {
      console.error('Error with Google login:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, profileData: Omit<UserProfile, 'id' | 'email' | 'isOnline' | 'lastSeen' | 'emailVerified'>) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Send email verification
    await sendEmailVerification(user, {
      url: window.location.origin,
      handleCodeInApp: false
    });
    
    const profile: UserProfile = {
      id: user.uid,
      email: user.email!,
      isOnline: true,
      lastSeen: new Date(),
      emailVerified: user.emailVerified,
      ...profileData
    };
    
    await setDoc(doc(db, 'users', user.uid), {
      ...profile,
      lastSeen: serverTimestamp()
    });
    setUserProfile(profile);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (userProfile) {
      await updateOnlineStatus(userProfile.id, false);
    }
    await signOut(auth);
    setUserProfile(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email, user?.emailVerified);
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const profile = { ...userDoc.data(), emailVerified: user.emailVerified } as UserProfile;
            setUserProfile(profile);
            await updateOnlineStatus(user.uid, true);
            
            // Update email verification status in Firestore
            if (user.emailVerified !== profile.emailVerified) {
              await updateDoc(doc(db, 'users', user.uid), {
                emailVerified: user.emailVerified
              });
            }
          } else {
            // User exists but no profile (e.g., Google login without profile setup)
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    // Update online status when tab is about to close
    const handleBeforeUnload = () => {
      if (userProfile) {
        updateOnlineStatus(userProfile.id, false);
      }
    };

    const handleVisibilityChange = () => {
      if (userProfile) {
        updateOnlineStatus(userProfile.id, !document.hidden);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userProfile?.id]);

  const value = {
    currentUser,
    userProfile,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateUserLocation,
    sendVerificationEmail,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
