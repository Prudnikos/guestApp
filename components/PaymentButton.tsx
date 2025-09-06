import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PaymentService from '@/services/PaymentService';
import { supabase } from '@/lib/supabase';

interface PaymentButtonProps {
  booking: any;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  buttonText?: string;
  showTestCards?: boolean;
}

export default function PaymentButton({
  booking,
  onSuccess,
  onError,
  buttonText = 'Pay Now',
  showTestCards = true,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Инициализируем платёжный сервис
      const paymentService = new PaymentService({
        supabase: supabase,
        PAYHERE_MERCHANT_ID: '1231928',
        PAYHERE_MERCHANT_SECRET: 'Mjk3Mjc4NjA0OTI1OTU5MDczMjQyNzQ4NDQzNDI4MjEwMDc5MTk1',
        PAYHERE_SANDBOX: 'true'
      });

      // Создаём платёж
      const result = await paymentService.createBookingPayment(booking, {
        returnUrl: `https://pms.voda.center/payment/success?booking_id=${booking.id}`,
        cancelUrl: `https://pms.voda.center/payment/cancel?booking_id=${booking.id}`,
        notifyUrl: `https://pms.voda.center/api/payhere/webhook`
      });

      if (result.success) {
        // Формируем URL для оплаты
        const params = new URLSearchParams(result.paymentData);
        const paymentUrl = `${result.checkoutUrl}?${params.toString()}`;
        
        // Открываем браузер для оплаты
        const supported = await Linking.canOpenURL(paymentUrl);
        
        if (supported) {
          await Linking.openURL(paymentUrl);
          
          Alert.alert(
            'Payment Initiated',
            'You will be redirected to PayHere for payment. Please complete the payment in your browser.',
            [{ text: 'OK' }]
          );
          
          onSuccess?.({
            type: 'payment_initiated',
            orderId: result.orderId,
            checkoutUrl: result.checkoutUrl
          });
        } else {
          throw new Error('Cannot open payment URL');
        }
      } else {
        throw new Error(result.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to process payment',
        [{ text: 'OK' }]
      );
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const balance = (booking.total_amount || 0) - (booking.amount_paid || 0);
  const displayText = buttonText === 'Pay Now' 
    ? `Pay $${balance.toFixed(2)}` 
    : buttonText;

  const isInSandbox = true; // Всегда sandbox для тестирования

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handlePayment}
        disabled={loading || balance <= 0}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="card-outline" size={20} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>{displayText}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Показываем тестовые карты в sandbox режиме */}
      {showTestCards && isInSandbox && (
        <View style={styles.testCardsContainer}>
          <Text style={styles.testCardsTitle}>🧪 Test Cards (Sandbox):</Text>
          <View style={styles.testCardsList}>
            <Text style={styles.testCardItem}>
              <Text style={styles.bold}>Visa:</Text> 4916217501611292
            </Text>
            <Text style={styles.testCardItem}>
              <Text style={styles.bold}>MasterCard:</Text> 5307732201611298
            </Text>
            <Text style={styles.testCardItem}>
              <Text style={styles.bold}>Amex:</Text> 346781005510225
            </Text>
          </View>
          <Text style={styles.testCardsNote}>
            CVV: any, Expiry: any future date
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#6B46C1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: 8,
  },
  testCardsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  testCardsTitle: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  testCardsList: {
    marginVertical: 8,
  },
  testCardItem: {
    fontSize: 12,
    marginVertical: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bold: {
    fontWeight: '600',
  },
  testCardsNote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
  },
});