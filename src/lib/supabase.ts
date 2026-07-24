import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  isValidHttpUrl(supabaseUrl)
);

function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Lazy/safe Supabase client initialization
export const supabase = getSupabaseClient();

/**
 * SQL Schema script provided for easy database setup in Supabase SQL Editor:
 * 
 * -- Create Hostels Table
 * CREATE TABLE IF NOT EXISTS public.hostels (
 *   id TEXT PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   description TEXT,
 *   location TEXT NOT NULL,
 *   price NUMERIC NOT NULL,
 *   rating NUMERIC DEFAULT 4.8,
 *   stamped BOOLEAN DEFAULT true,
 *   images TEXT[],
 *   amenities TEXT[],
 *   check_in_time TEXT,
 *   house_rules TEXT,
 *   owner_id TEXT,
 *   owner_name TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Create Bookings Table
 * CREATE TABLE IF NOT EXISTS public.bookings (
 *   id TEXT PRIMARY KEY,
 *   hostel_id TEXT REFERENCES public.hostels(id),
 *   hostel_title TEXT NOT NULL,
 *   hostel_location TEXT,
 *   user_id TEXT NOT NULL,
 *   user_name TEXT,
 *   nights INT NOT NULL,
 *   guests INT NOT NULL,
 *   total_price NUMERIC NOT NULL,
 *   start_date DATE,
 *   end_date DATE,
 *   status TEXT DEFAULT 'confirmed',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Create Conversations Table
 * CREATE TABLE IF NOT EXISTS public.conversations (
 *   id TEXT PRIMARY KEY,
 *   hostel_id TEXT REFERENCES public.hostels(id),
 *   hostel_title TEXT NOT NULL,
 *   hostel_image TEXT,
 *   student_id TEXT NOT NULL,
 *   student_name TEXT NOT NULL,
 *   host_id TEXT NOT NULL,
 *   host_name TEXT NOT NULL,
 *   last_message TEXT,
 *   last_updated TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- Create Messages Table
 * CREATE TABLE IF NOT EXISTS public.messages (
 *   id TEXT PRIMARY KEY,
 *   conversation_id TEXT REFERENCES public.conversations(id),
 *   sender_id TEXT NOT NULL,
 *   sender_name TEXT NOT NULL,
 *   sender_role TEXT NOT NULL,
 *   text TEXT NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */
