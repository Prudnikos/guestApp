# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
GuestApp Hotel Booking is an Expo React Native application for hotel guests to book rooms, access services, and communicate with hotel staff. It features Supabase authentication and real-time functionality.

## Development Commands

### Start Development Server
```bash
# Start with LAN access (default)
npm start
# or
bun start

# Start web version
npm run start-web
# or
bun start-web

# Start web version with debug output
npm run start-web-dev
# or
bun start-web-dev
```

### Fix Metro Errors
If experiencing Metro bundler issues, run the provided fix script:
```bash
./fix-metro-error.sh
```
This script clears all caches, reinstalls dependencies with bun, and starts the web version with tunnel.

## Project Architecture

### Directory Structure
- `app/` - File-based routing using Expo Router v3
  - `(tabs)/` - Tab navigation screens (index, search, booking, profile)
  - `_layout.tsx` - Root layout with auth provider and navigation setup
  - Individual screens (login, signup, room-details, etc.)
- `components/` - Reusable React components
- `hooks/` - Custom React hooks including authentication
- `lib/` - External service integrations (Supabase)
- `types/` - TypeScript type definitions
- `constants/` - App-wide constants like colors

### Key Technologies
- **Expo SDK 51** with New Architecture enabled
- **Expo Router v3** for file-based routing with typed routes
- **Supabase** for backend services (authentication, database, real-time)
- **NativeWind** for Tailwind CSS styling
- **React Native Reanimated v3** for animations
- **Zustand** for state management
- **TypeScript** with strict mode enabled

### Authentication System
Uses Supabase Auth with AsyncStorage persistence. The `useAuth` hook provides:
- User state management
- Sign up/in/out methods
- Session persistence
- Loading states

Authentication is provided at the root level via `AuthProvider` in `app/_layout.tsx`.

### Database Schema
Core entities include:
- `User` - Basic user info (id, email)
- `Room` - Hotel room details with amenities and pricing
- `Booking` - Reservation records with status tracking
- `Service` - Additional hotel services
- `BookingService` - Services attached to bookings
- `Message` - Chat system between guests and staff
- `Complaint` - Guest feedback and issue reporting

### Navigation Structure
- Stack navigation at root level
- Tab navigation for main app screens
- Auth screens (login/signup) are outside the tab navigator
- Modal screens for detailed views (room-details, service-details)

### Import Alias
Uses `@/` alias pointing to project root, configured in:
- `tsconfig.json` - TypeScript path mapping
- `babel.config.js` - Runtime module resolution

## Development Notes

### Package Manager
Project uses **bun** as the primary package manager (note bun.lock file). Use bun commands when possible for consistency.

### Supabase Configuration
Supabase client is configured in `lib/supabase.ts` with:
- AsyncStorage for session persistence
- Auto token refresh enabled
- Session detection in URLs disabled (mobile app)

### Styling Approach
Uses NativeWind (Tailwind CSS) for consistent styling across platforms. Components should use Tailwind classes rather than StyleSheet.

### Error Handling
If Metro bundler errors occur, the `fix-metro-error.sh` script provides a complete reset workflow that clears all caches and reinstalls dependencies.

## КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Suite Booking Mapping (4 января 2025)

### Проблема
Бронирования Suite из GuestApp отправлялись в Channex с неправильным room_type_id, что приводило к:
- Бронирование попадало в Standard Room вместо Suite (Deluxe suite apartment)
- Овербукинг в Standard Room
- В PMS бронирование распределялось в комнату 101 вместо Suite

### Решение
Файл `services/ChannexBookingService.js` был исправлен:

1. **Добавлен маппинг для Suite как строки:**
```javascript
this.ROOM_TYPE_MAP = {
  // Standard rooms
  '101': '8df610ce-cabb-429d-98d0-90c33f451d97',
  '102': '8df610ce-cabb-429d-98d0-90c33f451d97',
  '103': '8df610ce-cabb-429d-98d0-90c33f451d97',
  
  // Deluxe rooms  
  '201': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
  '202': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
  '203': '734d5d86-1fe6-44d8-b6c5-4ac9349c4410',
  
  // Suites
  '301': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
  '302': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
  
  // ВАЖНО: Маппинг для Suite как строки!
  'Suite': 'e243d5aa-eff3-43a7-8bf8-87352b62fdc3',
}
```

2. **Улучшена логика определения типа номера:**
```javascript
if (roomNumber === 'Suite' || roomNumber?.toLowerCase().includes('suite')) {
  roomTypeId = this.ROOM_TYPE_MAP['Suite']; // Правильный ID для Suite
  roomNumber = 'Suite';
} else {
  // Извлекаем номер для других комнат
  roomNumber = roomNumber?.split(' ')[0] || '101';
  roomTypeId = this.ROOM_TYPE_MAP[roomNumber] || this.ROOM_TYPE_MAP['101'];
}
```

### Корректные Room Type IDs в Channex:
- **Standard Room**: `8df610ce-cabb-429d-98d0-90c33f451d97`
- **Deluxe Room**: `734d5d86-1fe6-44d8-b6c5-4ac9349c4410`
- **Deluxe suite apartment (Suite)**: `e243d5aa-eff3-43a7-8bf8-87352b62fdc3`

### Rate Plan ID для Suite:
- **Suite Rate**: `45195f3e-fb59-4ddf-9e29-b667dbe2ab58`

### Известная проблема для исправления:
- В экране "My Bookings" Suite отображается как "101" вместо "Suite"

## Push-уведомления (9 января 2025)

### Реализована двусторонняя система push-уведомлений между GuestApp и PMS:

#### GuestApp → PMS
- При отправке сообщения гостем из GuestApp
- Уведомление получают все устройства с PMS app (менеджеры)
- Реализовано в `services/MessageNotificationService.ts`

#### PMS → GuestApp  
- При отправке ответа менеджером из PMS
- Уведомление получает гость в GuestApp
- Реализовано в `C:\PMSApp\components\ChatInterface.tsx`

### Технические детали:
1. **Токены сохраняются**:
   - GuestApp: с `user_type: 'guest'`
   - PMS: без `user_type` или с `user_type: 'staff'`

2. **Логика отправки**:
   - Для менеджеров: ищем токены где `user_type != 'guest'` или `null`
   - Для гостей: ищем по конкретному `user_id`

3. **Push-уведомления о бронированиях в PMS** продолжают работать без изменений

### Тестирование:
- Требуется 2 реальных устройства (телефоны)
- Push не работают в эмуляторах или веб-версии
- Необходимо разрешить уведомления при первом запуске