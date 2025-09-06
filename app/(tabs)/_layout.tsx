import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const auth = useAuth();
  
  // Проверяем, что контекст доступен
  if (!auth) {
    return null;
  }
  
  const { user, loading } = auth;

  // If the user is not logged in, redirect to the login screen
  if (!loading && !user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1a2b47',
        tabBarInactiveTintColor: '#8a94a6',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e1e5eb',
          height: 60,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: '#1a2b47',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          headerTitle: 'Luxury Hotel',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
          headerTitle: 'Find Rooms',
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'My Booking',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-outline" size={24} color={color} />,
          headerTitle: 'My Booking',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}