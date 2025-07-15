import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Service } from '@/types';
import { Search, Filter, Plus } from 'lucide-react-native';

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        console.log('Fetching services from Supabase...');
        
        const { data, error } = await supabase
          .from('services')
          .select('*');
        
        if (error) {
          console.error('Supabase error fetching services:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          console.error('Error hint:', error.hint);
          
          // Set fallback services data
          const fallbackServices = [
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
          ];
          
          setServices(fallbackServices);
          setFilteredServices(fallbackServices);
          return;
        }
        
        console.log('Services fetched successfully:', data);
        setServices(data || []);
        setFilteredServices(data || []);
      } catch (error) {
        console.error('Unexpected error fetching services:', error);
        console.error('Error type:', typeof error);
        console.error('Error string:', String(error));
        
        // Set fallback services data for any unexpected errors
        const fallbackServices = [
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
          }
        ];
        
        setServices(fallbackServices);
        setFilteredServices(fallbackServices);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
  }, []);

  useEffect(() => {
    let result = services;
    
    // Apply category filter
    if (selectedCategory) {
      result = result.filter(service => service.category === selectedCategory);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        service => 
          service.name.toLowerCase().includes(query) || 
          service.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredServices(result);
  }, [searchQuery, selectedCategory, services]);

  const getCategories = () => {
    const categories = services.map(service => service.category);
    return Array.from(new Set(categories));
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

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const handleServiceSelect = (service: Service) => {
    router.push({
      pathname: '/service-details',
      params: { id: service.id }
    });
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Hotel Services',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#8a94a6" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#1a2b47" />
          </TouchableOpacity>
        </View>
        
        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {getCategories().map((category) => (
            <TouchableOpacity 
              key={category} 
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategoryButton
              ]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text 
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.selectedCategoryText
                ]}
              >
                {getCategoryLabel(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Services List */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.servicesContainer}>
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <TouchableOpacity 
                  key={service.id} 
                  style={styles.serviceCard}
                  onPress={() => handleServiceSelect(service)}
                >
                  <Image 
                    source={{ uri: service.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop' }} 
                    style={styles.serviceImage}
                  />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {service.description}
                    </Text>
                    <View style={styles.serviceFooter}>
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>
                          {getCategoryLabel(service.category)}
                        </Text>
                      </View>
                      <Text style={styles.servicePrice}>${service.price}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => handleServiceSelect(service)}
                  >
                    <Plus size={20} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No services found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try adjusting your search or filters
                </Text>
              </View>
            )}
          </View>
          
          {/* Bottom Spacing */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    marginRight: 10,
  },
  selectedCategoryButton: {
    backgroundColor: '#1a2b47',
  },
  categoryText: {
    fontSize: 14,
    color: '#1a2b47',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  servicesContainer: {
    padding: 15,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  serviceImage: {
    width: 100,
    height: 100,
  },
  serviceInfo: {
    flex: 1,
    padding: 15,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b47',
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#8a94a6',
    marginBottom: 10,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#f0f2f5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#1a2b47',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a2b47',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a2b47',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 15,
    right: 15,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 30,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a2b47',
    marginBottom: 10,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#8a94a6',
    textAlign: 'center',
  },
});