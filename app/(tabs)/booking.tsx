import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Booking, BookingService, Room, Service } from '@/types';
import { router } from 'expo-router';
import { Calendar, Clock, MapPin, CreditCard, MessageCircle, AlertTriangle, User, Phone, Mail } from 'lucide-react-native';

export default function BookingScreen() {
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bookingServices, setBookingServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!user) return;

      try {
        // Fetch the most recent booking for the user
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('guest_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (bookingError) {
          console.error('Error fetching booking:', bookingError);
          setLoading(false);
          return;
        }
        
        setBooking(bookingData);
        
        // Fetch room details
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', bookingData.room_id)
          .single();
        
        if (roomError) {
          console.error('Error fetching room:', roomError);
          // Set fallback room data
          setRoom({
            id: bookingData.room_id,
            name: 'Deluxe Room',
            description: 'Comfortable room with modern amenities',
            price_per_night: 299,
            capacity: 2,
            image_urls: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop'],
            amenities: ['Free WiFi', 'Breakfast', 'King Bed']
          });
        } else {
          setRoom(roomData);
        }
        
        // Fetch booking services with service details - FIXED: Show real data
        const { data: servicesData, error: servicesError } = await supabase
          .from('booking_services')
          .select(`
            *,
            service:services(*)
          `)
          .eq('booking_id', bookingData.id);
        
        if (servicesError) {
          console.error('Error fetching booking services:', servicesError);
          setBookingServices([]);
        } else {
          setBookingServices(servicesData || []);
        }

        // Fetch guest details (optional, for completeness)
        const { data: guestData, error: guestError } = await supabase
          .from('guests')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (guestError) {
          console.error('Error fetching guest data:', guestError);
        }
      } catch (error) {
        console.error('Error fetching booking data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateNights = () => {
    if (!booking) return 0;
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // FIXED: Calculate real services total from booking_services
  const calculateServicesTotal = () => {
    return bookingServices.reduce((total, service) => total + (service.price_at_booking || 0), 0);
  };

  // FIXED: Calculate real room total
  const calculateRoomTotal = () => {
    if (!room || !booking) return 0;
    return room.price_per_night * calculateNights();
  };

  // FIXED: Calculate real taxes
  const calculateTaxes = () => {
    return Math.round(calculateRoomTotal() * 0.1);
  };

  // FIXED: Use real total from booking or calculate if not available
  const calculateGrandTotal = () => {
    return booking?.total_amount || (calculateRoomTotal() + calculateServicesTotal() + calculateTaxes());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#8a94a6';
    }
  };

  const handleAddService = () => {
    router.push('/services');
  };

  const handleContactSupport = () => {
    router.push('/chat');
  };

  const handleReportIssue = () => {
    router.push('/complaint');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2b47" />
        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.noBookingContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop' }} 
          style={styles.noBookingImage}
        />
        <Text style={styles.noBookingTitle}>No Active Booking</Text>
        <Text style={styles.noBookingText}>
          You don't have any active bookings at the moment.
        </Text>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/search')}
        >
          <Text style={styles.searchButtonText}>Find a Room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Booking Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Booking #{booking.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.bookingDate}>Booked on {formatDate(booking.created_at)}</Text>
      </View>

      {/* Guest Information */}
      <View style={styles.guestContainer}>
        <Text style={styles.sectionTitle}>Guest Information</Text>
        <View style={styles.guestInfo}>
          <View style={styles.guestItem}>
            <Mail size={16} color="#8a94a6" />
            <Text style={styles.guestText}>{user?.email}</Text>
          </View>
          <View style={styles.guestItem}>
            <User size={16} color="#8a94a6" />
            <Text style={styles.guestText}>{booking.guests_count} {booking.guests_count === 1 ? 'Guest' : 'Guests'}</Text>
          </View>
        </View>
      </View>

      {/* Room Details */}
      {room && (
        <View style={styles.roomContainer}>
          <Image 
            source={{ uri: room.image_urls?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop' }} 
            style={styles.roomImage}
          />
          <View style={styles.roomDetails}>
            <Text style={styles.roomName}>{room.name}</Text>
            <View style={styles.roomInfo}>
              <View style={styles.infoItem}>
                <Calendar size={16} color="#8a94a6" />
                <Text style={styles.infoText}>
                  {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Clock size={16} color="#8a94a6" />
                <Text style={styles.infoText}>{calculateNights()} nights</Text>
              </View>
              <View style={styles.infoItem}>
                <MapPin size={16} color="#8a94a6" />
                <Text style={styles.infoText}>Luxury Hotel</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Booking Services - FIXED: Show real services */}
      <View style={styles.servicesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Services</Text>
          <TouchableOpacity onPress={handleAddService}>
            <Text style={styles.addServiceText}>+ Add Service</Text>
          </TouchableOpacity>
        </View>
        
        {bookingServices.length > 0 ? (
          bookingServices.map((bookingService) => (
            <View key={bookingService.id} style={styles.serviceItem}>
              <Image 
                source={{ uri: bookingService.service?.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop' }} 
                style={styles.serviceImage}
              />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{bookingService.service?.name}</Text>
                <Text style={styles.serviceDescription}>{bookingService.service?.description}</Text>
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceQuantity}>Qty: {bookingService.quantity}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bookingService.status) }]}>
                    <Text style={styles.statusText}>{bookingService.status.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.servicePrice}>${bookingService.price_at_booking || 0}</Text>
            </View>
          ))
        ) : (
          <View style={styles.noServicesContainer}>
            <Text style={styles.noServicesText}>No services added yet</Text>
            <Text style={styles.noServicesSubtext}>
              Enhance your stay with our premium services
            </Text>
          </View>
        )}
      </View>

      {/* Bill Summary - FIXED: Show real data */}
      <View style={styles.billContainer}>
        <Text style={styles.billTitle}>Bill Summary</Text>
        <View style={styles.billItem}>
          <Text style={styles.billItemText}>Room Charge ({calculateNights()} nights)</Text>
          <Text style={styles.billItemAmount}>${calculateRoomTotal()}</Text>
        </View>
        <View style={styles.billItem}>
          <Text style={styles.billItemText}>Services</Text>
          <Text style={styles.billItemAmount}>${calculateServicesTotal()}</Text>
        </View>
        <View style={styles.billItem}>
          <Text style={styles.billItemText}>Taxes & Fees (10%)</Text>
          <Text style={styles.billItemAmount}>${calculateTaxes()}</Text>
        </View>
        <View style={styles.billTotal}>
          <Text style={styles.billTotalText}>Total</Text>
          <Text style={styles.billTotalAmount}>${calculateGrandTotal()}</Text>
        </View>
        <TouchableOpacity style={styles.paymentButton}>
          <CreditCard size={20} color="#fff" />
          <Text style={styles.paymentButtonText}>Payment at Hotel</Text>
        </TouchableOpacity>
      </View>

      {/* Support Options */}
      <View style={styles.supportContainer}>
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={handleContactSupport}
        >
          <MessageCircle size={20} color="#1a2b47" />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.supportButton, styles.reportButton]}
          onPress={handleReportIssue}
        >
          <AlertTriangle size={20} color="#1a2b47" />
          <Text style={styles.supportButtonText}>Report an Issue</Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#8a94a6',
  },
  noBookingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  noBookingImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
  },
  noBookingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 10,
  },
  noBookingText: {
    fontSize: 16,
    color: '#8a94a6',
    textAlign: 'center',
    marginBottom: 30,
  },
  searchButton: {
    backgroundColor: '#1a2b47',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    padding: 20,
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  bookingDate: {
    fontSize: 14,
    color: '#8a94a6',
  },
  guestContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 15,
  },
  guestInfo: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 15,
  },
  guestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  guestText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1a2b47',
  },
  roomContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  roomImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 15,
  },
  roomDetails: {},
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 10,
  },
  roomInfo: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#8a94a6',
  },
  servicesContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addServiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2b47',
  },
  serviceItem: {
    flexDirection: 'row',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 15,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b47',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#8a94a6',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceQuantity: {
    fontSize: 14,
    color: '#8a94a6',
    marginRight: 10,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b47',
    alignSelf: 'center',
    marginLeft: 10,
  },
  noServicesContainer: {
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 30,
  },
  noServicesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a2b47',
    marginBottom: 5,
  },
  noServicesSubtext: {
    fontSize: 14,
    color: '#8a94a6',
    textAlign: 'center',
  },
  billContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  billTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 15,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  billItemText: {
    fontSize: 14,
    color: '#8a94a6',
  },
  billItemAmount: {
    fontSize: 14,
    color: '#1a2b47',
  },
  billTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e1e5eb',
  },
  billTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  billTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  paymentButton: {
    backgroundColor: '#1a2b47',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 15,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  supportContainer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 10,
  },
  reportButton: {
    marginRight: 0,
    marginLeft: 10,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2b47',
    marginLeft: 8,
  },
});