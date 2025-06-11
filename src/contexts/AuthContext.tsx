
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
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getCurrentLocation, Location } from '../utils/geolocation';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
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
  loginWithPhone: (phoneNumber: string) => Promise<string>;
  verifyPhone: (verificationId: string, code: string) => Promise<void>;
  signup: (email: string, password: string, profileData: Omit<UserProfile, 'id' | 'email' | 'isOnline' | 'lastSeen' | 'emailVerified'>) => Promise<void>;
  signupWithPhone: (phoneNumber: string, profileData: Omit<UserProfile, 'id' | 'email' | 'phone' | 'isOnline' | 'lastSeen' | 'emailVerified'>) => Promise<string>;
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

  // Initialize reCAPTCHA for phone auth
  const initializeRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        }
      });
    }
  };

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
      console.log('Starting Google login...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Google login successful:', user.email);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        console.log('New Google user, will need profile setup');
      } else {
        await updateOnlineStatus(user.uid, true);
      }
    } catch (error: any) {
      console.error('Error with Google login:', error);
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Google login is not authorized for this domain. Please add your domain to Firebase Auth settings or use email login.');
      }
      throw error;
    }
  };

  const loginWithPhone = async (phoneNumber: string): Promise<string> => {
    try {
      initializeRecaptcha();
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      return confirmationResult.verificationId;
    } catch (error) {
      console.error('Error with phone login:', error);
      throw error;
    }
  };

  const verifyPhone = async (verificationId: string, code: string) => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await signInWithCredential(auth, credential);
    } catch (error) {
      console.error('Error verifying phone:', error);
      throw error;
    }
  };

  const signupWithPhone = async (phoneNumber: string, profileData: Omit<UserProfile, 'id' | 'email' | 'phone' | 'isOnline' | 'lastSeen' | 'emailVerified'>): Promise<string> => {
    try {
      initializeRecaptcha();
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      
      // Store profile data temporarily
      localStorage.setItem('pendingProfile', JSON.stringify({ ...profileData, phone: phoneNumber }));
      
      return confirmationResult.verificationId;
    } catch (error) {
      console.error('Error with phone signup:', error);
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
    try {
      console.log('Attempting login with email:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', result.user.email);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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
          // Check for pending phone profile
          const pendingProfile = localStorage.getItem('pendingProfile');
          if (pendingProfile && user.phoneNumber) {
            const profileData = JSON.parse(pendingProfile);
            const profile: UserProfile = {
              id: user.uid,
              email: user.email || '',
              phone: user.phoneNumber,
              isOnline: true,
              lastSeen: new Date(),
              emailVerified: true,
              ...profileData
            };
            
            await setDoc(doc(db, 'users', user.uid), {
              ...profile,
              lastSeen: serverTimestamp()
            });
            setUserProfile(profile);
            localStorage.removeItem('pendingProfile');
          } else {
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
              setUserProfile(null);
            }
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

    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    loginWithGoogle,
    loginWithPhone,
    verifyPhone,
    signup,
    signupWithPhone,
    logout,
    updateUserLocation,
    sendVerificationEmail,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <div id="recaptcha-container"></div>
    </AuthContext.Provider>
  );
};
