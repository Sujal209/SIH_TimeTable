import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { User, AuthContextType, RegisterFormData } from '../types';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Try to get user data from Supabase
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', firebaseUser.uid)
            .single();

          if (data) {
            // User exists in Supabase
            setUser(data);
          } else {
            // User doesn't exist in Supabase, create minimal user object from Firebase
            console.warn('User not found in Supabase, using Firebase data');
            const firebaseUser = auth.currentUser;
            if (firebaseUser) {
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'User',
                role: 'admin', // Default for now
                department: null,
                phone: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          // Fallback: use Firebase user data
          const firebaseUser = auth.currentUser;
          if (firebaseUser) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              role: 'admin',
              department: null,
              phone: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Successfully signed in!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData: RegisterFormData) => {
    try {
      setLoading(true);
      
      // Create Firebase user
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Update Firebase user profile
      await updateProfile(firebaseUser, {
        displayName: userData.name,
      });

      // Firebase user created successfully, now create Supabase record

      // Create user record in Supabase
      const { error: supabaseError } = await supabase
        .from('users')
        .insert({
          id: firebaseUser.uid,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          department: userData.department,
        });

      if (supabaseError) {
        console.error('Supabase user creation error:', supabaseError);
        throw supabaseError;
      }

      // If user is a teacher, create teacher record
      if (userData.role === 'teacher') {
        const { error: teacherError } = await supabase
          .from('teachers')
          .insert({
            user_id: firebaseUser.uid,
            name: userData.name,
            email: userData.email,
            department: userData.department || '',
            max_hours_per_day: 8,
            unavailable_slots: [],
            preferences: {
              preferred_time_slots: [],
              max_consecutive_hours: 3,
              preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              break_duration: 15,
            },
          });

        if (teacherError) {
          console.error('Teacher creation error:', teacherError);
          throw teacherError;
        }
      }

      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      toast.success('Successfully signed out!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};