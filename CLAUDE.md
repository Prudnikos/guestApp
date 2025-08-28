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