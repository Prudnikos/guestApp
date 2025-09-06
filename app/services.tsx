import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Service } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('services').select('*');
        if (error) throw error;
        setServices(data || []);
        setFilteredServices(data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    let result = services;
    if (selectedCategory) {
      result = result.filter(service => service.category === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        service => 
          service.name.toLowerCase().includes(query) || 
          (service.description && service.description.toLowerCase().includes(query))
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
      <Stack.Screen options={{ title: 'Hotel Services', headerBackTitle: 'Back' }} />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#8a94a6"  />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#1a2b47"  />
          </TouchableOpacity>
        </View>
        
        {/* Categories */}
        <View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {getCategories().map((category) => (
              <TouchableOpacity 
                key={category} 
                style={[ styles.categoryButton, selectedCategory === category && styles.selectedCategoryButton ]}
                onPress={() => handleCategorySelect(category)}
              >
                <Text style={[ styles.categoryText, selectedCategory === category && styles.selectedCategoryText ]}>
                  {getCategoryLabel(category)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Services List */}
        {loading ? (
            <ActivityIndicator style={{ flex: 1 }} size="large" color="#1a2b47" />
        ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.servicesContainer}>
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => (
                    <TouchableOpacity key={service.id} style={styles.serviceCard} onPress={() => handleServiceSelect(service)}>
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
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceDescription} numberOfLines={2}>
                          {service.description}
                        </Text>
                        <View style={styles.serviceFooter}>
                            <Text style={styles.servicePrice}>${service.price}</Text>
                        </View>
                      </View>
                      <View style={styles.addButton}><Ionicons name="add" size={20} color="#fff"  /></View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsContainer}><Text style={styles.noResultsText}>No services found</Text></View>
                )}
              </View>
            </ScrollView>
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
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
    paddingVertical: 15,
  },
  categoryButton: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    marginRight: 10,
  },
  selectedCategoryButton: {
    backgroundColor: '#1a2b47',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceImage: {
    width: 100,
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
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
    marginTop: 'auto'
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
    alignSelf: 'center',
    marginRight: 15,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 30,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a2b47',
  },
});