export interface Booking {
  id: string;
  venue_id: string;
  user_id: string;
  date: string;
  time: string;
  guest_count: number;
  status: BookingStatus;
  note?: string;
  check_in_code?: string;
  booking_items: BookingItem[];
  venue?: {
    id: string;
    name: string;
    address: string;
    media: string[];
  };
  created_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

export interface BookingItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CreateBookingRequest {
  venue_id: string;
  date: string;
  time: string;
  guest_count: number;
  note?: string;
  items?: { menu_item_id: string; quantity: number }[];
}
