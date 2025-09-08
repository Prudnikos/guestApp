import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Service } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import CustomAlert from '@/components/CustomAlert';

export default function ServiceDetailsScreen() {
  const { id, bookingId, bookingServiceId, editMode, currentQuantity } = useLocalSearchParams();
  const auth = useAuth();
  const user = auth?.user;
  const [service, setService] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToBooking, setAddingToBooking] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const isEditMode = editMode === 'true';

  useEffect(() => {
    const fetchService = async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // --- НАЧИНАЮ ЗАГРУЗКУ ДЕТАЛЕЙ УСЛУГИ ---
            console.log(`[LOG] Запрашиваю услугу с ID: ${id}`);

            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('id', id)
                .single();

            // --- ВАЖНО: Теперь мы выводим ошибку, а не прячем её ---
            if (error) {
                throw error;
            }

            setService(data);
            console.log("[LOG] Услуга успешно загружена:", data);

        } catch (error) {
            // --- ТЕПЕРЬ МЫ УВИДИМ НАСТОЯЩУЮ ОШИБКУ В ТЕРМИНАЛЕ ---
            console.error("[ERROR] Не удалось загрузить услугу:", error);
            // Оставляем setService(null), чтобы увидеть сообщение "Service not found"
            setService(null); 
        } finally {
            setLoading(false);
        }
    };

    fetchService();
    
    // Set initial quantity if in edit mode
    if (currentQuantity) {
      setQuantity(parseInt(currentQuantity as string));
    }
}, [id, currentQuantity]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a2b47" />
        <Text style={styles.loadingText}>Loading service details...</Text>
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Service not found</Text>
      </View>
    );
  }

  const incrementQuantity = () => {
    setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const calculateTotal = () => {
    return service.price * quantity;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'wellness': 'Wellness',
      'dining': 'Dining',
      'transport': 'Transport',
      'activities': 'Activities',
      'housekeeping': 'Housekeeping'
    };
    
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const handleAddToBooking = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setAddingToBooking(true);

    try {
      if (isEditMode && bookingServiceId) {
        // Update existing booking service
        console.log('Updating booking service...');
        
        const { data, error } = await supabase
          .from('booking_services')
          .update({
            quantity: quantity,
            price_at_booking: service.price * quantity
          })
          .eq('id', bookingServiceId)
          .select();
        
        if (error) {
          console.error('Error updating service:', error);
          Alert.alert('Error', `Failed to update service: ${error.message}`);
          return;
        }
        
        console.log('Service updated successfully:', data);
        Alert.alert('Success', 'Service updated successfully!');
        
        // Navigate back to booking page
        router.replace({
          pathname: '/(tabs)/booking',
          params: { selectedBookingId: bookingId }
        });
      } else {
        // Add new service to booking
        console.log('Starting to add service to booking...');
        
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
        
        console.log('Found booking:', bookingData);
        
        // FIXED: Use correct column name 'price_at_booking' instead of 'price'
        const serviceBookingData = {
          booking_id: bookingData.id,
          service_id: service.id,
          quantity: quantity,
          price_at_booking: service.price * quantity, // FIXED: Correct column name
          status: 'pending'
        };
        
        console.log('Inserting service booking data:', serviceBookingData);
        
        // Then add the service to the booking
        const { data, error } = await supabase
          .from('booking_services')
          .insert(serviceBookingData)
          .select();
        
        if (error) {
          console.error('Error adding service to booking:', error);
          Alert.alert('Error', `Failed to add service: ${error.message}`);
          return;
        }
        
        console.log('Service added successfully:', data);
        
        // Show success modal
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error adding service to booking:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} service: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setAddingToBooking(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: service.name,
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Service Image */}
          <Image 
            source={{ uri: (() => {
              // Use predefined images for services based on name/category
              let imageUrl = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop';
              
              if (service.name?.toLowerCase().includes('трансфер') || service.name?.toLowerCase().includes('transfer')) {
                imageUrl = 'https://images.unsplash.com/photo-1556742111-a301076d9d18?q=80&w=2070&auto=format&fit=crop';
              } else if (service.name?.toLowerCase().includes('парков') || service.name?.toLowerCase().includes('parking')) {
                imageUrl = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2070&auto=format&fit=crop';
              } else if (service.name?.toLowerCase().includes('спа') || service.name?.toLowerCase().includes('spa')) {
                imageUrl = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop';
              } else if (service.name?.toLowerCase().includes('ужин') || service.name?.toLowerCase().includes('dinner') || service.name?.toLowerCase().includes('романт')) {
                imageUrl = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop';
              } else if (service.name?.toLowerCase().includes('завтрак') || service.name?.toLowerCase().includes('breakfast')) {
                imageUrl = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070&auto=format&fit=crop';
              } else if (service.name?.toLowerCase().includes('фитнес') || service.name?.toLowerCase().includes('gym')) {
                imageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop';
              } else if (service.name?.toLowerCase().includes('прачеч') || service.name?.toLowerCase().includes('laundry')) {
                imageUrl = 'https://images.unsplash.com/photo-1545173168-9b955fa52e02?q=80&w=2070&auto=format&fit=crop';
              }
              
              return imageUrl;
            })() }} 
            style={styles.serviceImage}
          />
          
          {/* Service Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.headerContainer}>
              <View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryText}>
                    {getCategoryLabel(service.category)}
                  </Text>
                </View>
              </View>
              <Text style={styles.servicePrice}>${service.price}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{service.description}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.quantityTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={decrementQuantity}
              >
                <Ionicons name="remove" size={20} color="#1a2b47" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={20} color="#1a2b47" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${calculateTotal()}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddToBooking}
              disabled={addingToBooking}
            >
              {addingToBooking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>{isEditMode ? 'Update Service' : 'Add to Booking'}</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.noteText}>
              * Service will be {isEditMode ? 'updated in' : 'added to'} your current booking
            </Text>
          </View>
        </ScrollView>
      </View>
      
      {/* Success Modal */}
      <CustomAlert
        visible={showSuccessModal}
        title="Success!"
        message="Service added to your booking successfully!"
        buttons={[
          {
            text: 'View Booking',
            onPress: () => {
              setShowSuccessModal(false);
              if (bookingId) {
                // Возвращаемся к конкретному букингу
                router.replace({
                  pathname: '/(tabs)/booking',
                  params: { selectedBookingId: bookingId }
                });
              } else {
                // Если нет bookingId, идем к списку букингов
                router.replace('/(tabs)/booking');
              }
            },
            style: 'primary'
          },
          {
            text: 'Continue Shopping',
            onPress: () => {
              setShowSuccessModal(false);
              router.back();
            },
            style: 'secondary'
          }
        ]}
      />
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
  serviceImage: {
    width: '100%',
    height: 250,
  },
  detailsContainer: {
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#f0f2f5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 14,
    color: '#1a2b47',
  },
  servicePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e5eb',
    marginVertical: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#8a94a6',
  },
  quantityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
    marginBottom: 15,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b47',
    marginHorizontal: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  addButton: {
    backgroundColor: '#1a2b47',
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: '#8a94a6',
    textAlign: 'center',
  },
});