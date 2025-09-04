# Push Notifications Setup Guide

## Overview
This project uses a mock push notification system when running in Expo Go, and real push notifications when running in a development build.

## Current Setup

### Environment Detection
- **Expo Go**: Uses `pushNotificationsMock.ts` with Alert dialogs
- **Dev Build**: Uses full `pushNotifications.ts` with real push notifications

### Key Files
- `/services/pushNotificationsMock.ts` - Mock implementation for Expo Go
- `/services/pushNotifications.ts` - Full implementation for dev builds
- `/services/pushNotificationsSafe.ts` - Safe wrapper that auto-detects environment
- `/app/_layout.tsx` - Currently using mock version for compatibility

## Testing Setup

### Two Phone Configuration
- **Phone 1**: Running HotelPMS (Manager app)
- **Phone 2**: Running GuestApp (Guest app)

### EAS Project IDs
- **HotelPMS**: Uses separate EAS project ID
- **GuestApp**: `dc20f3ad-e39d-42a4-b009-fa512bbdd16e`
- **EAS Owner**: vodaaparthotel (shared between both apps)

## Features

### Guest Notifications
- New message from hotel staff
- Booking confirmation
- Check-in reminders
- Room ready notifications
- Service confirmations

### Manager Notifications (in HotelPMS)
- New bookings from any source
- Guest messages
- Service requests

## Known Issues & Solutions

### Expo Go Limitations
**Problem**: expo-notifications doesn't work in Expo Go with SDK 51+
**Solution**: Using mock notifications with Alert dialogs

### Database Integration
- All notifications triggered by database events (Supabase realtime)
- Database is the "single source of truth"
- Push tokens stored in `push_tokens` table

## How It Works

### Mock Mode (Expo Go)
1. User actions trigger database changes
2. Supabase realtime detects changes
3. Mock service shows Alert dialog
4. User can tap "Open Chat" to navigate

### Production Mode (Dev Build)
1. User actions trigger database changes
2. Supabase realtime detects changes
3. Real push notification sent via Expo Push API
4. Notification appears even when app is closed

## Building for Production

To enable real push notifications:

1. Create a development build:
```bash
eas build --platform android --profile development
```

2. Install the APK on devices

3. Update `_layout.tsx` to use real push service:
```typescript
// Change from:
import PushNotificationService from "@/services/pushNotificationsMock";
// To:
import PushNotificationService from "@/services/pushNotifications";
```

## Testing Notifications

### Between Apps
1. Start HotelPMS on Phone 1
2. Start GuestApp on Phone 2
3. Create booking in GuestApp → Manager gets notification
4. Send message in HotelPMS → Guest gets notification

### Mock Notifications Test
- Booking confirmations show as Alert
- Messages show with "Open Chat" option
- Check-in reminders scheduled via setTimeout

## Troubleshooting

### "Cannot read property 'addNotificationReceivedListener'"
- This means expo-notifications isn't available
- Ensure using mock service in Expo Go
- Check that imports are correct

### Notifications not showing
1. Check push tokens in database
2. Verify Supabase realtime is connected
3. Check console logs for errors

### Database Schema Required
```sql
-- push_tokens table
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL,
  user_type TEXT CHECK (user_type IN ('guest', 'staff')),
  platform TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);
```

## Important Notes

1. **Database-driven**: All notifications triggered by database events
2. **Realtime subscriptions**: Using Supabase realtime for instant updates
3. **Platform differences**: iOS and Android handle notifications differently
4. **Token management**: Tokens expire and need refresh
5. **Mock limitations**: Alerts only work when app is open

## Contact
For issues or questions about push notifications, check the implementation in both:
- C:\1\guestApp (Guest application)
- C:\1\hotelPMS (Manager application)