import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Room, Service } from '@/types';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.75;
const serviceCardWidth = width * 0.45;

export default function HomeScreen() {
  const auth = useAuth();
  const user = auth?.user;
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ВОТ ЭТОТ КОД БЫЛ ПУСТЫМ ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*').limit(5);
        if (roomsError) throw roomsError;
        setFeaturedRooms(roomsData || []);

        const { data: servicesData, error: servicesError } = await supabase.from('services').select('*').limit(4);
        if (servicesError) throw servicesError;
        setServices(servicesData || []);
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const navigateToSearch = () => router.push('/search');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop' }} 
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />
        <Text style={styles.heroTitle}>Your Perfect Stay Awaits</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={navigateToSearch}>
          <Text style={styles.searchButtonText}>Find and Book a Room</Text>
        </TouchableOpacity>

        {/* Featured Rooms */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Rooms</Text>
            <TouchableOpacity onPress={navigateToSearch}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContainer}>
            {featuredRooms.map((room) => {
              const imageUrls = typeof room.image_urls === 'string' 
                ? JSON.parse(room.image_urls)?.photos || [] 
                : room.image_urls?.photos || [];
              const firstImage = imageUrls[0] || 'https://via.placeholder.com/400x300';
              
              return (
                <TouchableOpacity key={room.id} style={styles.roomCard} onPress={() => router.push({ 
                  pathname: '/room-details', 
                  params: { 
                    id: room.id,
                    checkIn: new Date().toISOString(),
                    checkOut: new Date(Date.now() + 86400000).toISOString(),
                    guests: 2
                  }
                })}>
                  <Image source={{ uri: firstImage }} style={styles.roomImage} />
                  <View style={styles.roomInfo}>
                    <View style={styles.roomTitleContainer}>
                      <Text style={styles.roomName} numberOfLines={1}>{room.room_number || 'Room'}</Text>
                      {room.room_type && (
                        <Text style={styles.roomType} numberOfLines={1}>{room.room_type}</Text>
                      )}
                    </View>
                    <Text style={styles.priceText}>${room.price_per_night}/night</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Hotel Services */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hotel Services</Text>
            <TouchableOpacity onPress={() => router.push('/services')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContainer}>
            {services.map((service) => {
              // Use predefined images for services based on name/category
              let firstImage = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop'; // Default spa image
              
              // Match specific services with appropriate stock images
              if (service.name?.toLowerCase().includes('трансфер') || service.name?.toLowerCase().includes('transfer')) {
                firstImage = 'https://images.unsplash.com/photo-1556742111-a301076d9d18?q=80&w=2070&auto=format&fit=crop'; // Transfer/taxi image
              } else if (service.name?.toLowerCase().includes('парков') || service.name?.toLowerCase().includes('parking')) {
                firstImage = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2070&auto=format&fit=crop'; // Parking image
              } else if (service.name?.toLowerCase().includes('спа') || service.name?.toLowerCase().includes('spa')) {
                firstImage = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop'; // Spa image
              } else if (service.name?.toLowerCase().includes('ужин') || service.name?.toLowerCase().includes('dinner') || service.name?.toLowerCase().includes('романт')) {
                firstImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop'; // Romantic dinner image
              } else if (service.name?.toLowerCase().includes('завтрак') || service.name?.toLowerCase().includes('breakfast')) {
                firstImage = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070&auto=format&fit=crop'; // Breakfast image
              } else if (service.name?.toLowerCase().includes('фитнес') || service.name?.toLowerCase().includes('gym')) {
                firstImage = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop'; // Gym image
              } else if (service.name?.toLowerCase().includes('прачеч') || service.name?.toLowerCase().includes('laundry')) {
                firstImage = 'https://images.unsplash.com/photo-1545173168-9b955fa52e02?q=80&w=2070&auto=format&fit=crop'; // Laundry image
              }
              
              return (
                <TouchableOpacity key={service.id} style={styles.serviceCard} onPress={() => router.push({ pathname: '/service-details', params: { id: service.id }})}>
                  <Image 
                    source={{ uri: firstImage }} 
                    style={styles.serviceImage}
                  />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName} numberOfLines={2}>{service.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Special Offers */}
        <View style={styles.sectionContainer}>
          <View style={styles.offerContainer}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=2070&auto=format&fit=crop' }} style={styles.offerImage} />
            <View style={styles.offerContent}>
              <Text style={styles.offerTitle}>Summer Special</Text>
              <TouchableOpacity style={styles.offerButton}><Text style={styles.offerButtonText}>View Offer</Text><Ionicons name="arrow-forward" size={16} color="#fff" /></TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  heroContainer: {
    width: '100%',
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', paddingHorizontal: 20 },
  contentContainer: {
    marginTop: -30,
    zIndex: 1,
    paddingBottom: 30,
  },
  searchButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  searchButtonText: { color: '#1a2b47', fontWeight: '600', fontSize: 16 },
  sectionContainer: {
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a2b47' },
  seeAllText: { fontSize: 14, color: '#1a2b47', fontWeight: '600' },
  horizontalScrollContainer: {
    paddingLeft: 20,
    paddingRight: 5, 
    paddingBottom: 15, // Отступ для тени
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
  },
  roomImage: { 
    width: '100%', 
    height: 180, 
    borderTopLeftRadius: 16, 
    borderTopRightRadius: 16,
    backgroundColor: '#e1e5eb',
  },
  roomInfo: { 
    padding: 15 
  },
  roomTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roomName: { fontSize: 16, fontWeight: '600', color: '#1a2b47', marginRight: 6 },
  roomType: { fontSize: 13, color: '#8a94a6', fontWeight: '500' },
  priceText: { fontSize: 14, fontWeight: '600', color: '#1a2b47', marginTop: 8 },
  serviceCard: { 
    width: serviceCardWidth, 
    marginRight: 15, 
    borderRadius: 16, 
    backgroundColor: '#fff', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImage: { 
    width: '100%', 
    height: 110, 
    borderTopLeftRadius: 16, 
    borderTopRightRadius: 16, 
    backgroundColor: '#e1e5eb' 
  },
  serviceInfo: { 
    padding: 10,
    height: 60, 
    justifyContent: 'center',
  },
  serviceName: { fontSize: 14, fontWeight: '500', color: '#1a2b47', textAlign: 'center' },
  offerContainer: { 
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
  offerImage: { width: '100%', height: 150, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  offerContent: { padding: 15 },
  offerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a2b47' },
  offerButton: { backgroundColor: '#1a2b47', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 10 },
  offerButtonText: { color: '#fff', fontWeight: '600', marginRight: 5 },
});