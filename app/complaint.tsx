import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ComplaintScreen() {
  const auth = useAuth();
  const user = auth?.user;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      // First get the active booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        Alert.alert('Error', 'No active booking found. Please book a room first.');
        return;
      }
      
      // Then create the complaint
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          guest_id: user.id,
          booking_id: bookingData.id,
          title: title.trim(),
          description: description.trim(),
          status: 'pending'
        });
      
      if (error) {
        console.error('Error submitting complaint:', error);
        Alert.alert('Error', 'Failed to submit complaint. Please try again.');
        return;
      }
      
      Alert.alert(
        'Complaint Submitted',
        'Thank you for your feedback. Our team will review your complaint and get back to you as soon as possible.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting complaint:', error);
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Report an Issue',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Ionicons name="alert-circle" size={30} color="#ff6b6b" />
          <Text style={styles.headerText}>Report a Problem</Text>
        </View>
        
        <Text style={styles.description}>
          We're sorry you're experiencing an issue. Please provide details below and our team will address it promptly.
        </Text>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Issue Title</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Room cleanliness, Noise complaint"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Please provide details about the issue..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Complaint</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.noteContainer}>
          <Text style={styles.noteTitle}>What happens next?</Text>
          <Text style={styles.noteText}>
            1. Our guest relations team will review your complaint within 2 hours.
          </Text>
          <Text style={styles.noteText}>
            2. You'll receive a notification when we start addressing your issue.
          </Text>
          <Text style={styles.noteText}>
            3. A staff member may contact you for additional information if needed.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.urgentButton}
          onPress={() => Alert.alert(
            'Urgent Assistance',
            'For immediate assistance, please call the front desk by dialing 0 from your room phone.'
          )}
        >
          <Text style={styles.urgentButtonText}>Need Urgent Help?</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    color: '#8a94a6',
    marginBottom: 25,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a2b47',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e1e5eb',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f7f9fc',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e1e5eb',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingTop: 15,
    fontSize: 16,
    backgroundColor: '#f7f9fc',
    minHeight: 150,
  },
  submitButton: {
    backgroundColor: '#1a2b47',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noteContainer: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b47',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 14,
    color: '#8a94a6',
    marginBottom: 8,
    lineHeight: 20,
  },
  urgentButton: {
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  urgentButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '500',
  },
});