import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  userProfile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<string>;
  verifyPhone: (token: string) => Promise<void>;
  signup: (email: string, password: string, profileData: Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>) => Promise<void>;
  signupWithPhone: (phoneNumber: string, profileData: Omit<Profile, 'id' | 'email' | 'phone' | 'created_at' | 'updated_at'>) => Promise<string>;
  logout: () => Promise<void>;
  updateUserLocation: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
  forgotPassword: (email: string) => Promise<void>; // <-- Add forgotPassword to AuthContextType
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUserLocation = async () => {
    if (!userProfile) return;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const location = `${position.coords.latitude}, ${position.coords.longitude}`;
      
      const { error } = await supabase
        .from('profiles')
        .update({ location })
        .eq('id', userProfile.id);

      if (error) throw error;
      
      setUserProfile(prev => prev ? { ...prev, location } : null);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const sendVerificationEmail = async () => {
    if (currentUser && !currentUser.email_confirmed_at) {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: currentUser.email!,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error sending reset password email:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Error with Google login:', error);
      throw error;
    }
  };

  const loginWithPhone = async (phoneNumber: string): Promise<string> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber
      });
      if (error) throw error;
      return 'OTP sent successfully';
    } catch (error) {
      console.error('Error with phone login:', error);
      throw error;
    }
  };

  const verifyPhone = async (token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: session?.user?.phone || '',
        token,
        type: 'sms'
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error verifying phone:', error);
      throw error;
    }
  };

  const signupWithPhone = async (phoneNumber: string, profileData: Omit<Profile, 'id' | 'email' | 'phone' | 'created_at' | 'updated_at'>): Promise<string> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber
      });
      if (error) throw error;
      
      localStorage.setItem('pendingProfile', JSON.stringify({ ...profileData, phone: phoneNumber }));
      
      return 'OTP sent successfully';
    } catch (error) {
      console.error('Error with phone signup:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, profileData: Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          ...profileData,
          name: profileData.name,
          gender: profileData.gender,
          languages: profileData.languages,
          location: profileData.location,
          role: profileData.role,
          isAvailable: profileData.is_available
        }
      }
    });
    
    if (error) throw error;
  };

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (userProfile) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', userProfile.id);
    }
    await supabase.auth.signOut();
    setUserProfile(null);
  };

<<<<<<< HEAD
  // Add forgot password function
  const forgotPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

=======
  // Set up online status tracking
>>>>>>> 9eb4fc6190986383f49780a90c8ae02973e9539d
  useEffect(() => {
    const updateOnlineStatus = async (isOnline: boolean) => {
      if (userProfile) {
        await supabase
          .from('profiles')
          .update({ 
            is_online: isOnline, 
            last_seen: new Date().toISOString() 
          })
          .eq('id', userProfile.id);
      }
    };

    const handleOnline = () => updateOnlineStatus(true);
    const handleOffline = () => updateOnlineStatus(false);
    const handleBeforeUnload = () => updateOnlineStatus(false);

    if (userProfile) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Set online when component mounts
      updateOnlineStatus(true);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        updateOnlineStatus(false);
      };
    }
  }, [userProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (mounted) setLoading(false);
          return;
        }
        
        console.log('Initial session:', initialSession?.user?.email);
        
        if (mounted) {
          setSession(initialSession);
          setCurrentUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            console.log('Fetching profile for user:', initialSession.user.id);
            
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', initialSession.user.id)
              .single();

            console.log('Profile fetch result:', { profile, error: profileError });

            if (mounted) {
              if (profileError) {
                console.error('Profile fetch error:', profileError);
                if (profileError.code === 'PGRST116') {
                  console.log('No profile found for user');
                }
              } else if (profile) {
                console.log('Profile loaded successfully:', profile.name);
                setUserProfile(profile);
              }
            }
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (!mounted) return;

      setSession(session);
      setCurrentUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          const pendingProfile = localStorage.getItem('pendingProfile');
          if (pendingProfile && session.user.phone) {
            const profileData = JSON.parse(pendingProfile);
            localStorage.removeItem('pendingProfile');
          }

          console.log('Fetching profile after auth change for:', session.user.id);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          console.log('Profile fetch after auth change:', { profile, error });

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          } else if (profile) {
            console.log('Setting profile:', profile.name);
            setUserProfile(profile);
          } else {
            console.log('No profile found, keeping null');
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      } else {
        console.log('No user, clearing profile');
        setUserProfile(null);
      }
      
      // Set loading to false after handling auth state change
      if (event !== 'INITIAL_SESSION') {
        setLoading(false);
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    session,
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
<<<<<<< HEAD
    loading,
    forgotPassword // add to context
=======
    resetPassword,
    loading
>>>>>>> 9eb4fc6190986383f49780a90c8ae02973e9539d
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
