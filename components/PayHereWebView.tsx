import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface PayHereWebViewProps {
  visible: boolean;
  paymentData: any;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export default function PayHereWebView({
  visible,
  paymentData,
  onSuccess,
  onCancel,
  onError
}: PayHereWebViewProps) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    console.log('Navigation URL:', url);

    // Check for success URL
    if (url.includes('/payment/success') || url.includes('payment_success')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const paymentId = urlParams.get('payment_id') || urlParams.get('order_id') || 'unknown';
      onSuccess(paymentId);
    }
    // Check for cancel URL
    else if (url.includes('/payment/cancel') || url.includes('payment_cancel')) {
      onCancel();
    }
    // Check for error URL
    else if (url.includes('/payment/error') || url.includes('payment_error')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const errorMessage = urlParams.get('error') || 'Payment failed';
      onError(errorMessage);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', message);
      
      if (message.type === 'payment_success') {
        onSuccess(message.paymentId);
      } else if (message.type === 'payment_cancel') {
        onCancel();
      } else if (message.type === 'payment_error') {
        onError(message.error || 'Payment failed');
      }
    } catch (e) {
      console.log('WebView message parse error:', e);
    }
  };

  if (!visible || !paymentData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1a2b47" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <View style={styles.placeholder} />
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a2b47" />
            <Text style={styles.loadingText}>Loading payment gateway...</Text>
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ uri: paymentData.paymentUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          style={styles.webView}
          // Inject JavaScript to detect payment events
          injectedJavaScript={`
            (function() {
              // Listen for PayHere events
              window.addEventListener('message', function(e) {
                window.ReactNativeWebView.postMessage(JSON.stringify(e.data));
              });
              
              // Check for success/error indicators in the DOM
              setInterval(function() {
                var successElement = document.querySelector('.payment-success, #payment-success, [data-payment-success]');
                var errorElement = document.querySelector('.payment-error, #payment-error, [data-payment-error]');
                var cancelElement = document.querySelector('.payment-cancel, #payment-cancel, [data-payment-cancel]');
                
                if (successElement) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'payment_success',
                    paymentId: successElement.getAttribute('data-payment-id') || 'unknown'
                  }));
                } else if (errorElement) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'payment_error',
                    error: errorElement.getAttribute('data-error-message') || 'Payment failed'
                  }));
                } else if (cancelElement) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'payment_cancel'
                  }));
                }
              }, 1000);
              
              true; // Required for Android
            })();
          `}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5eb',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b47',
  },
  placeholder: {
    width: 40,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#8a94a6',
  },
});