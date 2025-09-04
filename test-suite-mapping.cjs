// Простой тест для проверки маппинга Suite

// Копируем логику маппинга из ChannexBookingService.js
const ROOM_TYPE_MAP = {
  // Standard/Single rooms
  '101': '8df610ce-cabb-429d-98d0-90c33f451d97',
  '102': '8df610ce-cabb-429d-98d0-90c33f451d97',
  '103': '8df610ce-cabb-429d-98d0-90c33f451d97',
  
  // Double/Deluxe rooms  
  '201': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
  '202': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
  '203': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
  
  // Suites
  '301': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
  '302': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
  
  // ВАЖНО: Добавляем маппинг для Suite как строки!
  'Suite': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
  
  // Fallback на suite как в PMSweb
  'default': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3'
};

function testRoomMapping(room_number) {
  console.log(`\n📋 Тестируем: "${room_number}"`);
  
  let roomNumber = room_number?.toString();
  let roomTypeId;
  
  // Проверяем, если это Suite
  if (roomNumber === 'Suite' || roomNumber?.toLowerCase().includes('suite')) {
    console.log('✅ Detected Suite booking, using Suite room type ID');
    roomTypeId = ROOM_TYPE_MAP['Suite'];
    roomNumber = 'Suite';
  } else {
    // Для других комнат извлекаем номер
    roomNumber = roomNumber?.split(' ')[0] || '101';
    roomTypeId = ROOM_TYPE_MAP[roomNumber] || ROOM_TYPE_MAP['101'];
  }
  
  console.log('Room number extracted:', roomNumber);
  console.log('Room type ID:', roomTypeId);
  
  // Проверяем правильность маппинга
  const expectedIds = {
    'Suite': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
    '101': '8df610ce-cabb-429d-98d0-90c33f451d97',
    '102': '8df610ce-cabb-429d-98d0-90c33f451d97',
    '103': '8df610ce-cabb-429d-98d0-90c33f451d97',
    '201': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
    '202': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
    '203': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
    '301': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
    '302': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3'
  };
  
  if (expectedIds[roomNumber] === roomTypeId) {
    console.log('✅ Маппинг корректный!');
  } else {
    console.log('❌ ОШИБКА! Ожидалось:', expectedIds[roomNumber]);
  }
  
  return roomTypeId;
}

console.log('🧪 ТЕСТИРОВАНИЕ МАППИНГА НОМЕРОВ В GUESTAPP');
console.log('=' .repeat(50));

// Тестируем разные варианты
testRoomMapping('Suite');           // Должен вернуть Suite ID
testRoomMapping('suite');           // Должен вернуть Suite ID  
testRoomMapping('Suite Room');      // Должен вернуть Suite ID
testRoomMapping('301');             // Должен вернуть Suite ID
testRoomMapping('302');             // Должен вернуть Suite ID
testRoomMapping('101');             // Должен вернуть Standard ID
testRoomMapping('102 Standard Room'); // Должен вернуть Standard ID
testRoomMapping('201');             // Должен вернуть Deluxe ID
testRoomMapping('202 Deluxe Room'); // Должен вернуть Deluxe ID

console.log('\n' + '=' .repeat(50));
console.log('✨ Тестирование завершено!');