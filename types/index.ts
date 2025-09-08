export interface User {
  id: string;
  email: string;
}

export interface Room {
  id: number;
  name: string;
  description: string;
  price_per_night: number;
  capacity: number;
  image_urls: string[];
  amenities: string[];
}

export interface Guest {
  id: string;
  email: string;
  full_name: string;
  phone: string;
}

export interface Booking {
  id: number;
  guest_id: string;
  room_id: number;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  source: string;
  created_at: string;
  room?: Room;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

export interface BookingService {
  id: number;
  booking_id: number;
  service_id: number;
  quantity: number;
  price_at_booking: number; // Updated field name
  status: 'pending' | 'confirmed' | 'completed';
  service?: Service;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  filename: string;
  size: number;
  mimeType?: string;
}

export interface Message {
  id: number;
  conversation_id?: string;
  sender_id: string;
  sender_type: 'guest' | 'staff';
  content: string;
  attachments?: MessageAttachment[];
  created_at: string;
  is_read?: boolean;
  // Legacy fields for backward compatibility
  guest_id?: string;
  staff_id?: string | null;
  is_from_guest?: boolean;
}

export interface Complaint {
  id: number;
  guest_id: string;
  booking_id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
}