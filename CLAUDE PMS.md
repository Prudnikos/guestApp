# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hotel Property Management System (PMS) built with React and Vite. The application provides a comprehensive booking calendar, reservation management, guest chat functionality, and various integration capabilities.

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Testing

The project uses Vitest for testing:
- Run tests: `vitest` (command available in node_modules/.bin/vitest)
- Test files are located in the `tests/` directory

## Architecture

### Core Structure

The application uses a three-panel resizable layout:
- **Left Panel**: Chat sidebar with conversation list
- **Main Panel**: Primary content (booking grid, tables, etc.)
- **Right Panel**: Chat interface (when not on dedicated Chat page)

### Authentication & State Management

- **Authentication**: Supabase-based authentication with email/password and Google OAuth
- **Auth Provider**: `src/components/auth/AuthProvider.jsx` wraps the entire application
- **Protected Routes**: All pages except login require authentication
- **Layout Logic**: `src/pages/Layout.jsx` handles the conditional rendering between login form and main application

### Routing Architecture

- **Main Router**: `src/pages/index.jsx` contains all route definitions
- **Dynamic Page Detection**: URL parsing logic automatically determines current page for layout purposes
- **Layout Integration**: Each route renders within the Layout component which provides the three-panel interface

### Key Pages

- **Dashboard**: Main booking calendar grid (`src/pages/Dashboard.jsx`)
- **Bookings**: Tabular view of all reservations (`src/pages/Bookings.jsx`)
- **Chat**: Full-screen chat interface (`src/pages/Chat.jsx`)
- **Statistics Pages**: Arrivals, Departures, Stays, Birthdays, Tasks
- **Integrations**: Channel management and external service connections

### Component Architecture

#### UI Components
- **shadcn/ui**: Full set of UI components in `src/components/ui/`
- **Radix UI**: Extensive use of Radix primitives for accessible components
- **Tailwind CSS**: Styling with custom configuration

#### Business Components
- **Dashboard Components**: `src/components/dashboard/` (BookingGrid, BookingPopover, NewBookingModal, etc.)
- **Chat Components**: `src/components/chat/` (ChatSidebar, ChatInterface, ChatModal)
- **Auth Components**: `src/components/auth/` (AuthProvider, LoginForm)

### Data Layer

#### API Integration
- **Base44 SDK**: Integration with Base44 API (currently commented out in `src/api/base44Client.js`)
- **Supabase**: Database and authentication backend (`src/lib/supabase.js`)
- **Channex Integration**: Channel manager integration (`src/services/channex/`, `src/api/channex/`)

#### State Management
- React Context for authentication state
- Local state management with React hooks
- No global state management library (Redux, Zustand, etc.)

### Internationalization

- **i18next**: Complete i18n setup with English and Russian translations
- **Translation Files**: Inline translations in `src/lib/i18n.js` (not separate JSON files)
- **Custom Hook**: `src/hooks/useTranslation.js` provides enhanced translation utilities
- **Namespaces**: common, dashboard, bookings, auth, chat
- **Storage**: Language preference stored in localStorage as 'pms_language'

### Styling & Theming

- **Tailwind CSS**: Primary styling framework
- **CSS Variables**: Theme system with CSS custom properties
- **Responsive Design**: Mobile-first approach with resizable panels
- **Dark Mode**: next-themes integration (configured but implementation status unclear)

## Important Implementation Notes

### Authentication Flow
1. App starts with AuthProvider checking Supabase session
2. Layout component conditionally renders LoginForm or MainLayout
3. All routes are protected and require authentication
4. Logout functionality integrated into navigation

### Calendar/Booking System
- Main feature is the booking calendar grid
- Drag-to-select functionality for date ranges
- Room-based booking system with availability checking
- Financial tracking (accommodation costs, services, payments, balances)

### Chat System
- Dual-mode chat: integrated sidebar + full-screen page
- Conversation-based messaging
- Unknown contact handling
- Search functionality within conversations

### File Extensions
- Mixed .jsx and .tsx files (main.tsx, some TypeScript components)
- Most components are .jsx
- TypeScript configuration present but not fully adopted

### Development Workflow
- Vite for fast development and building
- ESLint with React-specific rules
- No explicit test runner configured in package.json scripts (use node_modules binary)
- No pre-commit hooks or CI/CD configuration visible

## Database Schema Considerations

Based on component analysis, the system expects:
- Users/Staff table (Supabase auth)
- Rooms table (with types, availability)
- Bookings/Reservations table (with guest info, dates, status, financial data)
- Services table (additional services for bookings)
- Chat/Conversations table (for messaging system)
- Channel integrations (Channex, etc.)

## Integration Points

### External Services
- **Supabase**: Primary backend (auth + database)
- **Channex**: Channel manager for booking distribution ✅ **ПОЛНОСТЬЮ НАСТРОЕНО**
- **Base44**: SDK integration (currently disabled)
- **Google OAuth**: Authentication provider

### API Endpoints
- Webhook handling for Channex in `src/api/channex/`
- Base44 client setup (commented out)
- Supabase client configuration with hardcoded credentials

## Channex Integration (ПОЛНОСТЬЮ РАБОТАЕТ) ✅

**Статус**: 🟢 Производственная готовность достигнута  
**Дата завершения**: 27 августа 2025  
**Тестирование**: ✅ Успешно создано 3 бронирования в staging.channex.io

### Архитектура интеграции
- **Основной сервис**: `src/services/channex/ChannexService.jsx`
- **API endpoint**: `https://staging.channex.io/api/v1`
- **Метод создания**: Booking CRS API (`POST /bookings`)
- **Property ID**: `6ae9708a-cbaa-4134-bf04-29314e842709`

### Маппинг номеров
Система автоматически определяет тип комнаты по номеру:
- **Номер 101** → `Standard Room` (£100/ночь)
- **Номер 201** → `Deluxe Room` (£200/ночь) 
- **Номер 3xx** → `Suite` (£300/ночь)

### Обязательные поля API
```javascript
{
  property_id: "required",
  ota_reservation_code: "PMS-{booking_id}",
  ota_name: "Booking.com", // валидный провайдер
  currency: "GBP", // обязательное поле
  arrival_date: "YYYY-MM-DD",
  departure_date: "YYYY-MM-DD",
  customer: {
    name: "required",
    surname: "required", 
    mail: "required", // НЕ email!
    country: "GB" // исправлено с RU
  },
  rooms: [{
    room_type_id: "channex_room_type_id",
    rate_plan_id: "channex_rate_plan_id",
    days: { "YYYY-MM-DD": "price" }, // цены по дням
    occupancy: { adults: 1, children: 0 }
  }]
}
```

### Маппинг источников бронирований
```javascript
mapSourceToOtaName(source) {
  'Open Channel' → 'Booking.com'  // валидный провайдер
  'booking' → 'Booking.com'
  'direct' → 'Booking.com' 
  // Fallback: 'Booking.com'
}
```

### Успешные тесты
**Созданные бронирования в Channex:**
1. `BDC-PMS-201-TEST` - Jane Doe - £400.00 GBP (Deluxe Room)
2. `BDC-PMS-101-TEST` - John Smith - £200.00 GBP (Standard Room)  
3. `BDC-PMS-TEST-101` - John Doe - £400.00 GBP

### Критические исправления
1. **ota_name**: "Open Channel" → "Booking.com" (валидный провайдер)
2. **currency**: Добавлено обязательное поле "GBP"
3. **customer.mail**: Используется "mail", НЕ "email"
4. **country**: Изменено с "RU" на "GB"
5. **Импорты**: Исправлены .js → .jsx для корректной работы Vite

### Файлы интеграции
- `src/services/channex/ChannexService.jsx` - основной сервис
- `src/components/channex/ChannexSyncManager.jsx` - UI компонент
- `src/services/channex/BookingSync.js` - синхронизация (legacy)
- Tests: `test-channex-booking.cjs`, `final-channex-test.cjs`

## MCP (Model Context Protocol) Integration

### База данных через MCP
**Статус**: ✅ ПОЛНОСТЬЮ НАСТРОЕНО

Claude AI ассистент имеет прямой доступ к базе данных PostgreSQL через MCP и может:
- Читать/создавать/обновлять/удалять записи во всех таблицах
- Изменять структуру таблиц (ALTER TABLE, CREATE TABLE, DROP TABLE)
- Создавать и управлять индексами
- Управлять RLS политиками
- Создавать триггеры и функции
- Выполнять любые SQL запросы напрямую

### Конфигурация MCP
- **Файл конфигурации**: `C:\Users\{username}\AppData\Roaming\Claude\claude_desktop_config.json`
- **MCP сервер**: `@henkey/postgres-mcp-server`
- **Connection string**: Хранится в конфигурации MCP
- **База данных**: PostgreSQL на Supabase

### Рекомендации по работе с БД через MCP
1. Всегда делайте резервные копии перед критическими изменениями
2. Тестируйте изменения на небольшом наборе данных
3. Используйте транзакции для атомарных операций
4. Проверяйте RLS политики после изменений

## Security Notes

- Supabase credentials are hardcoded in `src/lib/supabase.js` (should use environment variables)
- Authentication tokens handled by Supabase SDK
- Row Level Security should be implemented in Supabase for data protection
- **Channex API Key**: Хранится в `.env.local` (production ready)
- **MCP доступ**: Service Role Key обходит все RLS политики - используйте осторожно
## AI Assistant Guidelones

Разработка ведется на ОС Windows
Ты должен общаться на русском языке
Не редактируй .env файл - лишь говори какие переменные нужно туда добавить
Используй Context7 для доступа к документациям библиотек
Для релизации любых фич с использованием интеграций с внешними арі библиотеками изучай документации с помощью context7 инструмента
Если есть изменения на фронтенде, то в конце проверь что фронт работает, открыв его через рlaywrigh