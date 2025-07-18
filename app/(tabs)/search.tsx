import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Platform, Pressable, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Room } from '@/types';
import { router } from 'expo-router';
import { Calendar, Users, Search as SearchIcon, Star } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

export default function SearchScreen() {
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000));
    const [guestCount, setGuestCount] = useState(2);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // States for calendar management
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState<'checkIn' | 'checkOut'>('checkIn');

    useEffect(() => {
        const fetchAllRooms = async () => {
            setInitialLoading(true);
            try {
                const { data, error } = await supabase.from('rooms').select('*');
                if (error) {
                    console.error('Error fetching rooms:', error);
                    // Set fallback rooms data
                    setRooms([
                        {
                            id: 1,
                            name: 'Deluxe Ocean View',
                            description: 'Spacious room with stunning ocean views',
                            price_per_night: 299,
                            capacity: 2,
                            image_urls: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop'],
                            amenities: ['Free WiFi', 'Breakfast', 'Ocean View', 'King Bed']
                        },
                        {
                            id: 2,
                            name: 'Premium Suite',
                            description: 'Luxury suite with separate living area',
                            price_per_night: 499,
                            capacity: 4,
                            image_urls: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop'],
                            amenities: ['Free WiFi', 'Breakfast', 'Living Room', 'King Bed', 'Balcony']
                        }
                    ]);
                } else {
                    setRooms(data || []);
                }
            } catch (error) {
                console.error('Error fetching rooms:', error);
                setRooms([]);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchAllRooms();
    }, []);

    const handleSearch = async () => {
        setLoading(true);
        setSearchPerformed(true);
        try {
            const { data: conflictingBookings, error } = await supabase
                .from('bookings')
                .select('room_id')
                .or(`and(check_in.lte.${checkOutDate.toISOString().split('T')[0]},check_out.gte.${checkInDate.toISOString().split('T')[0]})`)
                .in('status', ['confirmed', 'pending']);
            
            if (error) {
                console.error('Error searching rooms:', error);
                // If search fails, show all rooms that meet capacity requirements
                const availableRooms = rooms.filter(room => room.capacity >= guestCount);
                setFilteredRooms(availableRooms);
            } else {
                const bookedRoomIds = new Set(conflictingBookings?.map(b => b.room_id) || []);
                const finalAvailableRooms = rooms.filter(
                    room => room.capacity >= guestCount && !bookedRoomIds.has(room.id)
                );
                setFilteredRooms(finalAvailableRooms);
            }
        } catch (error) {
            console.error('Error during search:', error);
            // Fallback: show rooms that meet capacity requirements
            const availableRooms = rooms.filter(room => room.capacity >= guestCount);
            setFilteredRooms(availableRooms);
        } finally {
            setLoading(false);
        }
    };
    
    const showDatePicker = (type: 'checkIn' | 'checkOut') => {
        setPickerType(type);
        setPickerVisible(true);
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setPickerVisible(false);
        }

        if (event.type === 'set' && selectedDate) {
            if (pickerType === 'checkIn') {
                setCheckInDate(selectedDate);
                if (selectedDate >= checkOutDate) {
                    const newCheckOutDate = new Date(selectedDate);
                    newCheckOutDate.setDate(newCheckOutDate.getDate() + 1);
                    setCheckOutDate(newCheckOutDate);
                }
            } else {
                setCheckOutDate(selectedDate);
            }
        }
    };

    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const incrementGuests = () => guestCount < 10 && setGuestCount(guestCount + 1);
    const decrementGuests = () => guestCount > 1 && setGuestCount(guestCount - 1);

    const handleRoomSelect = (room: Room) => {
        router.push({
            pathname: '/room-details',
            params: {
                id: room.id,
                checkIn: checkInDate.toISOString(),
                checkOut: checkOutDate.toISOString(),
                guests: guestCount.toString()
            }
        });
    };

    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a2b47" />
                <Text style={styles.loadingText}>Loading rooms...</Text>
            </View>
        );
    }

    const renderDatePicker = () => {
        const isCheckIn = pickerType === 'checkIn';
        const minimumDate = isCheckIn ? new Date() : new Date(checkInDate.getTime() + 86400000);
        const currentDate = isCheckIn ? checkInDate : checkOutDate;

        if (Platform.OS === 'ios') {
            return (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isPickerVisible}
                    onRequestClose={() => setPickerVisible(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
                        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                            <DateTimePicker
                                value={currentDate}
                                mode="date"
                                display="inline"
                                onChange={handleDateChange}
                                minimumDate={minimumDate}
                            />
                            <TouchableOpacity style={styles.doneButton} onPress={() => setPickerVisible(false)}>
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Modal>
            );
        }
        
        if (isPickerVisible) {
            return (
                <DateTimePicker
                    value={currentDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={minimumDate}
                />
            );
        }

        return null;
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.searchForm}>
                    <Text style={styles.searchTitle}>Find Your Perfect Room</Text>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Check-in Date</Text>
                        <TouchableOpacity style={styles.dateInput} onPress={() => showDatePicker('checkIn')}>
                            <Calendar size={20} color="#8a94a6" />
                            <Text style={styles.dateText}>{formatDate(checkInDate)}</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Check-out Date</Text>
                        <TouchableOpacity style={styles.dateInput} onPress={() => showDatePicker('checkOut')}>
                            <Calendar size={20} color="#8a94a6" />
                            <Text style={styles.dateText}>{formatDate(checkOutDate)}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Number of Guests</Text>
                        <View style={styles.guestInput}>
                            <Users size={20} color="#8a94a6" />
                            <View style={styles.guestCounter}>
                                <TouchableOpacity style={styles.counterButton} onPress={decrementGuests}>
                                    <Text style={styles.counterButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.guestCountText}>{guestCount}</Text>
                                <TouchableOpacity style={styles.counterButton} onPress={incrementGuests}>
                                    <Text style={styles.counterButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <SearchIcon size={20} color="#fff" />
                                <Text style={styles.searchButtonText}>Search Rooms</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                
                {renderDatePicker()}

                {searchPerformed && (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsTitle}>
                            {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} available
                        </Text>
                        
                        {filteredRooms.length > 0 ? (
                            filteredRooms.map((room) => (
                                <TouchableOpacity 
                                    key={room.id} 
                                    style={styles.roomCard}
                                    onPress={() => handleRoomSelect(room)}
                                >
                                    <Image 
                                        source={{ uri: room.image_urls?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop' }} 
                                        style={styles.roomImage}
                                    />
                                    <View style={styles.roomInfo}>
                                        <Text style={styles.roomName}>{room.name}</Text>
                                        <Text style={styles.roomDescription} numberOfLines={2}>
                                            {room.description}
                                        </Text>
                                        <View style={styles.roomDetails}>
                                            <View style={styles.ratingContainer}>
                                                <Star size={16} color="#FFD700" fill="#FFD700" />
                                                <Text style={styles.ratingText}>4.8</Text>
                                            </View>
                                            <Text style={styles.capacityText}>Up to {room.capacity} guests</Text>
                                        </View>
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.priceText}>${room.price_per_night}</Text>
                                            <Text style={styles.priceNight}>/night</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.noResultsContainer}>
                                <Text style={styles.noResultsText}>No rooms available</Text>
                                <Text style={styles.noResultsSubtext}>
                                    Try different dates or adjust the number of guests
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f0f2f5' 
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#8a94a6',
    },
    searchForm: { 
        padding: 20, 
        margin: 15, 
        backgroundColor: '#fff', 
        borderRadius: 16, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 8, 
        elevation: 3 
    },
    searchTitle: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: '#1a2b47', 
        marginBottom: 20, 
        textAlign: 'center' 
    },
    inputContainer: { 
        marginBottom: 15 
    },
    inputLabel: { 
        fontSize: 14, 
        fontWeight: '500', 
        color: '#8a94a6', 
        marginBottom: 8, 
        marginLeft: 5 
    },
    dateInput: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        height: 50, 
        borderWidth: 1, 
        borderColor: '#e1e5eb', 
        borderRadius: 12, 
        paddingHorizontal: 15, 
        backgroundColor: '#fff' 
    },
    dateText: { 
        marginLeft: 10, 
        fontSize: 16, 
        color: '#1a2b47' 
    },
    guestInput: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        height: 50, 
        borderWidth: 1, 
        borderColor: '#e1e5eb', 
        borderRadius: 12, 
        paddingHorizontal: 15, 
        backgroundColor: '#fff', 
        justifyContent: 'space-between' 
    },
    guestCounter: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    counterButton: { 
        width: 32, 
        height: 32, 
        borderRadius: 16, 
        backgroundColor: '#e1e5eb', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    counterButtonText: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#1a2b47', 
        lineHeight: 22 
    },
    guestCountText: { 
        marginHorizontal: 15, 
        fontSize: 16, 
        fontWeight: '600', 
        color: '#1a2b47' 
    },
    searchButton: { 
        backgroundColor: '#1a2b47', 
        height: 50, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 10, 
        flexDirection: 'row' 
    },
    searchButtonText: { 
        color: 'white', 
        fontSize: 16, 
        fontWeight: '600', 
        marginLeft: 10 
    },
    resultsContainer: { 
        paddingHorizontal: 15,
        paddingBottom: 20
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a2b47',
        marginBottom: 15,
    },
    roomCard: {
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
    roomImage: {
        width: '100%',
        height: 200,
    },
    roomInfo: {
        padding: 15,
    },
    roomName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a2b47',
        marginBottom: 5,
    },
    roomDescription: {
        fontSize: 14,
        color: '#8a94a6',
        marginBottom: 10,
        lineHeight: 20,
    },
    roomDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
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
    capacityText: {
        fontSize: 14,
        color: '#8a94a6',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    priceText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a2b47',
    },
    priceNight: {
        fontSize: 14,
        color: '#8a94a6',
        marginLeft: 2,
    },
    noResultsContainer: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginTop: 10,
    },
    noResultsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a2b47',
        marginBottom: 10,
    },
    noResultsSubtext: {
        fontSize: 14,
        color: '#8a94a6',
        textAlign: 'center',
    },
    modalOverlay: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.5)' 
    },
    modalContent: { 
        backgroundColor: 'white', 
        borderRadius: 20, 
        padding: 20, 
        width: '90%', 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 4, 
        elevation: 5 
    },
    doneButton: { 
        backgroundColor: '#1a2b47', 
        borderRadius: 12, 
        padding: 12, 
        marginTop: 15, 
        alignItems: 'center' 
    },
    doneButtonText: { 
        color: 'white', 
        fontSize: 16, 
        fontWeight: '600' 
    },
});