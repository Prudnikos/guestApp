import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Room } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';

const { width } = Dimensions.get('window');

export default function RoomDetailsScreen() {
  const { id, checkIn, checkOut, guests } = useLocalSearchParams();
  const auth = useAuth();
  const user = auth?.user;
  const [room, setRoom] = useState<Room | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(
    checkIn ? new Date(checkIn as string) : null
  );
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(
    checkOut ? new Date(checkOut as string) : null
  );
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [selectionStep, setSelectionStep] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState(Number(guests) || 2);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        console.log('Fetching room with ID:', id);
        
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Supabase room fetch error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Set fallback room data if database fails
          console.log('Using fallback room data due to Supabase error');
          setFallbackRoom();
          return;
        }

        if (!data) {
          console.log('No room data returned from Supabase, using fallback');
          setFallbackRoom();
          return;
        }

        console.log('Room data fetched successfully:', data);
        console.log('Room image_urls type:', typeof data.image_urls);
        console.log('Room image_urls content:', data.image_urls);
        setRoom(data);
      } catch (error) {
        console.error('Unexpected error fetching room:', {
          error: error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // Set fallback room data for any unexpected errors
        setFallbackRoom();
      } finally {
        setLoading(false);
      }
    };

    const setFallbackRoom = () => {
      setRoom({
        id: parseInt(id as string) || 1,
        name: 'Deluxe Room',
        description: 'Comfortable and spacious room with modern amenities and beautiful views. Perfect for a relaxing stay with all the comforts you need.',
        price_per_night: 299,
        capacity: 2,
        image_urls: JSON.stringify({
          photos: [
            'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2070&auto=format&fit=crop'
          ]
        }),
        amenities: ['Free WiFi', 'Breakfast Included', 'King Size Bed', 'Ocean View', 'Air Conditioning', 'Mini Bar']
      });
    };

    if (id) {
      fetchRoom();
      fetchBookedDates();
    } else {
      console.error('No room ID provided');
      setLoading(false);
    }
  }, [id]);

  // Fetch booked dates for this room
  const fetchBookedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('check_in, check_out')
        .eq('room_id', id)
        .in('status', ['confirmed', 'pending']);
      
      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      // Convert bookings to array of booked dates
      const dates: string[] = [];
      data?.forEach(booking => {
        const start = new Date(booking.check_in);
        const end = new Date(booking.check_out);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
      });
      
      setBookedDates(dates);
      console.log('Booked dates for room:', dates);
    } catch (error) {
      console.error('Error fetching booked dates:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2b47" />
        <Text style={styles.loadingText}>Loading room details...</Text>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Room not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextImage = () => {
    const imageUrls = (() => {
      if (typeof room.image_urls === 'string') {
        const parsed = JSON.parse(room.image_urls);
        return parsed?.photos || [];
      }
      return room.image_urls || [];
    })();
    
    if (imageUrls && currentImageIndex < imageUrls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else {
      setCurrentImageIndex(0);
    }
  };

  const prevImage = () => {
    const imageUrls = (() => {
      if (typeof room.image_urls === 'string') {
        const parsed = JSON.parse(room.image_urls);
        return parsed?.photos || [];
      }
      return room.image_urls || [];
    })();
    
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (imageUrls) {
      setCurrentImageIndex(imageUrls.length - 1);
    }
  };

  const calculateNights = () => {
    if (selectedCheckIn && selectedCheckOut) {
      const diffTime = Math.abs(selectedCheckOut.getTime() - selectedCheckIn.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    if (!checkIn || !checkOut) return 1;
    
    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const onDayPress = (day: DateData) => {
    const selectedDate = new Date(day.timestamp);
    const dateStr = day.dateString;
    
    // Check if date is booked
    if (bookedDates.includes(dateStr)) {
      return; // Don't allow selection of booked dates
    }
    
    if (selectionStep === 'checkIn' || !selectedCheckIn || selectedDate <= selectedCheckIn) {
      setSelectedCheckIn(selectedDate);
      setSelectedCheckOut(null);
      setSelectionStep('checkOut');
    } else {
      setSelectedCheckOut(selectedDate);
      setSelectionStep('checkIn');
      setCalendarVisible(false);
    }
  };

  const getMarkedDates = () => {
    const marked: { [key: string]: any } = {};
    
    // Mark booked dates
    bookedDates.forEach(date => {
      marked[date] = { 
        disabled: true, 
        disableTouchEvent: true,
        color: '#ffcccc',
        textColor: '#999999'
      };
    });
    
    // Mark selected dates
    if (selectedCheckIn) {
      const startStr = selectedCheckIn.toISOString().split('T')[0];
      marked[startStr] = { 
        ...marked[startStr],
        startingDay: true, 
        color: '#1a2b47', 
        textColor: 'white' 
      };
      
      if (selectedCheckOut) {
        const endStr = selectedCheckOut.toISOString().split('T')[0];
        
        // Mark range between check-in and check-out
        for (let d = new Date(selectedCheckIn); d <= selectedCheckOut; d.setDate(d.getDate() + 1)) {
          const dStr = d.toISOString().split('T')[0];
          if (!bookedDates.includes(dStr)) {
            marked[dStr] = { 
              ...marked[dStr],
              color: marked[dStr]?.startingDay ? '#1a2b47' : '#dbeafe', 
              textColor: marked[dStr]?.startingDay ? 'white' : '#1a2b47' 
            };
          }
        }
        
        marked[endStr] = { 
          ...marked[endStr],
          endingDay: true, 
          color: '#1a2b47', 
          textColor: 'white' 
        };
      }
    }
    
    return marked;
  };

  const calculateTotal = () => {
    return room.price_per_night * calculateNights();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleBookNow = () => {
    if (!user) {
        router.push('/login');
        return;
    }

    if (!selectedCheckIn || !selectedCheckOut) {
        alert('Please select check-in and check-out dates');
        return;
    }

    const finalCheckIn = selectedCheckIn;
    const finalCheckOut = selectedCheckOut;

    router.push({
        pathname: '/booking-confirmation',
        params: { 
            roomId: room.id,
            // --- ДОБАВЬТЕ ЭТУ СТРОКУ ---
            imageUrl: (() => {
              if (typeof room.image_urls === 'string') {
                const parsed = JSON.parse(room.image_urls);
                return parsed?.photos?.[0] || '';
              }
              return room.image_urls?.[0] || '';
            })(), 
            // ... остальные параметры
            checkIn: finalCheckIn.toISOString(), // Передаем исправленные даты
            checkOut: finalCheckOut.toISOString(), // Передаем исправленные даты
            guests: guests || room.capacity,
            // ИСПРАВЛЕНО: Передаем только тип комнаты, без номера
            roomName: room.room_type === 'suite' ? 'Suite' : 
                     room.room_type === 'deluxe' ? 'Deluxe Room' : 
                     room.room_type === 'standard' ? 'Standard Room' : 'Room',
            pricePerNight: room.price_per_night,
            totalPrice: calculateTotal() + Math.round(calculateTotal() * 0.1)
        }
    });
};

  const imageUrls = (() => {
    console.log('Room image_urls raw:', room.image_urls);
    console.log('Room image_urls type:', typeof room.image_urls);
    
    if (typeof room.image_urls === 'string') {
      try {
        const parsed = JSON.parse(room.image_urls);
        const photos = parsed?.photos || [];
        console.log('Parsed photos array:', photos);
        console.log('First photo URL:', photos[0]);
        return photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop'];
      } catch (e) {
        console.error('Error parsing image_urls:', e);
        return ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop'];
      }
    }
    
    // If it's already an array
    if (Array.isArray(room.image_urls)) {
      console.log('image_urls is already an array:', room.image_urls);
      return room.image_urls;
    }
    
    console.log('Using fallback image');
    return ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop'];
  })();
  const amenities = room.amenities || [];

  return (
    <>
      <Stack.Screen 
        options={{
          title: room.room_number || room.room_type || 'Room Details',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUrls[currentImageIndex] }} 
            style={styles.roomImage}
            onError={(e) => console.error('Image loading error:', e.nativeEvent.error)}
            onLoad={() => console.log('Image loaded successfully:', imageUrls[currentImageIndex])}
          />
          {imageUrls.length > 1 && (
            <>
              <View style={styles.imageNavigation}>
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={prevImage}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={nextImage}
                >
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.imageDots}>
                {imageUrls.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.dot, 
                      index === currentImageIndex && styles.activeDot
                    ]} 
                  />
                ))}
              </View>
            </>
          )}
        </View>
        
        {/* Room Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.roomTitleContainer}>
            <Text style={styles.roomName}>
              {room.room_type === 'suite' ? 'Suite' : 
               room.room_type === 'deluxe' ? 'Deluxe Room' : 
               room.room_type === 'standard' ? 'Standard Room' : 'Room'}
            </Text>
            {room.room_type && (
              <Text style={styles.roomType}>
                {room.room_type === 'suite' ? 'Luxury Accommodation' : 
                 room.room_type === 'deluxe' ? 'Premium Comfort' : 
                 'Classic Room'}
              </Text>
            )}
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>${room.price_per_night}</Text>
            <Text style={styles.priceNight}>/night</Text>
          </View>
          
          {/* Date Selection */}
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => { setSelectionStep('checkIn'); setCalendarVisible(true); }}
          >
            <Ionicons name="calendar" size={20} color="#1a2b47" />
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Check-in - Check-out</Text>
              <Text style={styles.dateValue}>
                {selectedCheckIn && selectedCheckOut
                  ? `${formatDate(selectedCheckIn.toISOString())} - ${formatDate(selectedCheckOut.toISOString())}`
                  : 'Select dates to check availability'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {selectedCheckIn && selectedCheckOut && (
            <View style={styles.guestSelector}>
              <Text style={styles.guestLabel}>Number of Guests</Text>
              <View style={styles.guestCounter}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => guestCount > 1 && setGuestCount(guestCount - 1)}
                >
                  <Text style={styles.counterText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.guestCount}>{guestCount}</Text>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => guestCount < room.capacity && setGuestCount(guestCount + 1)}
                >
                  <Text style={styles.counterText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{room.description}</Text>
          
          {amenities.length > 0 && (
            <>
              <View style={styles.divider} />
              
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesContainer}>
                {amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    {amenity.toLowerCase().includes('wifi') ? (
                      <Wifi size={18} color="#1a2b47" />
                    ) : amenity.toLowerCase().includes('breakfast') ? (
                      <Coffee size={18} color="#1a2b47" />
                    ) : (
                      <Check size={18} color="#1a2b47" />
                    )}
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Price Details</Text>
          <View style={styles.priceDetails}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>${room.price_per_night} x {calculateNights()} nights</Text>
              <Text style={styles.priceValue}>${room.price_per_night * calculateNights()}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Taxes & fees (10%)</Text>
              <Text style={styles.priceValue}>${Math.round(calculateTotal() * 0.1)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${calculateTotal() + Math.round(calculateTotal() * 0.1)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Calendar Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isCalendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCalendarVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {selectionStep === 'checkIn' ? 'Select Check-in Date' : 'Select Check-out Date'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Red dates are unavailable
            </Text>
            <Calendar
              onDayPress={onDayPress}
              markingType={'period'}
              markedDates={getMarkedDates()}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: '#1a2b47',
                todayTextColor: '#1a2b47',
                arrowColor: '#1a2b47',
              }}
            />
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setCalendarVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      
      {/* Booking Button */}
      <View style={styles.bookingContainer}>
        <View style={styles.bookingSummary}>
          <Text style={styles.bookingPrice}>${room.price_per_night}</Text>
          <Text style={styles.bookingNight}>/night</Text>
        </View>
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleBookNow}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </>
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
  errorText: {
    fontSize: 18,
    color: '#1a2b47',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#1a2b47',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
  },
  roomImage: {
    width: '100%',
    height: '100%',
  },
  imageNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDots: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  detailsContainer: {
    padding: 20,
  },
  roomTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginRight: 10,
  },
  roomType: {
    fontSize: 18,
    color: '#8a94a6',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  priceNight: {
    fontSize: 16,
    color: '#8a94a6',
    marginLeft: 2,
  },
  infoContainer: {
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    padding: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1a2b47',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e5eb',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#8a94a6',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  amenityText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1a2b47',
  },
  priceDetails: {
    backgroundColor: '#f7f9fc',
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
  bookingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5eb',
  },
  bookingSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bookingPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  bookingNight: {
    fontSize: 14,
    color: '#8a94a6',
    marginLeft: 2,
  },
  bookButton: {
    backgroundColor: '#1a2b47',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  dateInfo: {
    flex: 1,
    marginLeft: 15,
  },
  dateLabel: {
    fontSize: 12,
    color: '#8a94a6',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    color: '#1a2b47',
    fontWeight: '500',
  },
  guestSelector: {
    backgroundColor: '#f7f9fc',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  guestLabel: {
    fontSize: 14,
    color: '#8a94a6',
    marginBottom: 10,
  },
  guestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a2b47',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  guestCount: {
    marginHorizontal: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b47',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8a94a6',
    textAlign: 'center',
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#1a2b47',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});