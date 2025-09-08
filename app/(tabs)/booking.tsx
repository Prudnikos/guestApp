import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Booking, BookingService, Room, Service } from '@/types';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function BookingScreen() {
  const auth = useAuth();
  const user = auth?.user;
  const { selectedBookingId } = useLocalSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [bookingServices, setBookingServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingsList, setShowBookingsList] = useState(true);

  useEffect(() => {
    const fetchBookingsData = async () => {
      if (!user) return;

      try {
        // Fetch ALL bookings for the user
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*, rooms:room_id(*)')
          .eq('guest_id', user.id)
          .order('created_at', { ascending: false });
        
        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
          setLoading(false);
          return;
        }
        
        setBookings(bookingsData || []);
        
        // If we have bookings, select the appropriate one
        if (bookingsData && bookingsData.length > 0) {
          let bookingToSelect = bookingsData[0]; // Default to first one
          
          // If selectedBookingId is provided, try to find that booking
          if (selectedBookingId) {
            const specificBooking = bookingsData.find(b => b.id === selectedBookingId);
            if (specificBooking) {
              bookingToSelect = specificBooking;
              setShowBookingsList(false); // Go directly to the specific booking
            }
          }
          
          setSelectedBooking(bookingToSelect);
          fetchBookingDetails(bookingToSelect);
        }
      } catch (error) {
        console.error('Error fetching bookings data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingsData();
    
    // Set up real-time subscription for bookings
    const subscription = supabase
      .channel('bookings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `guest_id=eq.${user?.id}`
      }, (payload) => {
        console.log('Booking update:', payload);
        fetchBookingsData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  const fetchBookingDetails = async (booking: Booking) => {
    if (!booking) return;
    
    try {
      // Fetch room if not already loaded
      if (!booking.rooms) {
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', booking.room_id)
          .single();
        
        setRoom(roomData || {
          id: booking.room_id,
          name: 'Room',
          description: 'Comfortable room',
          price_per_night: 299,
          capacity: 2,
          image_urls: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop'],
          amenities: []
        });
      } else {
        setRoom(booking.rooms);
      }
      
      // Fetch services for this booking
      const { data: servicesData } = await supabase
        .from('booking_services')
        .select('*, service:services(*)')
        .eq('booking_id', booking.id);
      
      setBookingServices(servicesData || []);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateNights = (booking?: Booking) => {
    const b = booking || selectedBooking;
    if (!b) return 0;
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // FIXED: Calculate real services total from booking_services
  const calculateServicesTotal = () => {
    return bookingServices.reduce((total, bookingService) => {
      const price = bookingService.price_at_booking || 0;
      const quantity = bookingService.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  // FIXED: Calculate real room total
  const calculateRoomTotal = () => {
    if (!room || !selectedBooking) return 0;
    return room.price_per_night * calculateNights();
  };

  // FIXED: Calculate real taxes
  const calculateTaxes = () => {
    return Math.round((calculateRoomTotal() + calculateServicesTotal()) * 0.1);
  };

  // FIXED: Use real total from booking or calculate if not available
  const calculateGrandTotal = () => {
    const roomTotal = calculateRoomTotal();
    const servicesTotal = calculateServicesTotal();
    const taxes = calculateTaxes();
    const grandTotal = roomTotal + servicesTotal + taxes;
    return grandTotal;
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
    router.push(`/services?bookingId=${selectedBooking?.id}`);
  };

  const handleContactSupport = () => {
    router.push('/chat');
  };

  const handleReportIssue = () => {
    router.push('/complaint');
  };
  
  const handleDeleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('booking_services')
        .delete()
        .eq('id', serviceId);
      
      if (error) throw error;
      
      // Update local state
      setBookingServices(prev => prev.filter(s => s.id !== serviceId));
      Alert.alert('Success', 'Service removed successfully');
    } catch (error) {
      console.error('Error deleting service:', error);
      Alert.alert('Error', 'Failed to remove service');
    }
  };
  
  const handleEditService = (service: BookingService) => {
    // Navigate to service details page with edit mode
    router.push({
      pathname: '/service-details',
      params: { 
        id: service.service_id,
        bookingId: selectedBooking?.id,
        bookingServiceId: service.id,
        editMode: 'true',
        currentQuantity: service.quantity.toString()
      }
    });
  };
  
  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    fetchBookingDetails(booking);
    setShowBookingsList(false);
  };
  
  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
      
      Alert.alert('Success', 'Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2b47" />
        <Text style={styles.loadingText}>Loading your booking...</Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.noBookingContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop' }} 
          style={styles.noBookingImage}
        />
        <Text style={styles.noBookingTitle}>No Bookings</Text>
        <Text style={styles.noBookingText}>
          You don't have any bookings at the moment.
        </Text>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/(tabs)/search')}
        >
          <Text style={styles.searchButtonText}>Find a Room</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Show list of bookings
  if (showBookingsList || !selectedBooking) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.bookingsListHeader}>
          <Text style={styles.bookingsListTitle}>My Bookings</Text>
          <TouchableOpacity 
            style={styles.newBookingButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newBookingText}>New Booking</Text>
          </TouchableOpacity>
        </View>
        
        {bookings.map((booking) => {
          const roomData = booking.rooms;
          const roomName = roomData?.room_type === 'suite' ? 'Suite' : 
                          roomData?.room_type === 'deluxe' ? 'Deluxe Room' : 
                          roomData?.room_type === 'standard' ? 'Standard Room' : 'Room';
          
          return (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => handleSelectBooking(booking)}
            >
              <View style={styles.bookingCardHeader}>
                <Text style={styles.bookingCardTitle}>{roomName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.bookingCardInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={16} color="#8a94a6" />
                  <Text style={styles.infoText}>
                    {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="time" size={16} color="#8a94a6" />
                  <Text style={styles.infoText}>{calculateNights(booking)} nights</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="person" size={16} color="#8a94a6" />
                  <Text style={styles.infoText}>
                    {booking.guests_count} {booking.guests_count === 1 ? 'Guest' : 'Guests'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.bookingCardFooter}>
                <Text style={styles.bookingCardTotal}>
                  Total: ${
                    // Если цена явно неправильная (меньше 10), умножаем на 100
                    booking.total_amount < 10 ? (booking.total_amount * 100).toFixed(0) : booking.total_amount
                  }
                </Text>
                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert(
                        'Cancel Booking',
                        'Are you sure you want to cancel this booking?',
                        [
                          { text: 'No', style: 'cancel' },
                          { text: 'Yes', onPress: () => handleDeleteBooking(booking.id) }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#F44336" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back button to show all bookings */}
      {bookings.length > 1 && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowBookingsList(true)}
        >
          <Ionicons name="arrow-back" size={20} color="#1a2b47" />
          <Text style={styles.backButtonText}>All Bookings</Text>
        </TouchableOpacity>
      )}
      
      {/* Booking Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Booking #{selectedBooking.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) }]}>
            <Text style={styles.statusText}>{selectedBooking.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.bookingDate}>Booked on {formatDate(selectedBooking.created_at)}</Text>
      </View>

      {/* Guest Information */}
      <View style={styles.guestContainer}>
        <Text style={styles.sectionTitle}>Guest Information</Text>
        <View style={styles.guestInfo}>
          <View style={styles.guestItem}>
            <Ionicons name="mail" size={16} color="#8a94a6" />
            <Text style={styles.guestText}>{user?.email}</Text>
          </View>
          <View style={styles.guestItem}>
            <Ionicons name="person" size={16} color="#8a94a6" />
            <Text style={styles.guestText}>{selectedBooking.guests_count} {selectedBooking.guests_count === 1 ? 'Guest' : 'Guests'}</Text>
          </View>
        </View>
      </View>

      {/* Room Details */}
      {room && (
        <View style={styles.roomContainer}>
          <Image 
            source={{ uri: (() => {
              const imageUrls = typeof room.image_urls === 'string' 
                ? JSON.parse(room.image_urls)?.photos || [] 
                : room.image_urls?.photos || [];
              return imageUrls[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop';
            })() }} 
            style={styles.roomImage}
          />
          <View style={styles.roomDetails}>
            <View style={styles.roomTitleContainer}>
              <Text style={styles.roomName}>
                {room.room_type === 'suite' ? 'Suite' : 
                 room.room_type === 'deluxe' ? 'Deluxe Room' : 
                 room.room_type === 'standard' ? 'Standard Room' : 'Room'}
              </Text>
              {room.room_type && (
                <Text style={styles.roomType}>
                  {room.room_type === 'suite' ? 'Luxury Suite' : 
                   room.room_type === 'deluxe' ? 'Premium Comfort' : 
                   'Classic Accommodation'}
                </Text>
              )}
            </View>
            <View style={styles.roomInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar" size={16} color="#8a94a6" />
                <Text style={styles.infoText}>
                  {formatDate(selectedBooking.check_in)} - {formatDate(selectedBooking.check_out)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time" size={16} color="#8a94a6" />
                <Text style={styles.infoText}>{calculateNights()} nights</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="location" size={16} color="#8a94a6" />
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
                source={{ uri: (() => {
                  // Используем предопределенные изображения для услуг по названию
                  const serviceName = bookingService.service?.name || '';
                  let imageUrl = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop'; // Default spa
                  
                  if (serviceName.toLowerCase().includes('трансфер') || serviceName.toLowerCase().includes('transfer')) {
                    imageUrl = 'https://images.unsplash.com/photo-1556742111-a301076d9d18?q=80&w=2070&auto=format&fit=crop';
                  } else if (serviceName.toLowerCase().includes('парков') || serviceName.toLowerCase().includes('parking')) {
                    imageUrl = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2070&auto=format&fit=crop';
                  } else if (serviceName.toLowerCase().includes('спа') || serviceName.toLowerCase().includes('spa')) {
                    imageUrl = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop';
                  } else if (serviceName.toLowerCase().includes('ужин') || serviceName.toLowerCase().includes('dinner') || serviceName.toLowerCase().includes('романт')) {
                    imageUrl = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop';
                  } else if (serviceName.toLowerCase().includes('завтрак') || serviceName.toLowerCase().includes('breakfast')) {
                    imageUrl = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070&auto=format&fit=crop';
                  } else if (serviceName.toLowerCase().includes('фитнес') || serviceName.toLowerCase().includes('gym')) {
                    imageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop';
                  } else if (serviceName.toLowerCase().includes('прачеч') || serviceName.toLowerCase().includes('laundry')) {
                    imageUrl = 'https://images.unsplash.com/photo-1545173168-9b955fa52e02?q=80&w=2070&auto=format&fit=crop';
                  }
                  
                  return imageUrl;
                })() }} 
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
              <View style={styles.serviceActions}>
                <Text style={styles.servicePrice}>${bookingService.price_at_booking || 0}</Text>
                <View style={styles.serviceButtons}>
                  <TouchableOpacity 
                    style={styles.serviceActionButton}
                    onPress={() => handleEditService(bookingService)}
                  >
                    <Ionicons name="pencil" size={18} color="#1a2b47" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.serviceActionButton, styles.deleteButton]}
                    onPress={() => {
                      Alert.alert(
                        'Remove Service',
                        `Are you sure you want to remove ${bookingService.service?.name}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', onPress: () => handleDeleteService(bookingService.id), style: 'destructive' }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={18} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
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
          <Ionicons name="card" size={20} color="#fff" />
          <Text style={styles.paymentButtonText}>Payment at Hotel</Text>
        </TouchableOpacity>
      </View>

      {/* Support Options */}
      <View style={styles.supportContainer}>
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={handleContactSupport}
        >
          <Ionicons name="chatbubbles" size={20} color="#1a2b47" />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.supportButton, styles.reportButton]}
          onPress={handleReportIssue}
        >
          <Ionicons name="warning" size={20} color="#1a2b47" />
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
  bookingsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  bookingsListTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  newBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2b47',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  newBookingText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: '#f7f9fc',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5eb',
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  bookingCardInfo: {
    gap: 8,
    marginBottom: 15,
  },
  bookingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e5eb',
  },
  bookingCardTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#F44336',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#1a2b47',
    fontWeight: '500',
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
    padding: 4, // Уменьшили с 20 до 4 (на 80%)
    backgroundColor: '#f7f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2, // Уменьшили с 5 до 2 (на 60%)
  },
  statusTitle: {
    fontSize: 12, // Уменьшили с 16 до 12 (на 75%)
    fontWeight: '500', // Менее жирный
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
    fontSize: 10, // Уменьшили с 14 до 10 (на 28%)
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
  roomTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginRight: 8,
  },
  roomType: {
    fontSize: 15,
    color: '#8a94a6',
    fontWeight: '500',
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
  },
  serviceActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  serviceButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  serviceActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
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