import { LucideIcon } from 'lucide-react';

export interface PrivacySettings {
  publicProfile: boolean;
  showBookings: boolean;
  marketingEmails: boolean;
}

export interface Booking {
  id: string;
  hostelId: string;
  hostelTitle: string;
  hostelLocation: string;
  hostelImage: string;
  nights: number;
  guests: number;
  totalPrice: number;
  createdAt: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'host' | 'guest';
  passHash?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  location?: string;
  savedHostelIds?: string[];
  privacySettings?: PrivacySettings;
  createdAt?: number;
  isVerified?: boolean;
  verificationCode?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'host' | 'guest';
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  hostelId: string;
  hostelTitle: string;
  hostelImage?: string;
  studentId: string;
  studentName: string;
  hostId: string;
  hostName: string;
  lastMessage: string;
  lastUpdated: number;
}

export interface Hostel {
  id: string;
  title: string;
  location: string;
  capacity: number;
  price: number;
  rating?: number;
  description: string;
  amenities: string[];
  images: string[];
  checkInTime?: string;
  checkOutTime?: string;
  houseRules?: string;
  stamped?: boolean;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  createdAt?: number;
}

export interface AmenityInfo {
  label: string;
  icon: LucideIcon;
}

export interface AuthenticateParams {
  mode: 'login' | 'register';
  role: 'host' | 'guest';
  name: string;
  email: string;
  passphrase: string;
}

export interface AuthResult {
  ok?: boolean;
  error?: string;
  requiresVerification?: boolean;
  verificationCode?: string;
  user?: User;
}
