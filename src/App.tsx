import React, { useState, useEffect } from "react";
import {
  MapPin, Users, X, Calendar, Search, Plus, Check, Wifi,
  Coffee, Lock, WashingMachine, Sofa, UtensilsCrossed, Clock, Trash2,
  Luggage, UserCircle, LogOut, KeyRound, Eye, EyeOff, Mail,
  ShieldCheck, User as UserIcon, Stamp, Camera, Edit, Heart, Bookmark,
  GraduationCap, BookOpen, Bus, Building2, Sparkles, MessageSquare,
  MailCheck, CheckCircle2, AlertTriangle, RefreshCw, Shield
} from "lucide-react";
import { Hostel, User, AmenityInfo, AuthenticateParams, AuthResult, Booking } from "./types";
import { UserProfileModal } from "./components/UserProfileModal";
import { fetchHostels, saveHostel, removeHostel, fetchUsers, saveUser, fetchBookings, saveBooking } from "./lib/firebase";
import { ChatModal } from "./components/ChatModal";
import { sendVerificationEmail } from "./lib/emailService";

declare global {
  interface Window {
    storage?: {
      get: (key: string, isGlobal?: boolean) => Promise<{ value: string } | null>;
      set: (key: string, value: string, isGlobal?: boolean) => Promise<void>;
      delete: (key: string, isGlobal?: boolean) => Promise<void>;
    };
  }
}

/* --- UTILS & STORAGE HELPERS --- */

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

// Browser-safe storage fallback
const safeStorage = {
  get: async (key: string, isGlobal?: boolean) => {
    try {
      if (window.storage?.get) return await window.storage.get(key, isGlobal);
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string, isGlobal?: boolean) => {
    try {
      if (window.storage?.set) return await window.storage.set(key, value, isGlobal);
      localStorage.setItem(key, value);
    } catch {}
  },
  delete: async (key: string, isGlobal?: boolean) => {
    try {
      if (window.storage?.delete) return await window.storage.delete(key, isGlobal);
      localStorage.removeItem(key);
    } catch {}
  }
};

/* --- MOCK DATA & CONSTANTS --- */

const AMENITY_ICONS: Record<string, AmenityInfo> = {
  wifi: { label: "High-Speed Wi-Fi", icon: Wifi },
  desk: { label: "Study Desk & Quiet Zone", icon: BookOpen },
  laundry: { label: "Laundry Facilities", icon: WashingMachine },
  kitchen: { label: "Shared Student Kitchen", icon: UtensilsCrossed },
  security: { label: "24/7 Security Guard", icon: ShieldCheck },
  shuttle: { label: "Campus Shuttle", icon: Bus },
  lock: { label: "Personal Lockers", icon: Lock },
};

// Default verified student hostels with real house pictures
const INITIAL_HOSTELS: Hostel[] = [
  {
    id: "h-mara-river",
    title: "Mara River Student Heights",
    location: "Westlands Campus Zone, Nairobi",
    price: 14500,
    capacity: 4,
    amenities: ["wifi", "desk", "laundry", "security", "shuttle"],
    images: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Modern student residency featuring high-speed fibre Wi-Fi, ergonomic study desks, biometric security access, and daily campus shuttle service.",
    houseRules: "Quiet study hours after 10:00 PM. No smoking or pets permitted on residence premises.",
    checkInTime: "12:00 PM",
    checkOutTime: "10:00 AM",
    ownerId: "owner-mara",
    ownerName: "Mara Heights Management",
    ownerPhone: "+254 712 345 678",
    createdAt: Date.now() - 100000,
  },
  {
    id: "h-university-view",
    title: "University View Executive Suites",
    location: "Juja Campus Way, Kiambu",
    price: 18000,
    capacity: 2,
    amenities: ["wifi", "desk", "kitchen", "laundry", "security"],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Spacious twin-share executive suites with self-contained kitchenette, private study lounge, hot shower, and 24/7 guarded security.",
    houseRules: "Visitors allowed in common lounge until 9:00 PM. ID verification required.",
    checkInTime: "1:00 PM",
    checkOutTime: "11:00 AM",
    ownerId: "owner-uniview",
    ownerName: "Juja Student Homes",
    ownerPhone: "+254 722 987 654",
    createdAt: Date.now() - 200000,
  },
  {
    id: "h-kilimani-scholar",
    title: "Kilimani Scholar Haven",
    location: "Kilimani Ring Road, Nairobi",
    price: 12000,
    capacity: 6,
    amenities: ["wifi", "desk", "lock", "laundry", "security"],
    images: [
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Affordable shared student dorms with individual lockable lockers, high-speed internet, power backup, and laundry washing bay.",
    houseRules: "Keep personal lockers locked at all times. Maintain cleanliness in shared kitchen and study rooms.",
    checkInTime: "2:00 PM",
    checkOutTime: "10:00 AM",
    ownerId: "owner-kilimani",
    ownerName: "Scholar Haven Properties",
    ownerPhone: "+254 733 111 222",
    createdAt: Date.now() - 300000,
  },
  {
    id: "h-madaraka-residency",
    title: "Madaraka Student Residency",
    location: "Madaraka Estate, Nairobi",
    price: 16000,
    capacity: 2,
    amenities: ["wifi", "desk", "kitchen", "security", "shuttle"],
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Serene student apartments within 5 minutes walk to campus gates. Features quiet reading rooms, equipped shared kitchen, and reliable Wi-Fi.",
    houseRules: "Respect fellow student residents. Keep ambient noise minimal.",
    checkInTime: "12:00 PM",
    checkOutTime: "11:00 AM",
    ownerId: "owner-madaraka",
    ownerName: "Madaraka Hostels Ltd",
    ownerPhone: "+254 700 444 555",
    createdAt: Date.now() - 400000,
  }
];

/* --- AUTH MODAL WITH EMAIL VERIFICATION --- */

interface AuthModalProps {
  onClose: () => void;
  onAuthenticate: (params: AuthenticateParams) => Promise<AuthResult | undefined>;
  onVerifyCode?: (userId: string, code: string) => Promise<AuthResult | undefined>;
  onResendCode?: (userId: string) => Promise<string | undefined>;
}

function AuthModal({ onClose, onAuthenticate, onVerifyCode, onResendCode }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [role, setRole] = useState<"host" | "guest">("host");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification State
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [activeCode, setActiveCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [showDevCode, setShowDevCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    if (!email.includes("@")) return setError("Please enter a valid email address.");
    if (passphrase.length < 6) return setError("Passphrase must be at least 6 characters.");
    if (mode === "register" && !name.trim()) return setError("Please enter your name.");

    setLoading(true);
    const result = await onAuthenticate({
      mode: mode === "verify" ? "register" : mode,
      role,
      name: name.trim() || email.split("@")[0],
      email: email.trim().toLowerCase(),
      passphrase,
    });
    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else if (result?.requiresVerification && result?.user && result?.verificationCode) {
      setPendingUser(result.user);
      setActiveCode(result.verificationCode);
      setMode("verify");
      sendVerificationEmail(result.user.email, result.user.name, result.verificationCode);
      setInfoMessage(`Account created! Verification code sent to ${result.user.email}.`);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!enteredCode.trim()) return setError("Please enter the 6-digit code.");
    if (enteredCode.trim() !== activeCode) return setError("Incorrect verification code. Check below and try again.");

    if (onVerifyCode && pendingUser) {
      setLoading(true);
      const res = await onVerifyCode(pendingUser.id, enteredCode.trim());
      setLoading(false);
      if (res?.error) {
        setError(res.error);
      } else {
        onClose();
      }
    }
  };

  const handleResendCode = async () => {
    if (onResendCode && pendingUser) {
      setLoading(true);
      const newCode = await onResendCode(pendingUser.id);
      setLoading(false);
      if (newCode) {
        setActiveCode(newCode);
        sendVerificationEmail(pendingUser.email, pendingUser.name, newCode);
        setInfoMessage("A fresh verification email has been dispatched!");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-sm p-7 relative shadow-2xl rise-in bg-[#0e0e0e] text-[#f5f5f5] border border-white/10">
        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            {mode === "verify" ? (
              <MailCheck className="w-5 h-5 text-[#c5a059]" />
            ) : (
              <KeyRound className="w-5 h-5 text-[#c5a059]" />
            )}
            <h2 className="font-serif text-2xl font-bold text-white">
              {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Verify Email"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm text-[#888888] hover:text-white hover:bg-white/10 transition"><X className="w-4 h-4" /></button>
        </div>

        {mode !== "verify" ? (
          <>
            <div className="flex rounded-sm p-1 mb-5 bg-[#161616] border border-white/5">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setInfoMessage(""); }}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider rounded-sm font-bold transition ${mode === "login" ? "bg-[#c5a059] text-black shadow" : "text-[#888888] hover:text-white"}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(""); setInfoMessage(""); }}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider rounded-sm font-bold transition ${mode === "register" ? "bg-[#c5a059] text-black shadow" : "text-[#888888] hover:text-white"}`}
              >
                Register
              </button>
            </div>

            <div className="mb-5">
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#888888] mb-2">Account Role</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("host")}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-3 rounded-sm border text-xs font-mono transition ${role === "host" ? "border-[#c5a059] text-[#c5a059] bg-[#c5a059]/10 font-bold" : "text-[#888888] border-white/10 bg-[#141414] hover:text-white"}`}
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Property Owner / Renter
                  </div>
                  <span className="text-[9px] text-[#888888] font-normal">Lists student hostels & house pics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("guest")}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-3 rounded-sm border text-xs font-mono transition ${role === "guest" ? "border-[#c5a059] text-[#c5a059] bg-[#c5a059]/10 font-bold" : "text-[#888888] border-white/10 bg-[#141414] hover:text-white"}`}
                >
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5" /> Student Resident
                  </div>
                  <span className="text-[9px] text-[#888888] font-normal">Searches & books student beds</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#888888] mb-1">
                    {role === "host" ? "Hostel / Business Name" : "Your Name"}
                  </label>
                  <div className="relative">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="auth-input pl-9" required />
                    <UserIcon className="w-4 h-4 absolute left-3 top-3 text-[#888888]" />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#888888] mb-1">Email Address</label>
                <div className="relative">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="auth-input pl-9" required />
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#888888]" />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#888888] mb-1">Passphrase</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="••••••••" className="auth-input pl-9 pr-9" required />
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#888888]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-[#888888] hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="font-mono text-xs text-red-300 bg-red-950/80 p-3 rounded-sm border border-red-800/50">{error}</p>}

              <button type="submit" disabled={loading} className="mt-2 w-full py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 disabled:opacity-50 transition shadow-lg shadow-[#c5a059]/10">
                {loading ? "Processing..." : mode === "login" ? "Sign In" : "Register & Get Code"}
              </button>
            </form>
          </>
        ) : (
          /* EMAIL VERIFICATION SCREEN */
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            {infoMessage && (
              <div className="p-3 bg-[#181818] border border-[#c5a059]/30 rounded-sm text-xs font-mono text-[#c5a059]">
                {infoMessage}
              </div>
            )}

            {/* Realistic Email Sent Card */}
            <div className="p-4 rounded-sm bg-[#121212] border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#888888]">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <MailCheck className="w-4 h-4 text-emerald-400" /> Verification Email Sent
                </span>
                <span>Just Now</span>
              </div>
              <p className="font-mono text-xs text-[#cccccc] leading-relaxed">
                We've dispatched a 6-digit verification code to <span className="text-white font-bold">{pendingUser?.email}</span>. Please check your inbox or spam folder.
              </p>
              
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#888888]">Didn't get an email?</span>
                <button
                  type="button"
                  onClick={() => setShowDevCode(!showDevCode)}
                  className="text-[#c5a059] hover:underline flex items-center gap-1 text-[11px]"
                >
                  {showDevCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showDevCode ? "Hide Dev Code" : "Dev Preview Code"}
                </button>
              </div>

              {showDevCode && (
                <div className="p-2.5 bg-[#181818] border border-[#c5a059]/40 rounded-sm flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#888888]">Sandbox Code:</span>
                  <span className="font-mono font-bold text-base text-[#c5a059] tracking-widest">{activeCode}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#888888] mb-1">
                Enter 6-Digit Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder="123456"
                  className="auth-input font-mono text-center tracking-[0.3em] text-lg font-bold text-white flex-1"
                  required
                />
                {showDevCode && (
                  <button
                    type="button"
                    onClick={() => setEnteredCode(activeCode)}
                    className="px-3 py-2 bg-[#1c1c1c] hover:bg-[#252525] border border-white/10 text-xs font-mono text-[#c5a059] rounded-sm transition"
                    title="Auto-fill code for quick verification"
                  >
                    Auto-Fill
                  </button>
                )}
              </div>
            </div>

            {error && <p className="font-mono text-xs text-red-300 bg-red-950/80 p-3 rounded-sm border border-red-800/50">{error}</p>}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 disabled:opacity-50 transition shadow-lg shadow-[#c5a059]/10 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Verify Email & Complete Sign-Up
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="w-full py-2 rounded-sm font-mono text-xs uppercase tracking-wider text-[#888888] hover:text-white transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend Verification Code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* --- ADMIN HOSTEL & PICS EDIT MODAL --- */

interface AdminHostelModalProps {
  onClose: () => void;
  onSave: (hostel: Hostel) => void;
  existingHostel?: Hostel | null;
  currentUser?: User | null;
}

function AdminHostelModal({ onClose, onSave, existingHostel = null, currentUser }: AdminHostelModalProps) {
  const isAdmin = currentUser?.role === "host";
  const [title, setTitle] = useState(existingHostel?.title || "");
  const [location, setLocation] = useState(existingHostel?.location || "");
  const [price, setPrice] = useState<number | string>(existingHostel?.price || 20);
  const [capacity, setCapacity] = useState<number | string>(existingHostel?.capacity || 8);
  const [description, setDescription] = useState(existingHostel?.description || "");
  const [checkInTime, setCheckInTime] = useState(existingHostel?.checkInTime || "14:00 PM");
  const [houseRules, setHouseRules] = useState(existingHostel?.houseRules || "Quiet hours after 10 PM.");
  const [amenities, setAmenities] = useState<string[]>(existingHostel?.amenities || ["wifi", "coffee"]);
  const [images, setImages] = useState<string[]>(
    existingHostel?.images || [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"
    ]
  );
  const [newImageUrl, setNewImageUrl] = useState("");

  const handleAddImage = () => {
    if (!isAdmin) return;
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleRemoveImage = (idx: number) => {
    if (!isAdmin) return;
    setImages(images.filter((_, i) => i !== idx));
  };

  const toggleAmenity = (key: string) => {
    setAmenities(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!title || !location || images.length === 0) return;

    onSave({
      id: existingHostel?.id || uid(),
      title,
      location,
      price: Number(price),
      capacity: Number(capacity),
      description,
      checkInTime,
      houseRules,
      amenities,
      images,
      stamped: true,
      rating: existingHostel?.rating || 5.0,
      ownerId: existingHostel?.ownerId || currentUser?.id || "owner-default",
      ownerName: existingHostel?.ownerName || currentUser?.name || "Property Manager",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-sm p-7 shadow-2xl rise-in max-h-[90vh] overflow-y-auto bg-[#0e0e0e] text-[#f5f5f5] border border-white/10">
        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#c5a059]" />
            <h2 className="font-serif text-xl font-bold text-white">
              {existingHostel ? "Edit Hostel & House Gallery" : "Admin: Register Hostel & House Gallery"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm text-[#888888] hover:text-white hover:bg-white/10 transition"><X className="w-4 h-4" /></button>
        </div>

        {!isAdmin && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800/50 rounded-sm font-mono text-xs text-red-300 flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Admin Authorization Required: Only Hostel Host accounts can add or modify house picture galleries.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          
          {/* House Picture Gallery Manager */}
          <div className="p-4 rounded-sm border border-white/10 bg-[#141414] space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-mono uppercase text-[10px] font-bold text-[#c5a059] tracking-wider">
                House Pictures Gallery ({images.length})
              </label>
              <span className="font-mono text-[10px] text-[#888888]">
                {isAdmin ? "Admin Media Controls Active" : "Read Only Mode"}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {images.map((url, idx) => (
                <div key={idx} className="relative rounded-sm overflow-hidden h-20 bg-[#1e1e1e] border border-white/10">
                  <img src={url} alt={`House pic ${idx + 1}`} className="w-full h-full object-cover" />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-sm hover:scale-110 transition"
                      title="Remove house photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin ? (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste picture URL (Unsplash, Imgur...)"
                    className="auth-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2 bg-[#c5a059] text-black font-bold rounded-sm font-mono text-xs flex items-center gap-1.5 hover:brightness-110 transition whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add URL
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#666666] font-mono uppercase">OR</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="hostel-image-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === "string") {
                            setImages([...images, reader.result]);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="hostel-image-upload"
                    className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-white rounded-sm font-mono text-xs flex items-center justify-center gap-1.5 transition cursor-pointer flex-1 text-center"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#c5a059]" /> Upload from Device
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-mono text-[#888888] italic">
                Log in as a Host / Admin account to upload new house pictures.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1">Hostel Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Mara River Lodge" className="auth-input" />
            </div>
            <div>
              <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1">Location / City</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="e.g. Nairobi, Kenya" className="auth-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1">Rate (Ksh)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="auth-input" />
            </div>
            <div>
              <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1">Beds Capacity</label>
              <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} required className="auth-input" />
            </div>
            <div>
              <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1">Check-in Time</label>
              <input type="text" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} placeholder="14:00 PM" className="auth-input" />
            </div>
          </div>

          <div>
            <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1.5">Amenities</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(AMENITY_ICONS).map(([key, { label, icon: Icon }]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggleAmenity(key)}
                  className={`flex items-center gap-1.5 p-2 rounded-sm border text-[10px] font-mono transition ${
                    amenities.includes(key) ? "border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059] font-bold" : "text-[#888888] border-white/10 bg-[#141414]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="auth-input" />
          </div>

          <div>
            <label className="block font-mono uppercase text-[10px] text-[#888888] tracking-wider mb-1">House Rules</label>
            <input type="text" value={houseRules} onChange={(e) => setHouseRules(e.target.value)} className="auth-input" />
          </div>

          <button type="submit" className="w-full py-3.5 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-lg shadow-[#c5a059]/10">
            {existingHostel ? "Save Changes" : "Publish Hostel"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* --- GUEST HOUSE PICTURE GALLERY & BOOKING MODAL --- */

interface GuestHostelDetailModalProps {
  hostel: Hostel;
  onClose: () => void;
  onBook: (hostel: Hostel, nights: number, guests: number, total: number, startDate?: string, endDate?: string) => void;
  onOpenChat: (hostel: Hostel) => void;
}

function GuestHostelDetailModal({ hostel, onClose, onBook, onOpenChat }: GuestHostelDetailModalProps) {
  const photos = hostel.images && hostel.images.length > 0 ? hostel.images : ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"];
  const [activePhoto, setActivePhoto] = useState(photos[0]);

  // Date range picker setup
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  const getDefaultEndStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getDefaultEndStr());
  const [guests, setGuests] = useState(1);

  // Dynamic calculations
  const startMs = startDate ? new Date(startDate).getTime() : Date.now();
  const endMs = endDate ? new Date(endDate).getTime() : startMs;
  const diffDays = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
  const computedMonths = Math.max(1, Math.round(diffDays / 30) || 1);

  const totalPrice = computedMonths * guests * hostel.price;

  const handleApplyPreset = (months: number) => {
    const baseStart = startDate ? new Date(startDate) : new Date();
    const newEnd = new Date(baseStart);
    newEnd.setMonth(newEnd.getMonth() + months);
    setEndDate(newEnd.toISOString().split("T")[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-sm p-7 shadow-2xl rise-in max-h-[90vh] overflow-y-auto bg-[#0e0e0e] text-[#f5f5f5] border border-white/10">
        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">{hostel.title}</h2>
            <p className="font-mono text-xs text-[#888888] flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#c5a059]" /> {hostel.location}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm text-[#888888] hover:text-white hover:bg-white/10 transition"><X className="w-5 h-5" /></button>
        </div>

        {/* Image Gallery */}
        <div className="space-y-3 mb-6">
          <div className="h-64 sm:h-80 w-full rounded-sm overflow-hidden bg-[#161616] border border-white/10">
            <img src={activePhoto} alt={hostel.title} className="w-full h-full object-cover transition-all duration-300" />
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {photos.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setActivePhoto(url)}
                className={`h-16 w-24 rounded-sm overflow-hidden border-2 flex-shrink-0 transition-all ${
                  activePhoto === url ? "border-[#c5a059] scale-105 shadow-md shadow-[#c5a059]/20" : "border-white/10 opacity-50 hover:opacity-100"
                }`}
              >
                <img src={url} alt="House photo" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans text-xs">
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#c5a059] mb-1.5">House Description</h3>
              <p className="leading-relaxed text-[#a0a0a0] font-sans text-xs">{hostel.description}</p>
            </div>

            {hostel.houseRules && (
              <div className="p-3.5 rounded-sm bg-[#161616] border border-white/10">
                <h4 className="font-mono font-bold text-[10px] uppercase tracking-wider text-[#c5a059] mb-1">House Rules</h4>
                <p className="text-[#a0a0a0] text-[11px] font-sans">{hostel.houseRules}</p>
              </div>
            )}

            {/* Student Amenities */}
            {hostel.amenities && hostel.amenities.length > 0 && (
              <div className="p-3.5 rounded-sm bg-[#161616] border border-white/10 space-y-2">
                <h4 className="font-mono font-bold text-[10px] uppercase tracking-wider text-[#c5a059]">Included Student Facilities</h4>
                <div className="flex flex-wrap gap-2">
                  {hostel.amenities.map((key) => {
                    const info = AMENITY_ICONS[key];
                    if (!info) return null;
                    const Icon = info.icon;
                    return (
                      <span key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#222] border border-white/10 text-[11px] font-mono text-white">
                        <Icon className="w-3.5 h-3.5 text-[#c5a059]" /> {info.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 rounded-sm border border-white/10 bg-[#141414] space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between mb-4 border-b border-white/10 pb-3">
                <span className="font-serif text-lg font-bold text-[#c5a059]">Ksh {hostel.price?.toLocaleString()} <span className="font-mono text-[10px] text-white/50">/ month</span></span>
                <span className="text-[10px] font-mono text-[#888888]">Check-in: {hostel.checkInTime || "14:00"}</span>
              </div>

              {/* DATE RANGE PICKER COMPONENT */}
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-[#c5a059] font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#c5a059]" /> Stay Date Range
                  </label>
                  <span className="text-[10px] text-[#888888]">{diffDays} day(s) (~{computedMonths} mo)</span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(1)}
                    className="py-1 px-1.5 text-[9px] bg-[#222] hover:bg-[#333] border border-white/10 rounded-sm text-[#a0a0a0] hover:text-white transition font-mono"
                  >
                    1 Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(4)}
                    className="py-1 px-1.5 text-[9px] bg-[#222] hover:bg-[#333] border border-white/10 rounded-sm text-[#a0a0a0] hover:text-white transition font-mono"
                  >
                    1 Semester
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(8)}
                    className="py-1 px-1.5 text-[9px] bg-[#222] hover:bg-[#333] border border-white/10 rounded-sm text-[#a0a0a0] hover:text-white transition font-mono"
                  >
                    Acad. Year
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#888888] mb-1">Check-In</label>
                    <input
                      type="date"
                      value={startDate}
                      min={getTodayStr()}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="auth-input font-mono text-xs px-2 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#888888] mb-1">Check-Out</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || getTodayStr()}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="auth-input font-mono text-xs px-2 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#888888] mb-1">Residents / Students</label>
                  <input type="number" min="1" value={guests} onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))} className="auth-input" />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 space-y-1">
                <div className="flex justify-between font-mono text-[11px] text-[#a0a0a0]">
                  <span>Rate breakdown:</span>
                  <span>Ksh {hostel.price?.toLocaleString()} × {computedMonths} mo</span>
                </div>
                <div className="flex justify-between font-serif font-bold text-base pt-1">
                  <span className="text-white">Total Stay Price:</span>
                  <span className="text-[#c5a059]">Ksh {totalPrice?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onBook(hostel, computedMonths, guests, totalPrice, startDate, endDate)}
                className="w-full py-3 rounded-sm bg-[#c5a059] text-black font-mono text-xs uppercase tracking-widest font-bold hover:brightness-110 flex items-center justify-center gap-2 transition shadow-lg shadow-[#c5a059]/10"
              >
                <Calendar className="w-3.5 h-3.5" /> Confirm Stay Dates
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChat(hostel);
                }}
                className="w-full py-2.5 rounded-sm bg-[#1e1e1e] hover:bg-[#282828] text-[#c5a059] border border-[#c5a059]/40 font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message Property Owner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- MAIN APPLICATION COMPONENT --- */

export default function HostelLogApp() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>(INITIAL_HOSTELS);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTargetHostel, setChatTargetHostel] = useState<Hostel | null>(null);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAmenityFilter, setActiveAmenityFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = await fetchUsers();
      setUsers(u);

      const session = await safeStorage.get("current-user", false);
      if (session?.value) {
        const parsedUser: User = JSON.parse(session.value);
        if (parsedUser && parsedUser.isVerified === false) {
          await safeStorage.delete("current-user", false);
          setCurrentUser(null);
        } else {
          setCurrentUser(parsedUser);
          const b = await fetchBookings(parsedUser.id);
          setUserBookings(b);
        }
      }

      const savedHostels = await fetchHostels();
      if (savedHostels && savedHostels.length > 0) {
        setHostels(savedHostels);
      } else {
        setHostels(INITIAL_HOSTELS);
      }
    })();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const persistUsers = async (nextUsers: User[]) => {
    setUsers(nextUsers);
    // Sync all new users or updated users - practically speaking we save the latest one
    // But since this is a list replace, we should save the last one added/modified.
    // Our Firebase saveUser function handles single users, so we'll just iterate:
    for (const u of nextUsers) {
      await saveUser(u);
    }
  };

  const persistSession = async (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      await safeStorage.set("current-user", JSON.stringify(user), false);
      const b = await fetchBookings(user.id);
      setUserBookings(b);
    } else {
      await safeStorage.delete("current-user", false);
      setUserBookings([]);
    }
  };

  const toggleSaveHostel = async (hostelId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      showToast("Please sign in to save hostels to your profile.");
      return;
    }

    const currentSaved = currentUser.savedHostelIds || [];
    const isSaved = currentSaved.includes(hostelId);
    const newSaved = isSaved
      ? currentSaved.filter((id) => id !== hostelId)
      : [...currentSaved, hostelId];

    const updatedUser: User = { ...currentUser, savedHostelIds: newSaved };
    setCurrentUser(updatedUser);
    await safeStorage.set("current-user", JSON.stringify(updatedUser), false);

    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    await persistUsers(updatedUsers);

    showToast(isSaved ? "Hostel removed from saved wishlist." : "Hostel saved to your profile!");
  };

  const handleSaveProfile = async (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, ...updatedFields };
    setCurrentUser(updatedUser);
    await safeStorage.set("current-user", JSON.stringify(updatedUser), false);

    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    await persistUsers(updatedUsers);
    showToast("Profile updated successfully!");
  };

  const handleSaveHostel = async (hostelData: Hostel) => {
    if (currentUser?.role !== "host") {
      showToast("Permission denied: Only Admin / Host accounts can manage hostel pics & listings.");
      return;
    }

    let updated: Hostel[];
    if (editingHostel) {
      updated = hostels.map(h => h.id === hostelData.id ? hostelData : h);
      showToast("Hostel and house pictures updated!");
    } else {
      updated = [hostelData, ...hostels];
      showToast("New hostel published with house gallery!");
    }
    setHostels(updated);
    await saveHostel(hostelData);
    setShowAdminModal(false);
    setEditingHostel(null);
  };

  const handleDeleteHostel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.role !== "host") {
      showToast("Permission denied: Only Admin / Host accounts can delete hostels.");
      return;
    }
    const updated = hostels.filter(h => h.id !== id);
    setHostels(updated);
    await removeHostel(id);
    showToast("Hostel deleted.");
  };

  const authenticate = async ({ mode, role, name, email, passphrase }: AuthenticateParams): Promise<AuthResult | undefined> => {
    const passHash = simpleHash(passphrase);
    const existingUser = users.find((u) => u.email === email);

    if (mode === "login") {
      if (!existingUser) return { error: "No account found with this email." };
      if (existingUser.passHash !== passHash) return { error: "Incorrect passphrase." };

      if (existingUser.isVerified === false) {
        const code = existingUser.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();
        const updatedUser: User = { ...existingUser, verificationCode: code };
        const updatedUsers = users.map((u) => (u.id === existingUser.id ? updatedUser : u));
        await persistUsers(updatedUsers);

        return { requiresVerification: true, verificationCode: code, user: updatedUser };
      }

      await persistSession({
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        avatarUrl: existingUser.avatarUrl,
        bio: existingUser.bio,
        phone: existingUser.phone,
        location: existingUser.location,
        savedHostelIds: existingUser.savedHostelIds,
        privacySettings: existingUser.privacySettings,
        isVerified: true
      });
      setShowAuthModal(false);
      showToast(`Welcome back, ${existingUser.name}!`);
      return { ok: true };
    }

    if (mode === "register") {
      if (existingUser) return { error: "An account with this email already exists." };

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const newUser: User = {
        id: uid(),
        name,
        email,
        role,
        passHash,
        createdAt: Date.now(),
        isVerified: false,
        verificationCode: code,
        savedHostelIds: [],
        privacySettings: { publicProfile: true, showBookings: true, marketingEmails: false }
      };
      await persistUsers([...users, newUser]);

      return { requiresVerification: true, verificationCode: code, user: newUser };
    }
  };

  const verifyEmailCode = async (userId: string, code: string): Promise<AuthResult | undefined> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { error: "User account not found." };
    if (targetUser.verificationCode !== code.trim()) return { error: "Incorrect verification code. Please check and try again." };

    const verifiedUser: User = { ...targetUser, isVerified: true, verificationCode: undefined };
    const updatedUsers = users.map((u) => (u.id === userId ? verifiedUser : u));
    await persistUsers(updatedUsers);
    await persistSession(verifiedUser);

    setShowAuthModal(false);
    showToast(`Email verified! Welcome to HostelLog, ${verifiedUser.name}.`);
    return { ok: true };
  };

  const resendVerificationCode = async (userId: string): Promise<string | undefined> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return undefined;

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const updatedUser: User = { ...targetUser, verificationCode: newCode };
    const updatedUsers = users.map((u) => (u.id === userId ? updatedUser : u));
    await persistUsers(updatedUsers);

    showToast(`New verification code issued for ${targetUser.email}`);
    return newCode;
  };

  const logout = async () => {
    await persistSession(null);
    showToast("Logged out successfully.");
  };

  const filteredHostels = hostels.filter((h) => {
    const q = searchQuery.trim().toLowerCase();

    const matchesSearch = !q || (
      h.title?.toLowerCase().includes(q) ||
      h.location?.toLowerCase().includes(q) ||
      h.description?.toLowerCase().includes(q) ||
      h.houseRules?.toLowerCase().includes(q) ||
      h.ownerName?.toLowerCase().includes(q) ||
      h.price?.toString().includes(q) ||
      h.capacity?.toString().includes(q) ||
      h.amenities?.some(a => AMENITY_ICONS[a]?.label.toLowerCase().includes(q))
    );

    const matchesAmenity = !activeAmenityFilter || h.amenities?.includes(activeAmenityFilter);
    return matchesSearch && matchesAmenity;
  });

  return (
    <div className="min-h-screen font-sans bg-[#050505] text-[#f5f5f5]">
      <style>{`
        :root {
          --paper: #050505;
          --paper-dark: #0e0e0e;
          --paper-card: #141414;
          --ink: #f5f5f5;
          --ink-muted: #888888;
          --navy: #080808;
          --gold: #c5a059;
          --stamp: #c5a059;
        }
        .rise-in { animation: riseIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-input {
          width: 100%;
          padding: 0.6rem 0.85rem;
          border-radius: 0.5rem;
          background: #141414;
          border: 1px solid rgba(255,255,255,0.12);
          font-family: inherit;
          font-size: 0.85rem;
          color: #f5f5f5;
          transition: all 0.2s ease;
        }
        .auth-input:focus {
          outline: none;
          border-color: #c5a059;
          box-shadow: 0 0 0 1px #c5a059;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 px-5 sm:px-8 py-4 flex items-center justify-between border-b border-white/10 bg-[#080808] text-[#f5f5f5]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c5a059] text-black flex items-center justify-center rounded-sm font-bold shadow-md shadow-[#c5a059]/10">
            <GraduationCap className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="font-serif font-bold text-2xl tracking-tight block leading-none text-white">
              STUDENT<span className="text-[#c5a059]">LOG</span>
            </span>
            <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.2em] text-[#888888]">Student Accommodation & Renter Portal</span>
          </div>
        </div>

        <nav className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-wider">
          <button
            onClick={() => {
              if (!currentUser) {
                setShowAuthModal(true);
                showToast("Please sign in to access property messages.");
                return;
              }
              setChatTargetHostel(null);
              setShowChatModal(true);
            }}
            className="flex items-center gap-1.5 bg-[#141414] hover:bg-[#1e1e1e] text-[#c5a059] px-3 py-1.5 rounded-sm border border-white/10 transition"
            title="Inquiries & Messages"
          >
            <MessageSquare className="w-4 h-4 text-[#c5a059]" />
            <span className="hidden sm:inline text-xs font-mono">Messages</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2.5 bg-[#141414] hover:bg-[#1e1e1e] px-3.5 py-1.5 rounded-sm border border-white/10 transition text-left cursor-pointer group"
                title="View & Edit User Profile"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#c5a059] bg-[#c5a059] text-black flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block">
                  <div className="font-medium text-[#f5f5f5] text-xs leading-none group-hover:text-[#c5a059] transition flex items-center gap-1">
                    {currentUser.name}
                    {currentUser.isVerified && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" title="Verified Email" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono uppercase text-[#c5a059]">
                    {currentUser.role === 'host' ? 'Admin / Host' : 'Student'}
                  </span>
                </div>
              </button>
              <button onClick={logout} title="Log out" className="p-2 rounded-sm text-[#888888] hover:text-white hover:bg-white/10 transition">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-md shadow-[#c5a059]/10"
            >
              <KeyRound className="w-3.5 h-3.5" /> Access Portal
            </button>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 space-y-10">

        {/* Hero Banner with Featured Hostel Image Showcase */}
        <section className="relative overflow-hidden rounded-sm border border-white/10 bg-[#0a0a0a] p-6 sm:p-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-[90px] pointer-events-none"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#141414] border border-[#c5a059]/30 text-[#c5a059] text-[10px] font-mono uppercase tracking-widest shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Verified Student Accommodations & House Galleries</span>
              </div>
              
              <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight text-white leading-[1.15]">
                Find Your Perfect <br className="hidden sm:block" />
                <span className="text-[#c5a059] italic pr-2">Campus Home</span>
              </h1>
              
              <p className="text-[#a0a0a0] text-sm sm:text-base leading-relaxed max-w-xl">
                Browse verified student hostels with real interior picture galleries, high-speed Wi-Fi, study desks, and security. Message property managers directly or book your room vacancy.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {!currentUser ? (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-6 py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-lg shadow-[#c5a059]/20 flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" /> Sign In / Create Account
                  </button>
                ) : (
                  <button
                    onClick={() => { setEditingHostel(null); setShowAdminModal(true); }}
                    className="px-6 py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-lg shadow-[#c5a059]/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Post Student Hostel & House Gallery
                  </button>
                )}
                
                <a
                  href="#hostels-list"
                  className="px-5 py-3 rounded-sm font-mono text-xs uppercase tracking-widest text-[#f5f5f5] bg-[#161616] hover:bg-[#202020] border border-white/10 transition flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5 text-[#c5a059]" /> Explore Listings ({hostels.length})
                </a>
              </div>
            </div>

            {/* Featured Hostel Photo Preview Card */}
            {hostels.length > 0 && (
              <div
                onClick={() => setSelectedHostel(hostels[0])}
                className="lg:col-span-5 group cursor-pointer relative rounded-sm border border-[#c5a059]/40 overflow-hidden shadow-2xl bg-[#121212] transition hover:border-[#c5a059]"
              >
                <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                  <img
                    src={hostels[0].images?.[0] || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"}
                    alt={hostels[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  
                  <div className="absolute top-3 left-3 bg-[#c5a059] text-black text-[9px] font-mono uppercase px-2.5 py-1 rounded-sm shadow font-bold tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Featured Residence
                  </div>

                  {hostels[0].images && hostels[0].images.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm border border-white/10 text-white font-mono text-[10px] px-2.5 py-1 rounded-sm flex items-center gap-1">
                      <Camera className="w-3 h-3 text-[#c5a059]" /> {hostels[0].images.length} House Pics
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-xl text-white group-hover:text-[#c5a059] transition">
                        {hostels[0].title}
                      </h3>
                      <span className="font-serif font-bold text-base text-[#c5a059] bg-black/80 px-2.5 py-0.5 rounded-sm border border-[#c5a059]/30">
                        Ksh {hostels[0].price?.toLocaleString()} <span className="text-[9px] font-mono text-white/60">/mo</span>
                      </span>
                    </div>
                    <p className="font-mono text-xs text-[#a0a0a0] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#c5a059]" /> {hostels[0].location}
                    </p>
                  </div>
                </div>
                <div className="p-3.5 bg-[#0e0e0e] flex items-center justify-between text-xs font-mono text-[#a0a0a0] border-t border-white/5">
                  <span className="flex items-center gap-1.5 text-[#c5a059] font-bold">
                    <Eye className="w-3.5 h-3.5" /> View Photo Gallery & Details
                  </span>
                  <span className="text-[10px] uppercase text-[#666]">Cap: {hostels[0].capacity} Beds</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Search & Actions Bar */}
        <section id="hostels-list" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student hostels, location, price, amenities..."
                className="w-full pl-9 pr-10 py-3 rounded-md text-xs font-mono border border-white/10 bg-[#141414] text-[#f5f5f5] placeholder-[#888888] focus:border-[#c5a059] outline-none transition"
              />
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-[#888888]" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-[#888888] hover:text-white transition p-0.5"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {currentUser?.role === "host" ? (
              <button
                onClick={() => { setEditingHostel(null); setShowAdminModal(true); }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-lg shadow-[#c5a059]/10"
              >
                <Plus className="w-4 h-4" /> Add Student Property & Pics
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 rounded-sm text-xs font-mono text-[#c5a059] transition"
              >
                <Building2 className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Renter Mode: Sign in to list student housing</span>
              </button>
            )}
          </div>

          {/* Amenity Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
            <span className="text-[#888888] text-[10px] uppercase tracking-widest mr-1">Filter:</span>
            <button
              onClick={() => setActiveAmenityFilter(null)}
              className={`px-3.5 py-1.5 rounded-sm transition border ${activeAmenityFilter === null ? "bg-[#c5a059] text-black font-bold border-[#c5a059]" : "bg-[#141414] text-[#888888] border-white/10 hover:text-white"}`}
            >
              All Facilities
            </button>
            {Object.entries(AMENITY_ICONS).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setActiveAmenityFilter(activeAmenityFilter === key ? null : key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm transition border ${activeAmenityFilter === key ? "bg-[#c5a059] text-black font-bold border-[#c5a059]" : "bg-[#141414] text-[#888888] border-white/10 hover:text-white"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </section>

        {/* Directory Stats Banner */}
        <section className="p-5 glass-dark border border-white/10 rounded-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-8 sm:gap-12">
            <div>
              <p className="text-[10px] uppercase text-[#888888] tracking-[0.2em] font-mono">Student Properties</p>
              <p className="text-2xl font-serif text-[#f5f5f5] font-bold">{hostels.length} Verified Listed</p>
            </div>
            <div className="border-l border-white/10 pl-8">
              <p className="text-[10px] uppercase text-[#888888] tracking-[0.2em] font-mono">Portal Status</p>
              <p className="text-2xl font-serif text-[#c5a059] font-bold">Live & Verified</p>
            </div>
            {currentUser && (
              <div className="border-l border-white/10 pl-8 hidden sm:block">
                <p className="text-[10px] uppercase text-[#888888] tracking-[0.2em] font-mono">Student Saved</p>
                <p className="text-2xl font-serif text-[#f5f5f5] font-bold">{currentUser?.savedHostelIds?.length || 0} Hostels</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hostels.length > 0 && currentUser?.role === "host" && (
              <button
                onClick={async () => {
                  for (const h of hostels) {
                    await removeHostel(h.id);
                  }
                  setHostels([]);
                  showToast("Catalog cleared to blank directory.");
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 font-mono text-[11px] uppercase rounded-sm transition flex items-center gap-1.5"
                title="Clear catalog and start blank"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Directory
              </button>
            )}
            {currentUser && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-[#c5a059] font-mono text-xs uppercase tracking-wider rounded-sm transition flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" /> User Profile
              </button>
            )}
          </div>
        </section>

        {/* Hostels Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-3xl font-bold flex items-center gap-3 text-[#f5f5f5]">
              <GraduationCap className="w-6 h-6 text-[#c5a059]" /> Student Hostels Directory
            </h2>
            <span className="font-mono text-xs text-[#888888] tracking-widest">{filteredHostels.length} MATCHES</span>
          </div>

          {filteredHostels.length === 0 ? (
            <div className="text-center py-16 px-6 border border-dashed border-[#c5a059]/30 rounded-sm bg-[#0e0e0e] max-w-2xl mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059]">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-white">Student Hostel Directory is Blank</h3>
                <p className="font-sans text-xs text-[#a0a0a0] leading-relaxed max-w-lg mx-auto">
                  This portal is completely clean and ready for renters and property owners to post their student hostels, room vacancies, and house picture galleries.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {currentUser?.role === "host" ? (
                  <button
                    onClick={() => { setEditingHostel(null); setShowAdminModal(true); }}
                    className="px-6 py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-lg shadow-[#c5a059]/10 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Post Student Property & House Gallery
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-6 py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-lg shadow-[#c5a059]/10 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" /> Sign In as Renter to Add Property
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredHostels.map((h) => {
                const coverPic = h.images && h.images.length > 0 ? h.images[0] : "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";
                const isSaved = currentUser?.savedHostelIds?.includes(h.id);

                return (
                  <article
                    key={h.id}
                    onClick={() => setSelectedHostel(h)}
                    className="group rounded-sm border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300 hover:border-[#c5a059]/60 cursor-pointer bg-[#0e0e0e]"
                  >
                    <div>
                      {/* Photo Header */}
                      <div className="relative h-56 w-full bg-[#161616] overflow-hidden">
                        <img src={coverPic} alt={h.title} className="w-full h-full object-cover opacity-75 group-hover:opacity-95 transition-opacity duration-300 group-hover:scale-105" />
                        
                        {/* Save Heart Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveHostel(h.id);
                          }}
                          className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm p-2 rounded-sm text-white hover:scale-110 transition border border-white/10"
                          title={isSaved ? "Remove from saved" : "Save hostel"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-[#c5a059] text-[#c5a059]" : "text-white"}`} />
                        </button>

                        <div className="absolute top-3 right-3 bg-[#c5a059] text-black text-[9px] font-mono uppercase px-2.5 py-1 rounded-sm shadow font-bold tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified
                        </div>
                        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm border border-white/10 text-[#f5f5f5] font-mono text-xs px-3 py-1 rounded-sm flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#c5a059]" /> Cap: {h.capacity} Beds
                        </div>
                        {h.images && h.images.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm border border-white/10 text-white font-mono text-[10px] px-2.5 py-1 rounded-sm">
                            📷 {h.images.length} Pics
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-serif font-bold text-2xl text-[#f5f5f5] group-hover:text-[#c5a059] transition-colors">{h.title}</h3>
                          <span className="font-serif font-bold text-lg text-[#c5a059] bg-[#c5a059]/10 px-3 py-0.5 rounded-sm border border-[#c5a059]/20">
                            Ksh {h.price?.toLocaleString()} <span className="text-[10px] text-white/50 font-mono">/ mo</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-xs text-[#888888] mb-3">
                          <MapPin className="w-3.5 h-3.5 text-[#c5a059]" /> {h.location}
                        </div>

                        <p className="text-xs text-[#a0a0a0] line-clamp-2 mb-5 leading-relaxed font-sans">{h.description}</p>

                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                          {h.amenities?.map((aKey) => {
                            const item = AMENITY_ICONS[aKey];
                            if (!item) return null;
                            const Icon = item.icon;
                            return (
                              <span key={aKey} className="flex items-center gap-1.5 text-[10px] font-mono bg-[#161616] px-2.5 py-1 rounded-sm text-[#888888] border border-white/5">
                                <Icon className="w-3 h-3 text-[#c5a059]" /> {item.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-3.5 border-t border-white/10 bg-[#080808] flex items-center justify-between text-xs font-mono text-[#888888]">
                      <span className="flex items-center gap-1.5 group-hover:text-white transition-colors">
                        <Clock className="w-3.5 h-3.5 text-[#c5a059]" /> View House Gallery & Reserve
                      </span>
                      {currentUser?.role === "host" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHostel(h);
                              setShowAdminModal(true);
                            }}
                            className="p-1 hover:text-[#c5a059] transition"
                            title="Edit Hostel & Pics"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteHostel(h.id, e)}
                            className="p-1 text-red-400 hover:text-red-300 transition"
                            title="Delete Hostel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Render Modals */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthenticate={authenticate}
          onVerifyCode={verifyEmailCode}
          onResendCode={resendVerificationCode}
        />
      )}
      
      {showAdminModal && (
        <AdminHostelModal
          existingHostel={editingHostel}
          currentUser={currentUser}
          onClose={() => { setShowAdminModal(false); setEditingHostel(null); }}
          onSave={handleSaveHostel}
        />
      )}

      {selectedHostel && (
        <GuestHostelDetailModal
          hostel={selectedHostel}
          onClose={() => setSelectedHostel(null)}
          onOpenChat={(hostel) => {
            if (!currentUser) {
              setShowAuthModal(true);
              showToast("Please sign in or register to message property owners.");
              return;
            }
            setChatTargetHostel(hostel);
            setShowChatModal(true);
          }}
          onBook={async (hostel, nights, guests, total, startDate, endDate) => {
            setSelectedHostel(null);
            const newBooking: Booking = {
              id: uid(),
              hostelId: hostel.id,
              hostelTitle: hostel.title,
              hostelLocation: hostel.location,
              hostelImage: hostel.images?.[0] || "",
              nights,
              guests,
              totalPrice: total,
              createdAt: Date.now(),
              status: 'confirmed',
              startDate,
              endDate,
            };
            const updatedBookings = [newBooking, ...userBookings];
            setUserBookings(updatedBookings);
            if (currentUser) {
              await saveBooking(newBooking);
            }
            const dateRangeMsg = startDate && endDate ? ` (${startDate} to ${endDate})` : '';
            showToast(`Stay reservation submitted for ${nights} month(s)${dateRangeMsg} for Ksh ${total?.toLocaleString()}!`);
          }}
        />
      )}

      {showChatModal && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setChatTargetHostel(null);
          }}
          currentUser={currentUser}
          initialHostel={chatTargetHostel}
          onRequireLogin={() => {
            setShowAuthModal(true);
            showToast("Please sign in to send messages.");
          }}
        />
      )}

      {showProfileModal && currentUser && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onSaveProfile={handleSaveProfile}
          bookings={userBookings}
          savedHostels={hostels.filter((h) => currentUser.savedHostelIds?.includes(h.id))}
          onRemoveSaved={(id) => toggleSaveHostel(id)}
          onSelectHostel={(h) => {
            setShowProfileModal(false);
            setSelectedHostel(h);
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-sm shadow-2xl font-mono text-xs rise-in text-[#f5f5f5] bg-[#141414] border border-[#c5a059]">
          {toast}
        </div>
      )}
    </div>
  );
}
