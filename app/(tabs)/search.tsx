import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image, Modal, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Room } from '@/types';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';

const { width } = Dimensions.get('window');

export default function SearchScreen() {
    const [checkInDate, setCheckInDate] = useState<Date | null>(new Date());
    const [checkOutDate, setCheckOutDate] = useState<Date | null>(new Date(Date.now() + 86400000));
    const [isCalendarVisible, setCalendarVisible] = useState(false);
    const [selectionStep, setSelectionStep] = useState<'checkIn' | 'checkOut'>('checkIn');
    const [guestCount, setGuestCount] = useState(2);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [bookedRoomIds, setBookedRoomIds] = useState<Set<string>>(new Set());
    const [lastDateSearch, setLastDateSearch] = useState<{checkIn: Date | null, checkOut: Date | null}>({checkIn: null, checkOut: null});

    const { preselectedRoomId } = useLocalSearchParams();
    const preselectedRoom = preselectedRoomId ? rooms.find(r => r.id.toString() === preselectedRoomId) : null;

    useEffect(() => {
        const fetchAllRooms = async () => {
            try {
                const { data, error } = await supabase.from('rooms').select('*');
                if (error) throw error;
                setRooms(data || []);
            } catch (error) {
                console.error('Error fetching rooms:', error);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchAllRooms();
    }, []);

    // Auto-search when dates change
    useEffect(() => {
        if (checkInDate && checkOutDate && !initialLoading && rooms.length > 0) {
            // Only fetch bookings when dates change
            if (lastDateSearch.checkIn?.getTime() !== checkInDate.getTime() || 
                lastDateSearch.checkOut?.getTime() !== checkOutDate.getTime()) {
                handleSearch(false);
                setLastDateSearch({checkIn: checkInDate, checkOut: checkOutDate});
            }
        }
    }, [checkInDate, checkOutDate]);

    // Fast local filtering when guest count changes (removed - now handled directly in increment/decrement)

    const handleSearch = async (showAlert = true) => {
        if (!checkInDate || !checkOutDate) {
            if (showAlert) {
                alert('Please select both check-in and check-out dates.');
            }
            return;
        }

        setLoading(true);
        setSearchPerformed(true);
        try {
            const capacityMatchingRooms = rooms.filter(room => room.capacity >= guestCount);
            
            // В отельной системе день выезда = день заезда для следующего гостя
            // Поэтому исключаем совпадения, где check_out текущей брони = check_in новой брони
            const checkInStr = checkInDate.toISOString().split('T')[0];
            const checkOutStr = checkOutDate.toISOString().split('T')[0];
            
            const { data: conflictingBookings, error } = await supabase
                .from('bookings')
                .select('room_id')
                .or(`and(check_in.lt.${checkOutStr},check_out.gt.${checkInStr})`)
                .in('status', ['confirmed', 'pending']);
            
            if (error) throw error;

            const bookedIds = new Set(conflictingBookings?.map(b => b.room_id) || []);
            setBookedRoomIds(bookedIds); // Save for fast local filtering
            let finalAvailableRooms = capacityMatchingRooms.filter(room => !bookedIds.has(room.id));

            if (preselectedRoomId) {
                finalAvailableRooms = finalAvailableRooms.filter(
                    room => room.id.toString() === preselectedRoomId
                );
            }
            setFilteredRooms(finalAvailableRooms);
        } catch (error) {
            console.error('Error during search:', error);
            setFilteredRooms([]);
        } finally {
            setLoading(false);
        }
    };

    const incrementGuests = () => {
        if (guestCount < 10) {
            const newCount = guestCount + 1;
            setGuestCount(newCount);
            // Instant local filtering
            if (searchPerformed && rooms.length > 0) {
                const filtered = rooms.filter(room => room.capacity >= newCount && !bookedRoomIds.has(room.id));
                setFilteredRooms(preselectedRoomId ? filtered.filter(r => r.id.toString() === preselectedRoomId) : filtered);
            }
        }
    };

    const decrementGuests = () => {
        if (guestCount > 1) {
            const newCount = guestCount - 1;
            setGuestCount(newCount);
            // Instant local filtering
            if (searchPerformed && rooms.length > 0) {
                const filtered = rooms.filter(room => room.capacity >= newCount && !bookedRoomIds.has(room.id));
                setFilteredRooms(preselectedRoomId ? filtered.filter(r => r.id.toString() === preselectedRoomId) : filtered);
            }
        }
    };

    const onDayPress = (day: DateData) => {
        const selectedDate = new Date(day.timestamp);
        if (selectionStep === 'checkIn' || !checkInDate || selectedDate <= checkInDate) {
            setCheckInDate(selectedDate);
            setCheckOutDate(new Date(selectedDate.getTime() + 86400000)); // Set checkout to next day
            setSelectionStep('checkOut');
        } else { // selectionStep === 'checkOut'
            setCheckOutDate(selectedDate);
            setSelectionStep('checkIn');
            setCalendarVisible(false);
        }
    };
    
    const getMarkedDates = () => {
        const marked: { [key: string]: any } = {};
        if (checkInDate) {
            const startStr = checkInDate.toISOString().split('T')[0];
            marked[startStr] = { startingDay: true, color: '#1a2b47', textColor: 'white' };
            if (checkOutDate) {
                const endStr = checkOutDate.toISOString().split('T')[0];
                for (let d = new Date(checkInDate); d <= checkOutDate; d.setDate(d.getDate() + 1)) {
                    const dStr = d.toISOString().split('T')[0];
                    marked[dStr] = { ...marked[dStr], color: '#dbeafe', textColor: '#1a2b47' };
                }
                marked[startStr] = { startingDay: true, color: '#1a2b47', textColor: 'white' };
                marked[endStr] = { endingDay: true, color: '#1a2b47', textColor: 'white' };
            }
        }
        return marked;
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Select Date';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    if (initialLoading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1a2b47" /></View>;
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.searchForm}>
                    <Text style={styles.searchTitle}>Find Your Perfect Room</Text>
                    
                    <Text style={styles.inputLabel}>Check-in & Check-out</Text>
                    <TouchableOpacity style={styles.dateInput} onPress={() => { setSelectionStep('checkIn'); setCalendarVisible(true); }}>
                        <Ionicons name="calendar" size={20} color="#8a94a6" />
                        <Text style={styles.dateText}>
                            {formatDate(checkInDate)} - {checkOutDate ? formatDate(checkOutDate) : '...'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Number of Guests</Text>
                        <View style={styles.guestInput}>
                            <Ionicons name="person" size={20} color="#8a94a6" />
                            <View style={styles.guestCounter}>
                                <TouchableOpacity style={styles.counterButton} onPress={decrementGuests}><Text style={styles.counterButtonText}>-</Text></TouchableOpacity>
                                <Text style={styles.guestCountText}>{guestCount}</Text>
                                <TouchableOpacity style={styles.counterButton} onPress={incrementGuests}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading || !checkInDate || !checkOutDate}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="search" size={20} color="#fff" />
                                <Text style={styles.searchButtonText}>Search Rooms</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={isCalendarVisible}
                    onRequestClose={() => setCalendarVisible(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setCalendarVisible(false)}>
                        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                            <Calendar
                                onDayPress={onDayPress}
                                markingType={'period'}
                                markedDates={getMarkedDates()}
                                minDate={new Date().toISOString().split('T')[0]}
                            />
                        </View>
                    </Pressable>
                </Modal>

                {searchPerformed && (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsTitle}>
                            {filteredRooms.length} {filteredRooms.length === 1 ? 'Room' : 'Rooms'} Available
                        </Text>
                        
                        {loading ? (
                            <ActivityIndicator size="large" color="#1a2b47" style={{ marginTop: 20 }}/>
                        ) : filteredRooms.length > 0 ? (
                            filteredRooms.map((room) => (
                                <TouchableOpacity
                                    key={room.id}
                                    style={styles.roomCard}
                                    onPress={() => router.push({
                                        pathname: '/room-details',
                                        params: { 
                                            id: room.id,
                                            checkIn: checkInDate!.toISOString(),
                                            checkOut: checkOutDate!.toISOString(),
                                            guests: guestCount
                                        }
                                    })}
                                >
                                    <Image
                                        source={{ uri: (() => {
                                            const imageUrls = typeof room.image_urls === 'string' 
                                                ? JSON.parse(room.image_urls)?.photos || [] 
                                                : room.image_urls?.photos || [];
                                            return imageUrls[0] || 'https://placehold.co/400x400';
                                        })() }}
                                        style={styles.roomImage}
                                    />
                                    <View style={styles.roomInfo}>
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
                                        <Text style={styles.roomDescription} numberOfLines={2}>{room.description}</Text>
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.priceAmount}>${room.price_per_night}</Text>
                                            <Text style={styles.priceNight}>/night</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : preselectedRoom ? (
                            <View style={styles.noResultsContainer}>
                                <Text style={styles.noResultsText}>
                                    Sorry, "{preselectedRoom.room_number || preselectedRoom.room_type || 'This room'}" is not available on these dates.
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.noResultsContainer}>
                                <Text style={styles.noResultsText}>No rooms available for your criteria.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchForm: { padding: 20, margin: 15, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    searchTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a2b47', marginBottom: 20, textAlign: 'center' },
    inputContainer: { marginBottom: 15 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: '#8a94a6', marginBottom: 8, marginLeft: 5 },
    dateInput: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: '#e1e5eb', borderRadius: 12, paddingHorizontal: 15, backgroundColor: '#fff', marginBottom: 15 },
    dateText: { marginLeft: 10, fontSize: 16, color: '#1a2b47' },
    guestInput: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: '#e1e5eb', borderRadius: 12, paddingHorizontal: 15, backgroundColor: '#fff', justifyContent: 'space-between' },
    guestCounter: { flexDirection: 'row', alignItems: 'center' },
    counterButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e1e5eb', justifyContent: 'center', alignItems: 'center' },
    counterButtonText: { fontSize: 20, fontWeight: 'bold', color: '#1a2b47', lineHeight: 22 },
    guestCountText: { marginHorizontal: 15, fontSize: 16, fontWeight: '600', color: '#1a2b47' },
    searchButton: { backgroundColor: '#1a2b47', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, flexDirection: 'row' },
    searchButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 10 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 10, width: '90%' },
    resultsContainer: { padding: 15 },
    resultsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a2b47', marginBottom: 15 },
    roomCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
    roomImage: { width: width * 0.35, height: '100%' },
    roomInfo: { flex: 1, padding: 15, justifyContent: 'space-between' },
    roomTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        flexWrap: 'wrap',
    },
    roomName: { fontSize: 16, fontWeight: '600', color: '#1a2b47', marginRight: 8 },
    roomType: { fontSize: 14, color: '#8a94a6', fontWeight: '500' },
    roomDescription: { fontSize: 14, color: '#8a94a6', marginBottom: 10 },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 'auto' },
    priceAmount: { fontSize: 18, fontWeight: 'bold', color: '#1a2b47' },
    priceNight: { fontSize: 14, color: '#8a94a6', marginLeft: 2 },
    noResultsContainer: { alignItems: 'center', padding: 30 },
    noResultsText: { fontSize: 16, fontWeight: '500', color: '#1a2b47', textAlign: 'center' },
});