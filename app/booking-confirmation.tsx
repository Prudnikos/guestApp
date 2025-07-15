import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Calendar, Users, CreditCard, User, Phone, Mail } from 'lucide-react-native';

export default function BookingConfirmationScreen() {
  const { roomId, checkIn, checkOut, guests, roomName, pricePerNight, totalPrice } = useLocalSearchParams();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateNights = () => {
    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleConfirmBooking = async () => {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Update/create guest profile with full data
      const { error: profileError } = await supabase
        .from('guests')
        .upsert({ 
          id: user.id, 
          email: user.email,
          full_name: fullName.trim(),
          phone: phone.trim()
        });

      if (profileError) {
        console.error('Error updating guest profile:', profileError);
        throw new Error('Failed to update guest profile');
      }

      // Step 2: Create booking with source field
      const bookingData = {
        guest_id: user.id,
        room_id: parseInt(roomId as string),
        check_in: new Date(checkIn as string).toISOString().split('T')[0],
        check_out: new Date(checkOut as string).toISOString().split('T')[0],
        guests_count: parseInt(guests as string),
        total_amount: parseFloat(totalPrice as string),
        status: 'confirmed',
        source: 'guest_app' // Key addition as requested
      };

      console.log('Creating booking with data:', bookingData);

      const { data, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();
      
      if (bookingError) {
        console.error('Supabase booking error:', bookingError);
        throw new Error(bookingError.message || 'Failed to create booking');
      }
      
      if (!data) {
        throw new Error('No booking data returned');
      }

      console.log('Booking created successfully:', data);
      
      // IMPROVED: Better success handling with navigation to My Bookings
      Alert.alert(
        'Booking Confirmed!',
        `Your room "${roomName}" has been successfully booked for ${formatDate(checkIn as string)} - ${formatDate(checkOut as string)}. You can view your booking details in the My Booking tab.`,
        [
          {
            text: 'View My Booking',
            onPress: () => router.replace('/(tabs)/booking')
          }
        ]
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert(
        'Booking Error', 
        `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Confirm Booking',
          headerBackTitle: 'Back',
        }}
      />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Booking Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            
            <View style={styles.roomInfo}>
              <Text style={styles.roomName}>{roomName}</Text>
              <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                  <Calendar size={16} color="#8a94a6" />
                  <Text style={styles.detailText}>
                    {formatDate(checkIn as string)} - {formatDate(checkOut as string)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Users size={16} color="#8a94a6" />
                  <Text style={styles.detailText}>
                    {guests} {parseInt(guests as string) === 1 ? 'Guest' : 'Guests'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>${pricePerNight} x {calculateNights()} nights</Text>
                <Text style={styles.priceValue}>${parseInt(pricePerNight as string) * calculateNights()}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Taxes & fees (10%)</Text>
                <Text style={styles.priceValue}>${Math.round(parseInt(pricePerNight as string) * calculateNights() * 0.1)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${totalPrice}</Text>
              </View>
            </View>
          </View>
          
          {/* Guest Information Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Guest Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#8a94a6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color="#8a94a6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, styles.disabledInput]}>
                <Mail size={20} color="#8a94a6" />
                <TextInput
                  style={[styles.input, styles.disabledInputText]}
                  value={user?.email || ''}
                  editable={false}
                />
              </View>
              <Text style={styles.helperText}>Email is automatically filled from your account</Text>
            </View>
          </View>
          
          {/* Payment Information */}
          <View style={styles.paymentContainer}>
            <View style={styles.paymentHeader}>
              <CreditCard size={20} color="#1a2b47" />
              <Text style={styles.paymentTitle}>Payment</Text>
            </View>
            <Text style={styles.paymentText}>
              Payment will be processed at the hotel during check-in. 
              We accept all major credit cards and cash.
            </Text>
          </View>
          
          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By confirming this booking, you agree to our terms and conditions. 
              Cancellation is free up to 24 hours before check-in.
            </Text>
          </View>
        </ScrollView>
        
        {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirmBooking}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 15,
  },
  roomInfo: {
    marginBottom: 20,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b47',
    marginBottom: 10,
  },
  bookingDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#8a94a6',
  },
  priceBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: '#8a94a6',
  },
  priceValue: {
    fontSize: 14,
    color: '#1a2b47',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e1e5eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2b47',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#e1e5eb',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f7f9fc',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1a2b47',
  },
  disabledInputText: {
    color: '#8a94a6',
  },
  helperText: {
    fontSize: 12,
    color: '#8a94a6',
    marginTop: 5,
  },
  paymentContainer: {
    padding: 20,
    backgroundColor: '#f7f9fc',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b47',
    marginLeft: 10,
  },
  paymentText: {
    fontSize: 14,
    color: '#8a94a6',
    lineHeight: 20,
  },
  termsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  termsText: {
    fontSize: 12,
    color: '#8a94a6',
    lineHeight: 18,
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5eb',
  },
  confirmButton: {
    backgroundColor: '#1a2b47',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});