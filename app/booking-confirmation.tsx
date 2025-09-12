import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import CustomAlert from '@/components/CustomAlert';
import ChannexBookingService from '@/services/ChannexBookingService';
import PaymentService from '@/services/PaymentService';
import PayHereWebView from '@/components/PayHereWebView';

export default function BookingConfirmationScreen() {
    const { roomId, checkIn, checkOut, guests, roomName, pricePerNight, totalPrice, imageUrl } = useLocalSearchParams();
    const auth = useAuth();
  const user = auth?.user;
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [tentativeBookingId, setTentativeBookingId] = useState(null);

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const calculateNights = () => {
        if (!checkIn || !checkOut) return 0;
        const nights = Math.ceil(Math.abs(new Date(checkOut as string).getTime() - new Date(checkIn as string).getTime()) / (1000 * 60 * 60 * 24));
        return nights > 0 ? nights : 1;
    };
    
    const handleConfirmBooking = async () => {
        if (!fullName.trim() || !phone.trim() || !email.trim()) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        if (!user) {
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            // Сначала обновляем профиль гостя
            const { error: profileError } = await supabase
                .from('guests')
                .upsert({ id: user.id, email: email.trim(), full_name: fullName.trim(), phone: phone.trim() });
            
            if (profileError) throw profileError;

            // Подготавливаем данные для бронирования через Channex
            // ИСПРАВЛЕНО: Для Suite явно передаем правильный room_number
            const correctRoomNumber = (roomName === 'Suite' || (roomName as string)?.toLowerCase().includes('suite')) ? 'Suite' : (roomName as string);
            
            const bookingData = {
                guest_id: user.id,
                room_id: roomId as string,
                room_number: correctRoomNumber, // Используем исправленный room_number
                check_in: new Date(checkIn as string).toISOString(),
                check_out: new Date(checkOut as string).toISOString(),
                guests_count: parseInt(guests as string),
                total_amount: parseFloat(totalPrice as string),
                total_price: parseFloat(totalPrice as string), // Дублируем для совместимости
                status: 'confirmed',
                source: 'guest_app',
                // Данные гостя для Channex
                guest_name: fullName.trim(),
                guest_email: email.trim(),
                guest_phone: phone.trim()
            };

            console.log('Booking data for Channex:', bookingData);

            // ЖЕЛЕЗНОЕ ПРАВИЛО #1: Создаем TENTATIVE бронирование через Channex API
            const tentativeResult = await ChannexBookingService.createTentativeBooking(bookingData);
            
            if (!tentativeResult.success) {
                throw new Error(tentativeResult.error || 'Failed to create tentative booking');
            }
            
            console.log('Tentative booking created:', tentativeResult.booking);
            setTentativeBookingId(tentativeResult.booking.id);
            
            // Подготавливаем данные для PayHere
            const paymentService = new PaymentService();
            const orderId = `APP-${tentativeResult.booking.id}-${Date.now()}`;
            const amount = parseFloat(totalPrice as string);
            
            const payHereData = await paymentService.preparePayHerePayment({
                orderId,
                amount,
                currency: 'USD',
                description: `Booking for ${roomName}`,
                customer: {
                    firstName: fullName.split(' ')[0],
                    lastName: fullName.split(' ').slice(1).join(' ') || fullName.split(' ')[0],
                    email: email.trim(),
                    phone: phone.trim()
                },
                bookingId: tentativeResult.booking.id
            });
            
            // Показываем PayHere WebView для оплаты
            setPaymentData(payHereData);
            setShowPayment(true);
            setLoading(false);
            
        } catch (error) {
            console.error('Error creating booking:', error);
            
            // Проверяем тип ошибки и показываем соответствующее сообщение
            if (error.message?.includes('unavailable')) {
                Alert.alert(
                    'Service Temporarily Unavailable', 
                    'The booking service is currently unavailable. Please try again in a few minutes.',
                    [{ text: 'OK' }]
                );
            } else if (error.message?.includes('Booking failed:')) {
                Alert.alert('Booking Failed', error.message, [{ text: 'OK' }]);
            } else {
                Alert.alert(
                    'Error', 
                    `Failed to create booking: ${error.message || 'Unknown error'}`,
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // Обработка успешной оплаты
    const handlePaymentSuccess = async (paymentId: string) => {
        console.log('✅ Payment successful:', paymentId);
        setShowPayment(false);
        
        // Показываем успешное окно
        setSuccessModalVisible(true);
        
        // Обновляем статус бронирования на сервере
        // Webhook уже должен был это сделать, но можно проверить
        try {
            await ChannexBookingService.confirmBooking(tentativeBookingId, paymentId);
        } catch (error) {
            console.log('Booking already confirmed by webhook');
        }
    };
    
    // Обработка отмены оплаты
    const handlePaymentCancel = () => {
        console.log('❌ Payment cancelled');
        setShowPayment(false);
        setLoading(false);
        
        Alert.alert(
            'Payment Cancelled',
            'Your booking has been cancelled. The room is still available if you want to try again.',
            [{ text: 'OK' }]
        );
    };
    
    // Обработка ошибки оплаты
    const handlePaymentError = (error: string) => {
        console.log('❌ Payment error:', error);
        setShowPayment(false);
        setLoading(false);
        
        Alert.alert(
            'Payment Failed',
            error || 'An error occurred during payment. Please try again.',
            [{ text: 'OK' }]
        );
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Confirm Booking', headerBackTitle: 'Back' }} />
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
                    
                    {imageUrl && (
                        <Image source={{ uri: imageUrl as string }} style={styles.roomImage} />
                    )}
                    
                    <View style={styles.summaryContainer}>
                        <Text style={styles.sectionTitle}>Booking Summary</Text>
                        <View style={styles.roomInfo}>
                            <Text style={styles.roomName}>{roomName}</Text>
                            <View style={styles.detailItem}>
                                <Ionicons name="calendar" size={16} color="#8a94a6"  />
                                <Text style={styles.detailText}>{formatDate(checkIn as string)} - {formatDate(checkOut as string)}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="person" size={16} color="#8a94a6" />
                                <Text style={styles.detailText}>{guests} {parseInt(guests as string) === 1 ? 'Guest' : 'Guests'}</Text>
                            </View>
                        </View>
                        <View style={styles.priceBreakdown}>
                            <View style={styles.priceRow}><Text style={styles.priceLabel}>${pricePerNight} x {calculateNights()} nights</Text><Text style={styles.priceValue}>${parseInt(pricePerNight as string) * calculateNights()}</Text></View>
                            <View style={styles.priceRow}><Text style={styles.priceLabel}>Taxes & fees</Text><Text style={styles.priceValue}>${(parseFloat(totalPrice as string) - (parseInt(pricePerNight as string) * calculateNights())).toFixed(2)}</Text></View>
                            <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>${totalPrice}</Text></View>
                        </View>
                    </View>
                    
                    <View style={styles.formContainer}>
                        <Text style={styles.sectionTitle}>Guest Information</Text>
                        <View style={styles.inputContainer}><Text style={styles.label}>Full Name *</Text><View style={styles.inputWrapper}><Ionicons name="person" size={20} color="#8a94a6" /><TextInput style={styles.input} placeholder="Enter your full name" value={fullName} onChangeText={setFullName} /></View></View>
                        <View style={styles.inputContainer}><Text style={styles.label}>Phone Number *</Text><View style={styles.inputWrapper}><Ionicons name="call" size={20} color="#8a94a6" /><TextInput style={styles.input} placeholder="Enter your phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></View></View>
                        <View style={styles.inputContainer}><Text style={styles.label}>Email Address *</Text><View style={styles.inputWrapper}><Ionicons name="mail" size={20} color="#8a94a6" /><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" editable={!loading} /></View></View>
                    </View>
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBooking} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Proceed to Payment</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            
            <CustomAlert
                visible={isSuccessModalVisible}
                title="Booking Confirmed!"
                message={`Your room "${roomName}" has been successfully booked.`}
                buttons={[
                    {
                        text: 'View My Bookings',
                        onPress: () => {
                            setSuccessModalVisible(false);
                            // Use push instead of replace to ensure the bookings page refreshes
                            router.push('/(tabs)/booking');
                        },
                        style: 'primary',
                    },
                    {
                        text: 'Close',
                        onPress: () => {
                            setSuccessModalVisible(false);
                            router.back();
                        },
                        style: 'secondary',
                    }
                ]}
            />
            
            {/* PayHere Payment WebView */}
            {showPayment && paymentData && (
                <PayHereWebView
                    visible={showPayment}
                    paymentData={paymentData}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                    onError={handlePaymentError}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    roomImage: { width: '100%', height: 200 },
    summaryContainer: { padding: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a2b47', marginBottom: 20 },
    roomInfo: { marginBottom: 20 },
    roomName: { fontSize: 18, fontWeight: '600', color: '#1a2b47', marginBottom: 10 },
    detailItem: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    detailText: { marginLeft: 10, fontSize: 16, color: '#555' },
    priceBreakdown: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e1e5eb' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    priceLabel: { fontSize: 16, color: '#555' },
    priceValue: { fontSize: 16, color: '#1a2b47' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1a2b47' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: '#1a2b47' },
    formContainer: { padding: 20, paddingTop: 10 },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '500', color: '#1a2b47', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f9fc', borderRadius: 12, borderWidth: 1, borderColor: '#e1e5eb', height: 55, paddingHorizontal: 15 },
    input: { flex: 1, marginLeft: 10, fontSize: 16 },
    buttonContainer: { 
        padding: 20, 
        backgroundColor: '#fff', 
        marginTop: 10,
        marginBottom: 10,
    },
    confirmButton: { 
        backgroundColor: '#1a2b47', 
        height: 55, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});