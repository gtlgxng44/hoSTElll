import React, { useState } from "react";
import { X, Database, CheckCircle2, AlertCircle, Copy, Check, Terminal, ExternalLink, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase";

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SCHEMA_SQL = `-- Run this script in your Supabase SQL Editor:

-- 1. Create Hostels Table
CREATE TABLE IF NOT EXISTS public.hostels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price NUMERIC NOT NULL,
  rating NUMERIC DEFAULT 4.8,
  stamped BOOLEAN DEFAULT true,
  images TEXT[],
  amenities TEXT[],
  check_in_time TEXT,
  house_rules TEXT,
  owner_id TEXT,
  owner_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  hostel_id TEXT REFERENCES public.hostels(id),
  hostel_title TEXT NOT NULL,
  hostel_location TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT,
  nights INT NOT NULL,
  guests INT NOT NULL,
  total_price NUMERIC NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  hostel_id TEXT REFERENCES public.hostels(id),
  hostel_title TEXT NOT NULL,
  hostel_image TEXT,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  last_message TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES public.conversations(id),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Permissive for application access
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select hostels" ON public.hostels FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert hostels" ON public.hostels FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert messages" ON public.messages FOR INSERT WITH CHECK (true);
`;

export function SupabaseModal({ isOpen, onClose }: SupabaseModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0c0c0c] border border-white/10 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 flex items-center justify-center text-[#3ecf8e]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                Supabase Database Setup
              </h3>
              <p className="font-mono text-[10px] text-[#888] uppercase tracking-wider">
                PostgreSQL Storage Integration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#888] hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#d0d0d0] font-sans leading-relaxed">
          {/* Connection Status */}
          <div className={`p-4 rounded-sm border flex items-start gap-3 ${
            isSupabaseConfigured
              ? "bg-[#3ecf8e]/10 border-[#3ecf8e]/30 text-white"
              : "bg-[#181818] border-white/10 text-white"
          }`}>
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-[#3ecf8e] flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#c5a059] flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h4 className="font-bold text-sm">
                {isSupabaseConfigured
                  ? "Supabase Connected & Active"
                  : "Supabase Environment Credentials Needed"}
              </h4>
              <p className="text-[#a0a0a0] text-[11px]">
                {isSupabaseConfigured
                  ? "The client is connected using your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
                  : "To connect your Supabase project, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment secrets. Fallback storage is currently preserving local session data."}
              </p>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="space-y-2">
            <h4 className="font-mono font-bold text-[11px] uppercase tracking-wider text-[#c5a059] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> 1-Click Database SQL Schema
            </h4>
            <p className="text-[#a0a0a0]">
              Copy the SQL schema below and paste it directly into your <strong>Supabase SQL Editor</strong> to automatically create the necessary tables (`hostels`, `bookings`, `conversations`, `messages`).
            </p>
          </div>

          {/* SQL Editor Box */}
          <div className="relative border border-white/10 rounded-sm bg-[#060606] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 bg-[#111] flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#888] uppercase tracking-wider">
                supabase_schema.sql
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#222] hover:bg-[#333] border border-white/10 text-[10px] font-mono text-[#3ecf8e] transition"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied SQL!" : "Copy SQL"}</span>
              </button>
            </div>

            <pre className="p-4 font-mono text-[11px] text-[#3ecf8e] leading-relaxed overflow-x-auto max-h-56 no-scrollbar">
              {SUPABASE_SCHEMA_SQL}
            </pre>
          </div>

          <div className="p-3.5 rounded-sm bg-[#111] border border-white/5 space-y-1">
            <h5 className="font-mono font-bold text-[10px] uppercase text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3ecf8e]" /> Setup Environment Secrets
            </h5>
            <p className="text-[11px] text-[#888]">
              Variables to add in Project Settings / Secrets:
            </p>
            <div className="font-mono text-[10px] text-[#c5a059] space-y-0.5 pt-1">
              <p>• VITE_SUPABASE_URL = https://your-ref.supabase.co</p>
              <p>• VITE_SUPABASE_ANON_KEY = eyJhbGciOiJKV1Qi...</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#101010] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-sm bg-[#3ecf8e] text-black font-mono text-xs uppercase tracking-wider font-bold hover:brightness-110 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
