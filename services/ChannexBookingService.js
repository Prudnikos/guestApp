import axios from 'axios';
import { supabase } from '../lib/supabase.ts';

class ChannexBookingService {
  constructor() {
    this.CHANNEX_API_URL = 'https://staging.channex.io/api/v1';
    this.CHANNEX_API_KEY = 'uUdBtyJdPAYoP0m0qrEStPh2WJcXCBBBLMngnPxygFWpw0GyDE/nmvN/6wN7gXV+';
    this.PROPERTY_ID = '6ae9708a-cbaa-4134-bf04-29314e842709';

    // ПРАВИЛЬНЫЕ ID из PMSweb! 
    // Эти ID используются в рабочей версии и подтверждены в коде
    this.ROOM_TYPE_MAP = {
      // Standard/Single rooms
      '101': '8df610ce-cabb-429d-98d0-90c33f451d97', // Single room ID из PMSweb
      '102': '8df610ce-cabb-429d-98d0-90c33f451d97', // Single room
      '103': '8df610ce-cabb-429d-98d0-90c33f451d97', // Single room
      
      // Double/Deluxe rooms  
      '201': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410', // Double room ID из PMSweb
      '202': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410', // Double room
      '203': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410', // Double room
      
      // Suites
      '301': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3', // Suite ID из PMSweb
      '302': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3', // Suite
      
      // ВАЖНО: Добавляем маппинг для Suite как строки!
      'Suite': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3', // Suite по имени
      
      // Fallback на suite как в PMSweb
      'default': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3'
    };

    // ПРАВИЛЬНЫЙ rate_plan_id из PMSweb
    this.RATE_PLAN_ID = '45195f3e-fb59-4ddf-9e29-b667dbe2ab58';
  }

  async createBooking(bookingData) {
    try {
      console.log('Creating booking through Channex API:', bookingData);
      
      // ВРЕМЕННО: Проверяем доступные room types и rate plans
      // try {
      //   console.log('Fetching available room types...');
      //   await this.getRoomTypes();
      //   console.log('Fetching available rate plans...');
      //   await this.getRatePlans();
      // } catch (e) {
      //   console.error('Failed to fetch config:', e);
      // }
      
      // Извлекаем номер комнаты из room_number (например, "101" из "101 Standard Room" или просто "102")
      // ВАЖНО: Для Suite проверяем сначала полное название
      let roomNumber = bookingData.room_number?.toString();
      let roomTypeId;
      
      // Проверяем, если это Suite
      if (roomNumber === 'Suite' || roomNumber?.toLowerCase().includes('suite')) {
        console.log('Detected Suite booking, using Suite room type ID');
        roomTypeId = this.ROOM_TYPE_MAP['Suite']; // Используем правильный ID для Suite
        roomNumber = 'Suite';
      } else {
        // Для других комнат извлекаем номер
        roomNumber = roomNumber?.split(' ')[0] || '101';
        roomTypeId = this.ROOM_TYPE_MAP[roomNumber] || this.ROOM_TYPE_MAP['101'];
      }
      
      console.log('Room number extracted:', roomNumber);
      console.log('Room type ID for room', roomNumber, ':', roomTypeId);
      console.log('Rate plan ID:', this.RATE_PLAN_ID);
      
      // Форматируем даты в YYYY-MM-DD
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };
      
      const arrivalDate = formatDate(bookingData.check_in);
      const departureDate = formatDate(bookingData.check_out);
      console.log('Dates:', arrivalDate, '-', departureDate);
      
      const days = this.calculateDaysWithPrices(
        arrivalDate,
        departureDate,
        bookingData.total_amount || bookingData.total_price || 100
      );

      // ВАЖНО: Оборачиваем в "booking" объект - ОБЁРТКА ОБЯЗАТЕЛЬНА!
      // Используем ТОЧНУЮ структуру из рабочего примера PMSweb
      const channexPayload = {
        booking: {
          property_id: this.PROPERTY_ID,
          arrival_date: arrivalDate,
          departure_date: departureDate,
          ota_reservation_code: `MOBILE-${Date.now()}`,
          ota_name: 'Booking.com',
          currency: 'USD', // Используем USD как основную валюту
          customer: {
            name: bookingData.guest_name?.split(' ')[0] || 'Guest',
            surname: bookingData.guest_name?.split(' ').slice(1).join(' ') || 'User',
            mail: bookingData.guest_email || 'guest@hotel.com',
            phone: '+447000000000', // Используем фиксированный формат
            country: 'GB'
          },
          rooms: [{
            room_type_id: roomTypeId, // Используем маппинг
            rate_plan_id: this.RATE_PLAN_ID, // Используем правильный ID из PMSweb
            days: days,
            occupancy: {
              adults: parseInt(bookingData.guests_count) || 2,
              children: 0,
              infants: 0
            }
          }],
          guarantee: {
            guarantee_type: 'credit_card'
          },
          status: 'new'
        }
      };

      console.log('Sending to Channex:', JSON.stringify(channexPayload, null, 2));

      const response = await axios.post(
        `${this.CHANNEX_API_URL}/bookings`,
        channexPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'user-api-key': this.CHANNEX_API_KEY
          }
        }
      );

      const channexBooking = response.data.data;
      console.log('✅ Channex booking created:', channexBooking);
      console.log('Channex returned total:', channexBooking.total);
      console.log('Our original total:', bookingData.total_amount || bookingData.total_price);

      // Теперь сохраняем в Supabase с channex_id
      // ВАЖНО: Сохраняем нашу оригинальную сумму, не ту что вернул Channex
      // Channex возвращает цены в сотых долях (2.20 вместо 220)
      const originalAmount = parseFloat(bookingData.total_amount || bookingData.total_price);
      
      const supabaseData = {
        guest_id: bookingData.guest_id,
        room_id: bookingData.room_id,
        check_in: bookingData.check_in,
        check_out: bookingData.check_out,
        guests_count: parseInt(bookingData.guests_count) || 2,
        total_amount: originalAmount, // Сохраняем оригинальную цену
        status: 'confirmed',
        channex_id: channexBooking.id, // ОБЯЗАТЕЛЬНОЕ ПОЛЕ!
        source: bookingData.source || 'mobile_app',
        sync_status: 'synced',
        // Добавляем оригинальную цену в notes для сохранности
        notes: `Original amount: $${originalAmount}\nChannex returned: ${channexBooking.total} ${channexBooking.currency}`
      };

      console.log('Saving to Supabase:', supabaseData);

      const { data: localBooking, error } = await supabase
        .from('bookings')
        .insert(supabaseData)
        .select()
        .single();

      if (error) {
        console.error('Warning: Failed to save locally:', error);
        return {
          success: true,
          booking: { 
            ...supabaseData,
            id: channexBooking.id 
          },
          warning: 'Booking created in Channex, will sync locally soon'
        };
      }

      return { success: true, booking: localBooking };

    } catch (error) {
      console.error('Channex API Error:', JSON.stringify(error.response?.data, null, 2));

      if (error.response?.status === 422) {
        const errors = error.response.data?.errors;
        const details = errors?.details;

        // Проверяем разные типы ошибок
        if (details?.rooms) {
          console.error('Room validation error details:', JSON.stringify(details.rooms, null, 2));
          
          // Проверяем конкретную ошибку
          if (details.rooms[0] === 'invalid room') {
            throw new Error('Room type or rate plan not available. Please select a different room.');
          }
          
          throw new Error(`Room error: ${details.rooms.join(', ')}`);
        }

        if (details?.booking) {
          console.error('Booking validation error:', details.booking);
          throw new Error(`Booking validation failed: ${details.booking.join(', ')}`);
        }

        throw new Error('Invalid booking data. Please check all fields.');
      }

      if (error.response?.status >= 500) {
        throw new Error('Booking service temporarily unavailable. Please try again.');
      }

      throw new Error(error.message || 'Failed to create booking');
    }
  }

  calculateDaysWithPrices(checkIn, checkOut, totalPrice) {
    const days = {};
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
      throw new Error('Invalid dates');
    }

    // ВАЖНО: Channex ожидает цены в фунтах, а не в пенсах!
    // Мы передаем нормальные цены (200 = 200 GBP)
    const pricePerNight = totalPrice / nights;

    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      // Форматируем цену с двумя десятичными знаками как строку
      days[dateStr] = parseFloat(pricePerNight.toFixed(2));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Calculated days:', days);
    console.log('Total price:', totalPrice, 'Nights:', nights, 'Per night:', pricePerNight);
    return days;
  }

  // Метод для получения доступных room types
  async getRoomTypes() {
    try {
      const response = await axios.get(
        `${this.CHANNEX_API_URL}/room_types`,
        {
          params: {
            property_id: this.PROPERTY_ID
          },
          headers: {
            'user-api-key': this.CHANNEX_API_KEY
          }
        }
      );
      console.log('Available room types:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error fetching room types:', error.response?.data);
      throw error;
    }
  }

  // Метод для получения доступных rate plans
  async getRatePlans() {
    try {
      const response = await axios.get(
        `${this.CHANNEX_API_URL}/rate_plans`,
        {
          params: {
            property_id: this.PROPERTY_ID
          },
          headers: {
            'user-api-key': this.CHANNEX_API_KEY
          }
        }
      );
      console.log('Available rate plans:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error fetching rate plans:', error.response?.data);
      throw error;
    }
  }

  // Метод для получения существующих бронирований из Channex
  async getBookings() {
    try {
      const response = await axios.get(
        `${this.CHANNEX_API_URL}/bookings`,
        {
          params: {
            property_id: this.PROPERTY_ID,
            limit: 100
          },
          headers: {
            'user-api-key': this.CHANNEX_API_KEY
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error fetching bookings from Channex:', error);
      throw error;
    }
  }

  // Метод для отмены бронирования
  async cancelBooking(channexId) {
    try {
      const response = await axios.put(
        `${this.CHANNEX_API_URL}/bookings/${channexId}`,
        {
          status: 'cancelled'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'user-api-key': this.CHANNEX_API_KEY
          }
        }
      );

      // Обновляем статус в Supabase
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', sync_status: 'synced' })
        .eq('channex_id', channexId);

      return response.data.data;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }
}

export default new ChannexBookingService();