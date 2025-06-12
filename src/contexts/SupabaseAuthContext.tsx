
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
  signup: (email: string, password: string, profileData: { name: string; gender: string; languages: string[]; location: string; role: string; is_available: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loading: boolean;
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

  const signup = async (email: string, password: string, profileData: { name: string; gender: string; languages: string[]; location: string; role: string; is_available: boolean }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: profileData
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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (!mounted) return;

      setSession(session);
      setCurrentUser(session?.user ?? null);
      
      if (session?.user) {
        try {
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

  // Set up online status tracking
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

      updateOnlineStatus(true);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        updateOnlineStatus(false);
      };
    }
  }, [userProfile]);

  const value = {
    currentUser,
    session,
    userProfile,
    login,
    loginWithGoogle,
    signup,
    logout,
    sendVerificationEmail,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
