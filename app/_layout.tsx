import { ChatWidget } from '@/components/ChatWidget';
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Используем реальные push уведомления
import PushNotificationService from "@/services/pushNotifications";
import * as Notifications from 'expo-notifications';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const auth = useAuth();
  
  // Handle case where auth might be undefined during initialization
  if (!auth) {
    return null;
  }
  
  const { user } = auth;

  useEffect(() => {
    if (user?.id) {
      console.log('🔔 Setting up push notifications for user:', user.id);
      
      // Настраиваем обработчик входящих уведомлений
      const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('📨 Notification received:', notification);
        PushNotificationService.handleIncomingNotification(notification);
      });

      // Настраиваем обработчик нажатий на уведомления
      const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('👆 Notification clicked:', response);
        PushNotificationService.handleNotificationResponse(response);
        
        // Переход к нужному экрану в зависимости от типа уведомления
        const data = response.notification.request.content.data;
        if (data?.type === 'new_message' && data?.conversationId) {
          router.push('/chat');
        } else if (data?.type === 'booking_confirmed') {
          router.push('/(tabs)/booking');
        }
      });

      // Подписываемся на уведомления о новых сообщениях
      const unsubscribe = PushNotificationService.subscribeToMessages(
        user.id,
        (messageData) => {
          console.log('💬 New message data:', messageData);
          // Переход к чату при получении нового сообщения
          if (messageData?.conversationId) {
            router.push('/chat');
          }
        }
      );

      // Проверяем, было ли приложение открыто через уведомление
      PushNotificationService.getLastNotificationResponse().then(data => {
        console.log('📱 Last notification response:', data);
        if (data?.type === 'new_message') {
          router.push('/chat');
        } else if (data?.type === 'booking_confirmed') {
          router.push('/(tabs)/booking');
        }
      });

      return () => {
        notificationListener.remove();
        responseListener.remove();
        unsubscribe();
      };
    }
  }, [user?.id]);

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <ChatWidget />
    </>
  );
}