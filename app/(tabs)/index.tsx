import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Room, Service } from '@/types';
import { router } from 'expo-router';
import { ArrowRight, Star } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.7;

export default function HomeScreen() {
  const { user } = useAuth();
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch featured rooms with better error handling
        try {
          const { data: roomsData, error: roomsError } = await supabase
            .from('rooms')
            .select('*')
            .limit(5);

          if (roomsError) {
            console.error('Supabase rooms error:', {
              code: roomsError.code,
              message: roomsError.message,
              details: roomsError.details,
              hint: roomsError.hint
            });
            throw new Error(`Rooms fetch failed: ${roomsError.message}`);
          }

          if (roomsData && roomsData.length > 0) {
            setFeaturedRooms(roomsData);
          } else {
            console.log('No rooms data returned, using fallback');
            setFallbackRooms();
          }
        } catch (roomError) {
          console.error('Room fetch error:', roomError);
          setFallbackRooms();
        }

        // Fetch popular services with better error handling
        try {
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('*')
            .limit(4);

          if (servicesError) {
            console.error('Supabase services error:', {
              code: servicesError.code,
              message: servicesError.message,
              details: servicesError.details,
              hint: servicesError.hint
            });
            throw new Error(`Services fetch failed: ${servicesError.message}`);
          }

          if (servicesData && servicesData.length > 0) {
            setServices(servicesData);
          } else {
            console.log('No services data returned, using fallback');
            setFallbackServices();
          }
        } catch (serviceError) {
          console.error('Service fetch error:', serviceError);
          setFallbackServices();
        }
      } catch (error) {
        console.error('Unexpected error in fetchData:', error);
        setFallbackRooms();
        setFallbackServices();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const setFallbackRooms = () => {
    setFeaturedRooms([
      {
        id: 1,
        name: 'Deluxe Ocean View',
        description: 'Spacious room with stunning ocean views',
        price_per_night: 299,
        capacity: 2,
        image_urls: [
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2070&auto=format&fit=crop'
        ],
        amenities: ['Free WiFi', 'Breakfast', 'Ocean View', 'King Bed']
      },
      {
        id: 2,
        name: 'Premium Suite',
        description: 'Luxury suite with separate living area',
        price_per_night: 499,
        capacity: 4,
        image_urls: [
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop'
        ],
        amenities: ['Free WiFi', 'Breakfast', 'Living Room', 'King Bed', 'Balcony']
      },
      {
        id: 3,
        name: 'Family Room',
        description: 'Perfect for families with children',
        price_per_night: 399,
        capacity: 5,
        image_urls: [
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2074&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop'
        ],
        amenities: ['Free WiFi', 'Breakfast', 'Two Bedrooms', 'Pool Access']
      }
    ]);
  };

  const setFallbackServices = () => {
    setServices([
      {
        id: 1,
        name: 'Spa Treatment',
        description: 'Relaxing massage and spa treatments',
        price: 120,
        category: 'wellness',
        image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop'
      },
      {
        id: 2,
        name: 'Fine Dining',
        description: 'Gourmet dinner at our restaurant',
        price: 85,
        category: 'dining',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop'
      },
      {
        id: 3,
        name: 'Airport Transfer',
        description: 'Luxury car transfer to/from airport',
        price: 60,
        category: 'transport',
        image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop'
      },
      {
        id: 4,
        name: 'Guided Tour',
        description: 'Explore local attractions with a guide',
        price: 95,
        category: 'activities',
        image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop'
      }
    ]);
  };

  const navigateToSearch = () => {
    router.push('/search');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.email?.split('@')[0] || 'Guest'}</Text>
        <TouchableOpacity style={styles.searchButton} onPress={navigateToSearch}>
          <Text style={styles.searchButtonText}>Find and Book a Room</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Rooms */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Rooms</Text>
          <TouchableOpacity onPress={navigateToSearch}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roomsScrollContainer}
        >
          {featuredRooms.map((room) => (
            <TouchableOpacity 
              key={room.id} 
              style={styles.roomCard}
              onPress={() => router.push({
                pathname: '/room-details',
                params: { id: room.id }
              })}
            >
              <Image 
                source={{ uri: room.image_urls?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop' }} 
                style={styles.roomImage}
              />
              <View style={styles.roomInfo}>
                <Text style={styles.roomName}>{room.name}</Text>
                <View style={styles.roomDetails}>
                  <View style={styles.ratingContainer}>
                    <Star size={16} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>4.8</Text>
                  </View>
                  <Text style={styles.priceText}>${room.price_per_night}/night</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Hotel Services */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hotel Services</Text>
          <TouchableOpacity onPress={() => router.push('/services')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.servicesGrid}>
          {services.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.serviceCard}
              onPress={() => router.push({
                pathname: '/service-details',
                params: { id: service.id }
              })}
            >
              <Image 
                source={{ uri: service.image_url }} 
                style={styles.serviceImage}
              />
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.servicePrice}>${service.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Special Offers */}
      <View style={styles.offerContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop' }} 
          style={styles.offerImage}
        />
        <View style={styles.offerContent}>
          <Text style={styles.offerTitle}>Summer Special</Text>
          <Text style={styles.offerDescription}>Get 20% off on all bookings this summer</Text>
          <TouchableOpacity style={styles.offerButton}>
            <Text style={styles.offerButtonText}>View Offer</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        </View>
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
  welcomeSection: {
    padding: 20,
    backgroundColor: '#1a2b47',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  welcomeText: {
    fontSize: 16,
    color: '#e1e5eb',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
    marginBottom: 20,
  },
  searchButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  searchButtonText: {
    color: '#1a2b47',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionContainer: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1a2b47',
    fontWeight: '600',
  },
  roomsScrollContainer: {
    paddingRight: 20,
  },
  roomCard: {
    width: cardWidth,
    marginRight: 15,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  roomImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  roomInfo: {
    padding: 15,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b47',
    marginBottom: 8,
  },
  roomDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#8a94a6',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2b47',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2b47',
    marginTop: 10,
    marginHorizontal: 12,
  },
  servicePrice: {
    fontSize: 14,
    color: '#8a94a6',
    marginBottom: 10,
    marginHorizontal: 12,
    marginTop: 4,
  },
  offerContainer: {
    marginTop: 25,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  offerImage: {
    width: '100%',
    height: 150,
  },
  offerContent: {
    padding: 15,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 5,
  },
  offerDescription: {
    fontSize: 14,
    color: '#8a94a6',
    marginBottom: 15,
  },
  offerButton: {
    backgroundColor: '#1a2b47',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  offerButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 5,
  },
});