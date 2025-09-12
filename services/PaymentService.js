/**
 * Универсальный сервис платежей
 * Может использоваться в PMS, сайте отеля и мобильном приложении
 */

class PaymentService {
  constructor(config = {}) {
    // PayHere configuration
    this.payhere = {
      merchantId: config.PAYHERE_MERCHANT_ID || process.env.VITE_PAYHERE_MERCHANT_ID || '1231928',
      merchantSecret: config.PAYHERE_MERCHANT_SECRET || process.env.VITE_PAYHERE_MERCHANT_SECRET || 'Mjk3Mjc4NjA0OTI1OTU5MDczMjQyNzQ4NDQzNDI4MjEwMDc5MTk1',
      sandbox: config.PAYHERE_SANDBOX === 'true' || process.env.VITE_PAYHERE_SANDBOX === 'true',
      checkoutUrl: null,
      apiUrl: null
    };

    // Set URLs based on sandbox mode
    this.payhere.checkoutUrl = this.payhere.sandbox 
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';
    
    this.payhere.apiUrl = this.payhere.sandbox
      ? 'https://sandbox.payhere.lk/merchant/v1'
      : 'https://www.payhere.lk/merchant/v1';

    // Supabase configuration
    this.supabase = config.supabase || null;
    
    console.log('💳 Payment Service initialized', {
      mode: this.payhere.sandbox ? 'SANDBOX' : 'PRODUCTION',
      merchantId: this.payhere.merchantId
    });
  }

  /**
   * Создание платежа для бронирования
   */
  async createBookingPayment(booking, options = {}) {
    const baseUrl = typeof window !== 'undefined' && window.location 
      ? window.location.origin 
      : 'https://voda.center';
    
    const {
      returnUrl = `${baseUrl}/payment/success`,
      cancelUrl = `${baseUrl}/payment/cancel`,
      notifyUrl = `${baseUrl}/api/payhere/webhook`,
      currency = 'USD'
    } = options;

    try {
      // Генерируем order ID
      const orderId = this.generateOrderId(booking.id);
      
      // Подготавливаем данные платежа
      const paymentData = {
        // Обязательные поля PayHere
        merchant_id: this.payhere.merchantId,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        
        // Информация о заказе
        order_id: orderId,
        items: `Hotel Booking #${booking.id}`,
        currency: currency,
        amount: parseFloat(booking.total_amount || booking.amount).toFixed(2),
        
        // Информация о клиенте
        first_name: booking.guest_name?.split(' ')[0] || 'Guest',
        last_name: booking.guest_name?.split(' ').slice(1).join(' ') || '',
        email: booking.guest_email || '',
        phone: booking.guest_phone || '',
        address: booking.guest_address || '',
        city: booking.guest_city || '',
        country: booking.guest_country || 'Sri Lanka',
        
        // Хэш для проверки
        hash: await this.generatePayHereHash(orderId, booking.total_amount || booking.amount, currency)
      };

      // Добавляем custom поля для tracking
      paymentData.custom_1 = booking.id;
      paymentData.custom_2 = booking.room_id || '';

      // Сохраняем информацию о платеже в БД
      if (this.supabase) {
        await this.savePaymentIntent(booking.id, orderId, booking.total_amount || booking.amount, currency);
      }

      return {
        success: true,
        checkoutUrl: this.payhere.checkoutUrl,
        paymentData: paymentData,
        orderId: orderId
      };

    } catch (error) {
      console.error('❌ Error creating payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Подготовка платежа для PayHere (для мобильного приложения)
   */
  async preparePayHerePayment(options = {}) {
    const {
      orderId,
      amount,
      currency = 'USD',
      description = 'Hotel Booking',
      customer = {},
      bookingId = null
    } = options;

    try {
      const baseUrl = 'https://voda.center';
      
      // Генерация хеша для безопасности
      const hash = await this.generatePayHereHash(orderId, amount, currency);
      
      // Подготовка данных для PayHere
      const paymentData = {
        merchant_id: this.payhere.merchantId,
        return_url: `${baseUrl}/payment/success`,
        cancel_url: `${baseUrl}/payment/cancel`,
        notify_url: `${baseUrl}/api/payhere/webhook`,
        order_id: orderId,
        items: description,
        currency: currency,
        amount: parseFloat(amount).toFixed(2),
        first_name: customer.firstName || 'Guest',
        last_name: customer.lastName || 'User',
        email: customer.email || 'guest@hotel.com',
        phone: customer.phone || '+94777123456',
        address: customer.address || 'Hotel Address',
        city: customer.city || 'Colombo',
        country: 'Sri Lanka',
        hash: hash,
        custom_1: bookingId || '',
        custom_2: ''
      };

      return {
        paymentUrl: this.payhere.checkoutUrl,
        paymentData: paymentData
      };

    } catch (error) {
      console.error('❌ Error preparing PayHere payment:', error);
      throw error;
    }
  }

  /**
   * Генерация Order ID
   */
  generateOrderId(bookingId) {
    const shortId = bookingId ? bookingId.slice(-8) : Date.now().toString().slice(-8);
    const timestamp = Date.now().toString().slice(-6);
    return `PMS-${shortId}-${timestamp}`;
  }

  /**
   * Генерация MD5 хэша для PayHere
   */
  async generatePayHereHash(orderId, amount, currency) {
    const merchantSecret = this.payhere.merchantSecret.toUpperCase();
    const formattedAmount = parseFloat(amount).toFixed(2);
    const hashString = `${this.payhere.merchantId}${orderId}${formattedAmount}${currency}${merchantSecret}`;
    
    // Используем crypto-js для всех платформ (браузер, React Native)
    try {
      const CryptoJS = await import('crypto-js');
      const MD5 = CryptoJS.default?.MD5 || CryptoJS.MD5;
      return MD5(hashString).toString().toUpperCase();
    } catch (e) {
      console.error('Error loading crypto-js:', e);
      // Fallback на простую реализацию
      return this.md5Browser(hashString);
    }
  }

  /**
   * MD5 для браузера (fallback)
   */
  md5Browser(str) {
    // Используем правильный алгоритм MD5
    function md5cycle(x, k) {
      var a = x[0], b = x[1], c = x[2], d = x[3];
      
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);

      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);

      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);

      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);

      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }

    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
      return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
      return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
      return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
      return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function md51(s) {
      let n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878], i;
      for (i = 64; i <= s.length; i += 64) {
        md5cycle(state, md5blk(s.substring(i - 64, i)));
      }
      s = s.substring(i - 64);
      let tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (i = 0; i < s.length; i++)
        tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }

    function md5blk(s) {
      let md5blks = [], i;
      for (i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i)
          + (s.charCodeAt(i + 1) << 8)
          + (s.charCodeAt(i + 2) << 16)
          + (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }

    let hex_chr = '0123456789abcdef'.split('');

    function rhex(n) {
      let s = '', j = 0;
      for (; j < 4; j++)
        s += hex_chr[(n >> (j * 8 + 4)) & 0x0f]
          + hex_chr[(n >> (j * 8)) & 0x0f];
      return s;
    }

    function hex(x) {
      for (let i = 0; i < x.length; i++)
        x[i] = rhex(x[i]);
      return x.join('');
    }

    function add32(a, b) {
      return (a + b) & 0xFFFFFFFF;
    }

    return hex(md51(str)).toUpperCase();
  }

  /**
   * Сохранение информации о платеже в БД
   */
  async savePaymentIntent(bookingId, orderId, amount, currency) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('payment_intents')
        .insert({
          booking_id: bookingId,
          order_id: orderId,
          amount: amount,
          currency: currency,
          status: 'pending',
          provider: 'payhere',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving payment intent:', error);
      }
    } catch (error) {
      console.error('Error saving payment intent:', error);
    }
  }

  /**
   * Обработка webhook от PayHere
   */
  async processWebhook(data) {
    try {
      // Проверяем подпись
      const isValid = await this.verifyWebhookSignature(data);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const {
        order_id,
        payment_id,
        payhere_amount,
        payhere_currency,
        status_code,
        custom_1: bookingId
      } = data;

      // Маппинг статусов PayHere
      const statusMap = {
        '2': 'success',
        '0': 'pending',
        '-1': 'cancelled',
        '-2': 'failed',
        '-3': 'refunded'
      };

      const status = statusMap[status_code] || 'unknown';

      // Обновляем статус платежа в БД
      if (this.supabase && bookingId) {
        await this.updatePaymentStatus(bookingId, {
          payment_status: status === 'success' ? 'paid' : status,
          payment_id: payment_id,
          payment_method: 'payhere',
          amount_paid: status === 'success' ? parseFloat(payhere_amount) : 0,
          payment_date: status === 'success' ? new Date().toISOString() : null
        });
      }

      return {
        success: true,
        bookingId: bookingId,
        orderId: order_id,
        paymentId: payment_id,
        status: status,
        amount: parseFloat(payhere_amount),
        currency: payhere_currency
      };

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Проверка подписи webhook
   */
  async verifyWebhookSignature(data) {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      md5sig
    } = data;

    // Проверяем merchant_id
    if (merchant_id !== this.payhere.merchantId) {
      console.error('❌ Invalid merchant_id in webhook');
      return false;
    }

    // Генерируем локальный хэш для проверки
    const localMd5 = await this.generatePayHereHash(order_id, payhere_amount, payhere_currency);

    // Сравниваем хэши
    const isValid = localMd5 === md5sig.toUpperCase();
    
    if (!isValid) {
      console.error('❌ PayHere webhook signature verification failed');
    } else {
      console.log('✅ PayHere webhook signature verified');
    }

    return isValid;
  }

  /**
   * Обновление статуса платежа в БД
   */
  async updatePaymentStatus(bookingId, updates) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating payment status:', error);
        return { success: false, error };
      }

      // Также создаем запись в таблице payments
      if (updates.payment_status === 'paid') {
        await this.supabase
          .from('payments')
          .insert({
            booking_id: bookingId,
            amount: updates.amount_paid,
            currency: 'USD',
            payment_method: updates.payment_method,
            payment_provider: 'payhere',
            transaction_id: updates.payment_id,
            status: 'completed',
            created_at: updates.payment_date
          });
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error };
    }
  }

  /**
   * Инициация возврата
   */
  async refundPayment(paymentId, amount = null) {
    // TODO: Implement refund via PayHere API
    console.log('Refund feature coming soon');
    return {
      success: false,
      error: 'Refund feature not yet implemented'
    };
  }

  /**
   * Получение тестовых карт для sandbox
   */
  getTestCards() {
    if (!this.payhere.sandbox) {
      return null;
    }

    return {
      visa: {
        number: '4916217501611292',
        cvv: '123',
        expiry: '12/25',
        name: 'Test User'
      },
      mastercard: {
        number: '5307732201611298',
        cvv: '123',
        expiry: '12/25',
        name: 'Test User'
      },
      amex: {
        number: '346781005510225',
        cvv: '1234',
        expiry: '12/25',
        name: 'Test User'
      }
    };
  }
}

// Экспорт для использования в разных окружениях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentService;
} else {
  window.PaymentService = PaymentService;
}

export default PaymentService;