import { ChatWidget } from '@/components/ChatWidget';
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Используем mock версию для Expo Go
import PushNotificationService from "@/services/pushNotificationsMock";


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
      // Регистрируем устройство для push-уведомлений
      PushNotificationService.saveGuestPushToken(user.id);

      // Подписываемся на уведомления о новых сообщениях
      const unsubscribe = PushNotificationService.subscribeToMessages(
        user.id,
        (messageData) => {
          // Переход к чату при получении нового сообщения
          router.push('/chat');
        }
      );

      // Mock notifications are handled internally by pushNotificationsMock
      console.log('📵 Using mock notifications in Expo Go - app will work with Alert-based notifications');

      // Проверяем, было ли приложение открыто через уведомление
      PushNotificationService.getLastNotificationResponse().then(data => {
        if (data?.type === 'new_message') {
          router.push('/chat');
        }
      });

      return () => {
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