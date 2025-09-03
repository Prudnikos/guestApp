import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Switch, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const auth = useAuth();
  const user = auth?.user;
  const signOut = auth?.signOut;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: async () => {
            if (signOut) {
              await signOut();
            }
          }
        }
      ]
    );
  };

  const navigateToPaymentMethods = () => {
    // In a real app, this would navigate to a payment methods screen
    Alert.alert("Payment Methods", "This feature is coming soon!");
  };

  const navigateToAccountSettings = () => {
    // In a real app, this would navigate to account settings
    Alert.alert("Account Settings", "This feature is coming soon!");
  };

  const navigateToHelp = () => {
    // In a real app, this would navigate to a help center
    Alert.alert("Help Center", "This feature is coming soon!");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop' }} 
            style={styles.profileImage}
          />
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>{user?.email?.split('@')[0] || 'Guest'}</Text>
        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
      </View>

      {/* Settings Sections */}
      <View style={styles.settingsContainer}>
        {/* Account Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={navigateToAccountSettings}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="person" size={20} color="#2196f3" />
              </View>
              <Text style={styles.settingsItemText}>Personal Information</Text>
            </View>
            <Text style={styles.settingsItemAction}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={navigateToPaymentMethods}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="card" size={20} color="#4caf50" />
              </View>
              <Text style={styles.settingsItemText}>Payment Methods</Text>
            </View>
            <Text style={styles.settingsItemAction}>Manage</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#fff3e0' }]}>
                <Ionicons name="settings" size={20} color="#ff9800" />
              </View>
              <Text style={styles.settingsItemText}>Account Settings</Text>
            </View>
            <Text style={styles.settingsItemAction}>View</Text>
          </TouchableOpacity>
        </View>
        
        {/* Notifications Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#e1f5fe' }]}>
                <Ionicons name="notifications" size={20} color="#03a9f4" />
              </View>
              <Text style={styles.settingsItemText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e1e5eb', true: '#1a2b47' }}
              thumbColor="#fff"
            />
          </View>
          
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#e1f5fe' }]}>
                <Ionicons name="notifications" size={20} color="#03a9f4" />
              </View>
              <Text style={styles.settingsItemText}>Email Updates</Text>
            </View>
            <Switch
              value={emailUpdatesEnabled}
              onValueChange={setEmailUpdatesEnabled}
              trackColor={{ false: '#e1e5eb', true: '#1a2b47' }}
              thumbColor="#fff"
            />
          </View>
        </View>
        
        {/* Support Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity 
            style={styles.settingsItem}
            onPress={navigateToHelp}
          >
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#9c27b0" />
              </View>
              <Text style={styles.settingsItemText}>Help Center</Text>
            </View>
            <Text style={styles.settingsItemAction}>Visit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#9c27b0" />
              </View>
              <Text style={styles.settingsItemText}>Terms & Privacy</Text>
            </View>
            <Text style={styles.settingsItemAction}>Read</Text>
          </TouchableOpacity>
        </View>
        
        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
      
      {/* Bottom Spacing */}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a2b47',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8a94a6',
  },
  settingsContainer: {
    padding: 20,
  },
  settingsSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 15,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#1a2b47',
  },
  settingsItemAction: {
    fontSize: 14,
    color: '#8a94a6',
  },
  signOutButton: {
    backgroundColor: '#1a2b47',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8a94a6',
  },
});