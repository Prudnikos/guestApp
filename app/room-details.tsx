import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Room } from '@/types';
import { Calendar, Users, Wifi, Coffee, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function RoomDetailsScreen() {
  const { id, checkIn, checkOut, guests } = useLocalSearchParams();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
        image_urls: [
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2070&auto=format&fit=crop'
        ],
        amenities: ['Free WiFi', 'Breakfast Included', 'King Size Bed', 'Ocean View', 'Air Conditioning', 'Mini Bar']
      });
    };

    if (id) {
      fetchRoom();
    } else {
      console.error('No room ID provided');
      setLoading(false);
    }
  }, [id]);

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
    if (room.image_urls && currentImageIndex < room.image_urls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else {
      setCurrentImageIndex(0);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (room.image_urls) {
      setCurrentImageIndex(room.image_urls.length - 1);
    }
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    
    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    // Если даты не были переданы, устанавливаем их по умолчанию: сегодня и завтра
    const finalCheckIn = checkIn ? new Date(checkIn as string) : new Date();
    const finalCheckOut = checkOut ? new Date(checkOut as string) : new Date(Date.now() + 86400000);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    router.push({
        pathname: '/booking-confirmation',
        params: { 
            roomId: room.id,
            // --- ДОБАВЬТЕ ЭТУ СТРОКУ ---
            imageUrl: room.image_urls?.[0], 
            // ... остальные параметры
            checkIn: finalCheckIn.toISOString(), // Передаем исправленные даты
            checkOut: finalCheckOut.toISOString(), // Передаем исправленные даты
            guests: guests || room.capacity,
            roomName: room.name,
            pricePerNight: room.price_per_night,
            totalPrice: calculateTotal() + Math.round(calculateTotal() * 0.1)
        }
    });
};

  const imageUrls = room.image_urls || ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop'];
  const amenities = room.amenities || [];

  return (
    <>
      <Stack.Screen 
        options={{
          title: room.name,
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: imageUrls[currentImageIndex] }} 
            style={styles.roomImage}
          />
          {imageUrls.length > 1 && (
            <>
              <View style={styles.imageNavigation}>
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={prevImage}
                >
                  <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.navButton}
                  onPress={nextImage}
                >
                  <ChevronRight size={24} color="#fff" />
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
          <Text style={styles.roomName}>{room.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>${room.price_per_night}</Text>
            <Text style={styles.priceNight}>/night</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Calendar size={20} color="#8a94a6" />
              <Text style={styles.infoText}>
                {formatDate(checkIn as string)} - {formatDate(checkOut as string)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Users size={20} color="#8a94a6" />
              <Text style={styles.infoText}>
                {guests || room.capacity} {parseInt(guests as string || room.capacity.toString()) === 1 ? 'Guest' : 'Guests'}
              </Text>
            </View>
          </View>
          
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
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 10,
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
});