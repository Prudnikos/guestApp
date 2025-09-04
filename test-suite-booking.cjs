const ChannexBookingService = require('./services/ChannexBookingService.js').default;

// Тестовые данные для бронирования Suite
const testSuiteBooking = {
  guest_id: 'test-guest-123',
  room_id: '438cf2e0-b0e3-4464-b38b-3cc3ab92b03c', // ID Suite из базы
  room_number: 'Suite', // Важно: передаем "Suite" как room_number
  check_in: '2025-01-10T14:00:00',
  check_out: '2025-01-12T12:00:00',
  guests_count: 2,
  total_amount: 600,
  total_price: 600,
  status: 'confirmed',
  source: 'guest_app',
  guest_name: 'Test Suite Guest',
  guest_email: 'testsuite@example.com',
  guest_phone: '+1234567890'
};

async function runTest() {
  console.log('🧪 Тестируем бронирование Suite через GuestApp...');
  console.log('📋 Данные бронирования:', JSON.stringify(testSuiteBooking, null, 2));
  
  try {
    const result = await ChannexBookingService.createBooking(testSuiteBooking);
    
    if (result.success) {
      console.log('✅ Бронирование создано успешно!');
      console.log('📦 Результат:', JSON.stringify(result.booking, null, 2));
      
      // Проверяем, что room_type_id правильный
      if (result.booking.channex_id) {
        console.log('✨ Channex ID:', result.booking.channex_id);
        console.log('🎯 Проверьте в Channex, что бронирование создано для Deluxe suite apartment');
      }
    } else {
      console.error('❌ Ошибка при создании бронирования');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.response?.data) {
      console.error('Детали ошибки:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runTest();