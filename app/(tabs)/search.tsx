import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Platform, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Room } from '@/types';
import { router } from 'expo-router';
import { Calendar, Users, Search as SearchIcon } from 'lucide-react-native';
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

    // --- ИЗМЕНЕНИЕ 1: Объединяем состояния для управления календарем ---
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [pickerConfig, setPickerConfig] = useState({
        date: new Date(),
        onChange: (event: DateTimePickerEvent, date?: Date) => {},
        minimumDate: new Date(),
    });

    useEffect(() => {
        const fetchAllRooms = async () => {
            setInitialLoading(true);
            try {
                const { data, error } = await supabase.from('rooms').select('*');
                if (error) throw error;
                setRooms(data || []);
            } catch (error) {
                console.error('Error fetching rooms:', error);
                // Тут можно установить моковые данные при ошибке, если нужно
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
            
            if (error) throw error;

            const bookedRoomIds = new Set(conflictingBookings?.map(b => b.room_id) || []);
            const finalAvailableRooms = rooms.filter(
                room => room.capacity >= guestCount && !bookedRoomIds.has(room.id)
            );
            setFilteredRooms(finalAvailableRooms);
        } catch (error) {
            console.error('Error during search:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // --- ИЗМЕНЕНИЕ 2: Новая функция для открытия календаря ---
    const showDatePicker = (type: 'checkIn' | 'checkOut') => {
        if (type === 'checkIn') {
            setPickerConfig({
                date: checkInDate,
                onChange: (event: DateTimePickerEvent, date?: Date) => handleDateChange(date, 'checkIn'),
                minimumDate: new Date(),
            });
        } else {
            const minDate = new Date(checkInDate);
            minDate.setDate(minDate.getDate() + 1);
            setPickerConfig({
                date: checkOutDate,
                onChange: (event: DateTimePickerEvent, date?: Date) => handleDateChange(date, 'checkOut'),
                minimumDate: minDate,
            });
        }
        setPickerVisible(true);
    };

    // --- ИЗМЕНЕНИЕ 3: Единый обработчик для выбора даты ---
    const handleDateChange = (selectedDate: Date | undefined, type: 'checkIn' | 'checkOut') => {
        // Для Android нужно снова скрыть пикер, для iOS это не нужно, но не повредит
        if (Platform.OS === 'android') {
            setPickerVisible(false);
        }

        if (selectedDate) {
            if (type === 'checkIn') {
                setCheckInDate(selectedDate);
                // Если новая дата заезда позже или равна дате выезда, сдвигаем дату выезда
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

    if (initialLoading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1a2b47" /></View>;
    }
    
    // Функция для закрытия модального окна на iOS
    const closeIosPicker = () => {
        setPickerVisible(false);
    };

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.searchForm}>
                    <Text style={styles.searchTitle}>Find Your Perfect Room</Text>
                    
                    {/* Check-in Date */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Check-in Date</Text>
                        <TouchableOpacity style={styles.dateInput} onPress={() => showDatePicker('checkIn')}>
                            <Calendar size={20} color="#8a94a6" />
                            <Text style={styles.dateText}>{formatDate(checkInDate)}</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Check-out Date */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Check-out Date</Text>
                        <TouchableOpacity style={styles.dateInput} onPress={() => showDatePicker('checkOut')}>
                            <Calendar size={20} color="#8a94a6" />
                            <Text style={styles.dateText}>{formatDate(checkOutDate)}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Guest Count */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Number of Guests</Text>
                        <View style={styles.guestInput}>
                            <Users size={20} color="#8a94a6" />
                            <View style={styles.guestCounter}>
                                <TouchableOpacity style={styles.counterButton} onPress={decrementGuests}><Text style={styles.counterButtonText}>-</Text></TouchableOpacity>
                                <Text style={styles.guestCountText}>{guestCount}</Text>
                                <TouchableOpacity style={styles.counterButton} onPress={incrementGuests}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <><SearchIcon size={20} color="#fff" /><Text style={styles.searchButtonText}>Search Rooms</Text></>}
                    </TouchableOpacity>
                </View>
                
                {/* --- ИЗМЕНЕНИЕ 4: Отрисовываем календарь в модальном окне --- */}
                {Platform.OS === 'ios' ? (
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={isPickerVisible}
                        onRequestClose={closeIosPicker}
                    >
                        <Pressable style={styles.modalOverlay} onPress={closeIosPicker}>
                            <View style={styles.modalContent}>
                                <DateTimePicker
                                    value={pickerConfig.date}
                                    mode="date"
                                    display="inline"
                                    onChange={pickerConfig.onChange}
                                    minimumDate={pickerConfig.minimumDate}
                                />
                                <TouchableOpacity style={styles.doneButton} onPress={closeIosPicker}>
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Modal>
                ) : (
                    isPickerVisible && (
                        <DateTimePicker
                            value={pickerConfig.date}
                            mode="date"
                            display="default"
                            onChange={pickerConfig.onChange}
                            minimumDate={pickerConfig.minimumDate}
                        />
                    )
                )}

                {/* Results */}
                {searchPerformed && (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsTitle}>{filteredRooms.length} {filteredRooms.length === 1 ? 'Room' : 'Rooms'} Available</Text>
                        {filteredRooms.length > 0 ? (
                            filteredRooms.map((room) => (
                                <TouchableOpacity
                                    key={room.id}
                                    style={styles.roomCard}
                                    onPress={() => router.push({
                                        pathname: '/room-details',
                                        params: {
                                            id: room.id,
                                            checkIn: checkInDate.toISOString(),
                                            checkOut: checkOutDate.toISOString(),
                                            guests: guestCount
                                        }
                                    })}
                                >
                                    {/* Room Card content... */}
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.noResultsContainer}>
                                <Text>No rooms available for the selected criteria.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    // ... ваши старые стили остаются здесь ...
    container: { flex: 1, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    searchForm: { padding: 20, margin: 15, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    searchTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a2b47', marginBottom: 20 },
    inputContainer: { marginBottom: 15 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: '#1a2b47', marginBottom: 8 },
    dateInput: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: '#e1e5eb', borderRadius: 12, paddingHorizontal: 15, backgroundColor: '#f7f9fc' },
    dateText: { marginLeft: 10, fontSize: 16, color: '#1a2b47' },
    guestInput: { flexDirection: 'row', alignItems: 'center', height: 50, borderWidth: 1, borderColor: '#e1e5eb', borderRadius: 12, paddingHorizontal: 15, backgroundColor: '#f7f9fc', justifyContent: 'space-between' },
    guestCounter: { flexDirection: 'row', alignItems: 'center' },
    counterButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e1e5eb', justifyContent: 'center', alignItems: 'center' },
    counterButtonText: { fontSize: 18, fontWeight: 'bold', color: '#1a2b47' },
    guestCountText: { marginHorizontal: 15, fontSize: 16, fontWeight: '500', color: '#1a2b47' },
    searchButton: { backgroundColor: '#1a2b47', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, flexDirection: 'row' },
    searchButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 10 },
    resultsContainer: { padding: 15 },
    resultsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a2b47', marginBottom: 15 },
    noResultsContainer: { alignItems: 'center', padding: 30 },
    roomCard: { /* ... стили для карточки номера ... */ },

    // --- ИЗМЕНЕНИЕ 5: Новые стили для модального окна iOS ---
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    doneButton: {
        backgroundColor: '#1a2b47',
        borderRadius: 12,
        padding: 12,
        marginTop: 15,
        alignItems: 'center',
    },
    doneButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});