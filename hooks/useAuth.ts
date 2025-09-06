import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { router } from 'expo-router';
import PushNotificationService from '@/services/pushNotifications';

const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Session error:', error.message);
        // Очищаем некорректную сессию
        supabase.auth.signOut();
        setUser(null);
      } else if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
        // Регистрируем push токен для существующей сессии
        PushNotificationService.saveGuestPushToken(session.user.id).catch(console.error);
        // Подписываемся на realtime события
        PushNotificationService.subscribeToRealtimeEvents(session.user.id).catch(console.error);
      }
      setLoading(false);
    }).catch((err) => {
      console.warn('Failed to get session:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
          
          // Регистрируем push токен при входе
          if (event === 'SIGNED_IN') {
            console.log('🔔 User signed in, registering push token...');
            try {
              await PushNotificationService.saveGuestPushToken(session.user.id);
              await PushNotificationService.subscribeToRealtimeEvents(session.user.id);
              console.log('✅ Push notifications setup complete');
            } catch (error) {
              console.error('❌ Failed to setup push notifications:', error);
            }
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (!error) {
      router.replace('/login');
    }
    return { error };
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
});

export { AuthProvider, useAuth };