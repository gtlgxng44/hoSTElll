import React, { useState, useRef } from "react";
import {
  X, User as UserIcon, Mail, Phone, MapPin, Camera,
  Bookmark, Calendar, Shield, Eye, EyeOff, Check,
  Trash2, ExternalLink, Lock, Luggage, Clock, Heart, Award, Download,
  CheckCircle2, AlertTriangle, MailCheck
} from "lucide-react";
import { User, Booking, Hostel, PrivacySettings } from "../types";
import { sendVerificationEmail } from "../lib/emailService";

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onSaveProfile: (updatedUser: Partial<User>) => void;
  bookings: Booking[];
  savedHostels: Hostel[];
  onRemoveSaved: (hostelId: string) => void;
  onSelectHostel: (hostel: Hostel) => void;
}

export function UserProfileModal({
  user,
  onClose,
  onSaveProfile,
  bookings,
  savedHostels,
  onRemoveSaved,
  onSelectHostel,
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "bookings" | "saved" | "privacy">("profile");
  
  // Profile form state
  const [name, setName] = useState(user.name || "");
  const [email] = useState(user.email || "");
  const [avatarUrl, setAvatarUrl] = useState(
    user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
  );
  const [bio, setBio] = useState(user.bio || "Avid traveler exploring hidden gems and eco-lodges.");
  const [phone, setPhone] = useState(user.phone || "+254 712 345 678");
  const [location, setLocation] = useState(user.location || "Nairobi, Kenya");
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);

  // Privacy settings state
  const [privacy, setPrivacy] = useState<PrivacySettings>(
    user.privacySettings || {
      publicProfile: true,
      showBookings: true,
      marketingEmails: false,
    }
  );

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email Verification State inside Profile
  const [showVerifyBox, setShowVerifyBox] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [activeCode, setActiveCode] = useState(user.verificationCode || "682049");
  const [verifyError, setVerifyError] = useState("");
  const [showCodeHelp, setShowCodeHelp] = useState(false);

  const handleStartVerify = () => {
    const code = user.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();
    setActiveCode(code);
    onSaveProfile({ verificationCode: code });
    sendVerificationEmail(user.email, user.name, code);
    setShowVerifyBox(true);
    setVerifyError("");
  };

  const handleConfirmVerify = () => {
    if (verifyInput.trim() === activeCode) {
      onSaveProfile({ isVerified: true, verificationCode: undefined });
      setShowVerifyBox(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      setVerifyError("Incorrect verification code. Try again.");
    }
  };

  // Handle avatar file upload preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomAvatar = () => {
    if (customAvatarInput.trim()) {
      setAvatarUrl(customAvatarInput.trim());
      setCustomAvatarInput("");
      setShowAvatarUrlInput(false);
    }
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      name,
      avatarUrl,
      bio,
      phone,
      location,
      privacySettings: privacy,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const togglePrivacy = (key: keyof PrivacySettings) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    onSaveProfile({ privacySettings: updated });
  };

  const handleDownloadReceipt = (booking: Booking) => {
    const receiptContent = `
=========================================
          STUDENTLOG RECEIPT
=========================================
Booking ID: ${booking.id}
Date: ${new Date(booking.createdAt).toLocaleString()}
Status: ${booking.status.toUpperCase()}

Hostel: ${booking.hostelTitle}
Location: ${booking.hostelLocation}

Duration: ${booking.nights} month(s)
Residents: ${booking.guests}
Check-in: ${booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}
Check-out: ${booking.endDate ? new Date(booking.endDate).toLocaleDateString() : 'N/A'}

=========================================
TOTAL PAID: Ksh ${booking.totalPrice?.toLocaleString()}
=========================================
Thank you for using StudentLog!
`.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${booking.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-sm p-6 sm:p-8 shadow-2xl rise-in max-h-[90vh] flex flex-col bg-[#0e0e0e] text-[#f5f5f5] border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#c5a059] bg-[#1a1a1a] flex-shrink-0">
              <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-2xl font-bold text-white">{user.name}</h2>
                {user.isVerified && (
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 rounded-sm font-bold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Email
                  </span>
                )}
                <span className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest rounded-sm font-bold ${
                  user.role === 'host' ? 'bg-[#c5a059] text-black' : 'bg-white/10 text-[#c5a059]'
                }`}>
                  {user.role === 'host' ? 'Admin / Host' : 'Student Resident'}
                </span>
              </div>
              <p className="font-mono text-xs text-[#888888]">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-[#888888] hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 my-4 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition border-b-2 ${
              activeTab === "profile"
                ? "border-[#c5a059] text-[#c5a059] font-bold"
                : "border-transparent text-[#888888] hover:text-white"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" /> Personal Info
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition border-b-2 ${
              activeTab === "bookings"
                ? "border-[#c5a059] text-[#c5a059] font-bold"
                : "border-transparent text-[#888888] hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Stay Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition border-b-2 ${
              activeTab === "saved"
                ? "border-[#c5a059] text-[#c5a059] font-bold"
                : "border-transparent text-[#888888] hover:text-white"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Saved Hostels ({savedHostels.length})
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition border-b-2 ${
              activeTab === "privacy"
                ? "border-[#c5a059] text-[#c5a059] font-bold"
                : "border-transparent text-[#888888] hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Privacy & Security
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto pr-1">
          
          {/* TAB 1: PERSONAL INFO */}
          {activeTab === "profile" && (
            <form onSubmit={handleSubmitProfile} className="space-y-5 py-2">
              
              {/* Email Verification Status Card */}
              <div className={`p-4 rounded-sm border ${
                user.isVerified ? "bg-emerald-950/20 border-emerald-500/30" : "bg-amber-950/20 border-amber-500/30"
              } space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    {user.isVerified ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <div>
                      <h4 className="font-serif font-bold text-sm text-white flex items-center gap-2">
                        {user.isVerified ? "Email Address Verified" : "Unverified Email Address"}
                      </h4>
                      <p className="font-mono text-xs text-[#a0a0a0]">
                        {user.isVerified 
                          ? "Your account email is verified. You have full access to book hostels and publish property listings."
                          : `Email verification pending for ${user.email}`}
                      </p>
                    </div>
                  </div>

                  {!user.isVerified && (
                    <button
                      type="button"
                      onClick={handleStartVerify}
                      className="px-3.5 py-1.5 bg-[#c5a059] text-black font-mono text-xs font-bold uppercase rounded-sm hover:brightness-110 transition shrink-0"
                    >
                      Verify Email
                    </button>
                  )}
                </div>

                {!user.isVerified && showVerifyBox && (
                  <div className="pt-3 border-t border-white/10 space-y-3 bg-[#101010] p-3 rounded-sm">
                    <div className="p-3 bg-[#181818] border border-[#c5a059]/30 rounded-sm font-mono text-xs space-y-1.5">
                      <div className="text-[10px] uppercase text-emerald-400 font-bold flex items-center gap-1">
                        <MailCheck className="w-3.5 h-3.5" /> Verification Email Dispatched
                      </div>
                      <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
                        A 6-digit confirmation code was sent to <span className="text-white font-bold">{user.email}</span>. Please check your inbox or spam folder.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={verifyInput}
                        onChange={(e) => setVerifyInput(e.target.value)}
                        placeholder="123456"
                        className="auth-input font-mono tracking-widest text-center flex-1 text-sm font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmVerify}
                        className="px-4 py-1.5 bg-[#c5a059] text-black font-bold font-mono text-xs uppercase rounded-sm hover:brightness-110"
                      >
                        Confirm Code
                      </button>
                    </div>
                    {verifyError && <p className="font-mono text-xs text-red-300">{verifyError}</p>}
                  </div>
                )}
              </div>
              
              {/* Profile Avatar Upload Section */}
              <div className="p-4 rounded-sm border border-white/10 bg-[#141414] flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#c5a059] bg-[#1e1e1e]">
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#c5a059] font-bold">
                    Profile Picture
                  </span>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-white rounded-sm font-mono text-xs flex items-center gap-1.5 transition"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#c5a059]" /> Upload Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                      className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-[#888888] hover:text-white rounded-sm font-mono text-xs flex items-center gap-1.5 transition"
                    >
                      Use Image URL
                    </button>
                  </div>

                  {showAvatarUrlInput && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="url"
                        value={customAvatarInput}
                        onChange={(e) => setCustomAvatarInput(e.target.value)}
                        placeholder="Paste image web URL..."
                        className="auth-input text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomAvatar}
                        className="px-3 py-1.5 bg-[#c5a059] text-black font-bold font-mono text-xs rounded-sm hover:brightness-110"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#888888] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="auth-input pl-9"
                      required
                    />
                    <UserIcon className="w-4 h-4 absolute left-3 top-3 text-[#888888]" />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#888888] mb-1">
                    Email Address (Read only)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="auth-input pl-9 opacity-50 cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-[#888888]" />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#888888] mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 700 000000"
                      className="auth-input pl-9"
                    />
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-[#888888]" />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#888888] mb-1">
                    Base Location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Nairobi, Kenya"
                      className="auth-input pl-9"
                    />
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#888888]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#888888] mb-1">
                  Traveler Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a brief intro for hosts..."
                  className="auth-input"
                />
              </div>

              {/* Admin Note if user is host */}
              {user.role === 'host' ? (
                <div className="p-3 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-sm flex items-center gap-2 text-xs text-[#c5a059] font-mono">
                  <Award className="w-4 h-4 flex-shrink-0" />
                  <span>Admin / Host privilege verified: You have permission to manage hostel picture galleries.</span>
                </div>
              ) : (
                <div className="p-3 bg-white/5 border border-white/10 rounded-sm flex items-center gap-2 text-xs text-[#888888] font-mono">
                  <Lock className="w-4 h-4 flex-shrink-0 text-[#888888]" />
                  <span>Standard Traveler Profile. Note: Only Admin/Host accounts can add or edit hostel house pictures.</span>
                </div>
              )}

              {savedSuccess && (
                <p className="font-mono text-xs text-emerald-400 bg-emerald-950/80 p-2.5 rounded-sm border border-emerald-800/50 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Profile updated successfully!
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-sm font-mono text-xs uppercase tracking-widest font-bold text-black bg-[#c5a059] hover:brightness-110 transition shadow-lg shadow-[#c5a059]/10"
              >
                Save Profile Changes
              </button>
            </form>
          )}

          {/* TAB 2: PAST & UPCOMING BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="space-y-4 py-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-2">
                Your Reservation History
              </h3>

              {bookings.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-sm bg-[#141414]">
                  <Luggage className="w-10 h-10 mx-auto text-[#888888] opacity-40 mb-2" />
                  <p className="font-mono text-xs text-[#888888]">No stay reservations recorded yet.</p>
                  <p className="text-[11px] text-[#666666] mt-1">Browse hostels and book your first stay.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-sm border border-white/10 bg-[#141414] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={b.hostelImage}
                          alt={b.hostelTitle}
                          className="w-16 h-16 rounded-sm object-cover border border-white/10"
                        />
                        <div>
                          <h4 className="font-serif font-bold text-base text-white">{b.hostelTitle}</h4>
                          <p className="font-mono text-xs text-[#888888] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#c5a059]" /> {b.hostelLocation}
                          </p>
                          <div className="flex items-center gap-3 mt-1 font-mono text-[11px] text-[#a0a0a0]">
                            <span>{b.nights} month(s)</span>
                            <span>•</span>
                            <span>{b.guests} resident(s)</span>
                            <span>•</span>
                            <span className="text-[#c5a059] font-bold">Ksh {b.totalPrice?.toLocaleString()}</span>
                          </div>
                          {b.startDate && b.endDate && (
                            <p className="font-mono text-[10px] text-[#888888] mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#c5a059]" />
                              <span>
                                {new Date(b.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(b.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:gap-4 self-end sm:self-center">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm font-bold ${
                              b.status === "confirmed"
                                ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/50"
                                : b.status === "completed"
                                ? "bg-blue-900/40 text-blue-300 border border-blue-700/50"
                                : "bg-red-900/40 text-red-400 border border-red-700/50"
                            }`}
                          >
                            {b.status}
                          </span>
                          <span className="font-mono text-[10px] text-[#666666]">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadReceipt(b)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-[#d0d0d0] hover:text-white font-mono text-[10px] uppercase transition"
                          title="Download Receipt"
                        >
                          <Download className="w-3 h-3 text-[#c5a059]" /> <span className="hidden sm:inline">Receipt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAVED HOSTELS */}
          {activeTab === "saved" && (
            <div className="space-y-4 py-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-2">
                Bookmarked Hostels ({savedHostels.length})
              </h3>

              {savedHostels.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-sm bg-[#141414]">
                  <Heart className="w-10 h-10 mx-auto text-[#888888] opacity-40 mb-2" />
                  <p className="font-mono text-xs text-[#888888]">You haven't saved any hostels yet.</p>
                  <p className="text-[11px] text-[#666666] mt-1">Click the heart icon on any hostel card to save it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedHostels.map((h) => {
                    const cover = h.images?.[0] || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80";
                    return (
                      <div
                        key={h.id}
                        className="rounded-sm border border-white/10 bg-[#141414] overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative h-32 w-full bg-[#1e1e1e]">
                            <img src={cover} alt={h.title} className="w-full h-full object-cover" />
                            <button
                              onClick={() => onRemoveSaved(h.id)}
                              className="absolute top-2 right-2 bg-black/80 text-red-400 p-1.5 rounded-sm hover:scale-110 transition"
                              title="Remove from saved"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="p-3">
                            <h4 className="font-serif font-bold text-base text-white">{h.title}</h4>
                            <p className="font-mono text-xs text-[#888888] flex items-center gap-1 mb-2">
                              <MapPin className="w-3 h-3 text-[#c5a059]" /> {h.location}
                            </p>
                            <span className="font-serif font-bold text-sm text-[#c5a059]">
                              Ksh {h.price?.toLocaleString()} / month
                            </span>
                          </div>
                        </div>

                        <div className="p-3 pt-0">
                          <button
                            onClick={() => {
                              onClose();
                              onSelectHostel(h);
                            }}
                            className="w-full py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 text-white font-mono text-xs rounded-sm flex items-center justify-center gap-1.5 transition"
                          >
                            <ExternalLink className="w-3 h-3 text-[#c5a059]" /> View Details & Book
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRIVACY SETTINGS */}
          {activeTab === "privacy" && (
            <div className="space-y-5 py-2">
              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#c5a059] mb-1">
                  Privacy Preferences
                </h3>
                <p className="text-xs text-[#888888] font-sans">
                  Manage how your profile information and stay history are visible to host networks.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-sm border border-white/10 bg-[#141414] flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-white">Public Profile Visibility</h4>
                    <p className="text-xs text-[#888888]">Allow verified hosts to see your profile name and avatar</p>
                  </div>
                  <button
                    onClick={() => togglePrivacy("publicProfile")}
                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${
                      privacy.publicProfile ? "bg-[#c5a059]" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        privacy.publicProfile ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-sm border border-white/10 bg-[#141414] flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-white">Show Stay History</h4>
                    <p className="text-xs text-[#888888]">Display previous eco-lodges & hostel stamps on your traveler log</p>
                  </div>
                  <button
                    onClick={() => togglePrivacy("showBookings")}
                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${
                      privacy.showBookings ? "bg-[#c5a059]" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        privacy.showBookings ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-sm border border-white/10 bg-[#141414] flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-white">Curated Special Offers</h4>
                    <p className="text-xs text-[#888888]">Receive notifications about new hostel additions & seasonal rates</p>
                  </div>
                  <button
                    onClick={() => togglePrivacy("marketingEmails")}
                    className={`w-12 h-6 rounded-full p-1 transition-colors relative ${
                      privacy.marketingEmails ? "bg-[#c5a059]" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        privacy.marketingEmails ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Admin Hostel Picture Access Control Notice */}
              <div className="p-4 rounded-sm border border-white/10 bg-[#141414] space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#c5a059]" />
                  <h4 className="font-mono text-xs uppercase font-bold text-[#c5a059]">Hostel Media Permissions</h4>
                </div>
                <p className="text-xs text-[#a0a0a0] leading-relaxed">
                  To maintain quality control, <span className="text-white font-semibold">only verified Admin / Host accounts</span> are permitted to register hostels and upload house pictures. Standard traveler accounts cannot modify property picture galleries.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
