import React, { useState, useEffect, useRef } from "react";
import {
  X, Send, MessageSquare, Building2, User, Clock,
  CheckCheck, Sparkles, ChevronLeft, ArrowRight, ArrowLeft, ShieldCheck, GraduationCap
} from "lucide-react";
import { User as UserType, Hostel, ChatMessage, Conversation } from "../types";
import { fetchConversations, saveConversation, fetchMessages, saveMessage, subscribeToConversations, subscribeToMessages } from "../lib/firebase";

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const PRESET_INQUIRIES = [
  "Is a room/bed available for next semester?",
  "Are electricity & water included in the Ksh rate?",
  "Can I schedule a property viewing this week?",
  "What is the security & visitor policy?"
];

const OWNER_AUTO_RESPONSES = [
  "Hello! Thank you for reaching out. Yes, we currently have student vacancies available for next semester. Would you like to schedule a viewing?",
  "Hi there! Water, security, and high-speed Wi-Fi are fully included in the monthly Ksh rate. Electricity is token-based.",
  "Greetings! You are welcome to visit and view the hostel rooms. Our caretaker is on-site daily from 8:00 AM to 5:00 PM.",
  "Hi! We offer 24/7 guarded security, CCTV, and locked entry gates. Student visitors are allowed in the common lounge area until 9:00 PM."
];

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  initialHostel: Hostel | null;
  onRequireLogin: () => void;
}

export function ChatModal({
  isOpen,
  onClose,
  currentUser,
  initialHostel,
  onRequireLogin,
}: ChatModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load conversations on mount / opening
  useEffect(() => {
    if (!isOpen) return;
    if (!currentUser) {
      onRequireLogin();
      onClose();
      return;
    }

    setLoading(true);

    let isFirstLoad = true;

    const unsubscribe = subscribeToConversations(currentUser.id, async (convs) => {
      // Filter conversations relevant to current user
      let userConvs = convs.filter(
        (c) => c.studentId === currentUser.id || c.hostId === currentUser.id
      ).sort((a, b) => b.lastUpdated - a.lastUpdated);

      if (isFirstLoad) {
        isFirstLoad = false;
        let targetConvId: string | null = null;

        // If launched for a specific hostel
        if (initialHostel) {
          const hostId = initialHostel.ownerId || "owner-default";
          const hostName = initialHostel.ownerName || "Property Manager";

          let existing = userConvs.find(
            (c) => c.hostelId === initialHostel.id && c.studentId === currentUser.id
          );

          if (!existing) {
            existing = {
              id: `conv_${uid()}`,
              hostelId: initialHostel.id,
              hostelTitle: initialHostel.title,
              hostelImage: initialHostel.images?.[0] || "",
              studentId: currentUser.id,
              studentName: currentUser.name || "Student Resident",
              hostId,
              hostName,
              lastMessage: "Inquiry initiated",
              lastUpdated: Date.now(),
            };
            userConvs = [existing, ...userConvs];
            await saveConversation(existing);
            targetConvId = existing.id;
          } else {
            targetConvId = existing.id;
          }
        } else if (userConvs.length > 0) {
          targetConvId = userConvs[0].id;
        }

        setActiveConvId(targetConvId);
        setLoading(false);
      }
      setConversations(userConvs);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser, initialHostel]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let isSubscribed = true;

    const unsubscribe = subscribeToMessages(activeConvId, async (msgs) => {
      if (!isSubscribed) return;

      if (msgs.length > 0) {
        setMessages(msgs);
      } else {
        // If fresh conversation, add welcome greeting from property owner
        // We do this by checking if there's a local conversation with this ID
        setConversations(prev => {
           const activeConv = prev.find((c) => c.id === activeConvId);
           if (activeConv) {
             const initialMsg: ChatMessage = {
               id: uid(),
               conversationId: activeConvId,
               senderId: activeConv?.hostId || "owner-default",
               senderName: activeConv?.hostName || "Property Manager",
               senderRole: "host",
               text: `Welcome to ${activeConv?.hostelTitle || "our student hostel"}! How can we assist you with your student room booking or inquiry?`,
               timestamp: Date.now(),
             };
             // Save it so it fires a snapshot update next time
             saveMessage(initialMsg).catch(console.error);
           }
           return prev;
        });
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMsg;
    if (!text.trim() || !activeConvId || !currentUser) return;

    const currentConv = conversations.find((c) => c.id === activeConvId);
    if (!currentConv) return;

    const newMsg: ChatMessage = {
      id: uid(),
      conversationId: activeConvId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: text.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputMsg("");

    // Update conversation lastMessage
    const currentConvUpdate = { ...currentConv, lastMessage: text.trim(), lastUpdated: Date.now() };
    const updatedConvs = conversations.map((c) =>
      c.id === activeConvId
        ? currentConvUpdate
        : c
    );
    setConversations(updatedConvs);

    // Save to storage
    await saveMessage(newMsg);
    await saveConversation(currentConvUpdate);

    // Auto-reply simulation for guest inquiries
    if (currentUser.role === "guest") {
      setTimeout(async () => {
        const randomReply = OWNER_AUTO_RESPONSES[Math.floor(Math.random() * OWNER_AUTO_RESPONSES.length)];
        const replyMsg: ChatMessage = {
          id: uid(),
          conversationId: activeConvId,
          senderId: currentConv.hostId || "owner-default",
          senderName: currentConv.hostName || "Property Manager",
          senderRole: "host",
          text: randomReply,
          timestamp: Date.now(),
        };
        await saveMessage(replyMsg);
        const updatedConvReply = { ...currentConvUpdate, lastMessage: randomReply, lastUpdated: Date.now() };
        await saveConversation(updatedConvReply);
      }, 1000);
    }
  };

  if (!isOpen) return null;

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#0c0c0c] border border-white/10 rounded-sm shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 text-[#888888] hover:text-white bg-[#181818] rounded-full border border-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* SIDEBAR: CONVERSATIONS LIST */}
        <div className={`w-full md:w-80 border-r border-white/10 bg-[#080808] flex-col h-full ${activeConvId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111]">
            <div className="flex items-center gap-2 text-white font-serif font-bold text-base">
              <MessageSquare className="w-4 h-4 text-[#c5a059]" />
              <span>Inquiries & Messages</span>
            </div>
            <span className="font-mono text-[10px] text-[#888] uppercase tracking-wider">
              {conversations.length} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-6 text-center text-xs font-mono text-[#888]">
                Loading chats...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Building2 className="w-8 h-8 text-[#555] mx-auto" />
                <p className="font-mono text-xs text-[#888]">No ongoing conversations yet.</p>
                <p className="font-sans text-[11px] text-[#666]">
                  Select a student hostel and click "Message Property Owner" to ask questions directly.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const otherParty = currentUser?.role === "guest" ? conv.hostName : conv.studentName;
                const otherRole = currentUser?.role === "guest" ? "Property Owner" : "Student Resident";

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-3.5 text-left transition flex gap-3 items-center ${
                      isActive ? "bg-[#1c1a14] border-l-2 border-[#c5a059]" : "hover:bg-[#121212]"
                    }`}
                  >
                    {conv.hostelImage ? (
                      <img
                        src={conv.hostelImage}
                        alt={conv.hostelTitle}
                        className="w-11 h-11 rounded-sm object-cover border border-white/10 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-sm bg-[#222] border border-white/10 flex items-center justify-center text-[#c5a059] flex-shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-serif font-bold text-xs text-white truncate">
                          {conv.hostelTitle}
                        </h4>
                        <span className="font-mono text-[9px] text-[#777] flex-shrink-0">
                          {new Date(conv.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-[#c5a059] truncate flex items-center gap-1">
                        {currentUser?.role === "guest" ? (
                          <ShieldCheck className="w-3 h-3 text-[#c5a059]" />
                        ) : (
                          <GraduationCap className="w-3 h-3 text-[#c5a059]" />
                        )}
                        <span>{otherParty} ({otherRole})</span>
                      </p>
                      <p className="font-sans text-[11px] text-[#888] truncate mt-1">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT MAIN AREA */}
        <div className={`flex-1 flex-col h-full bg-[#0e0e0e] ${!activeConvId ? "hidden md:flex" : "flex"}`}>
          {activeConv ? (
            <>
              {/* CHAT HEADER */}
              <div className="p-4 border-b border-white/10 bg-[#121212] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvId("")}
                    className="md:hidden p-2 -ml-2 text-[#888] hover:text-white transition"
                    title="Back to inquiries"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {activeConv.hostelImage && (
                    <img
                      src={activeConv.hostelImage}
                      alt=""
                      className="w-10 h-10 rounded-sm object-cover border border-white/10"
                    />
                  )}
                  <div>
                    <h3 className="font-serif font-bold text-sm text-white">
                      {activeConv.hostelTitle}
                    </h3>
                    <p className="font-mono text-[10px] text-[#a0a0a0] flex items-center gap-1">
                      <span className="text-[#c5a059]">Chatting with:</span>{" "}
                      {currentUser?.role === "guest"
                        ? `${activeConv.hostName} (Property Owner)`
                        : `${activeConv.studentName} (Student Resident)`}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#1a1a1a] border border-white/10 text-[10px] font-mono text-[#a0a0a0]">
                  <Sparkles className="w-3 h-3 text-[#c5a059]" /> Direct Inquiry
                </div>
              </div>

              {/* MESSAGES THREAD */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0a0a0a]">
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] text-[#777]">
                          {msg.senderName} ({msg.senderRole === "host" ? "Property Owner" : "Student"})
                        </span>
                        <span className="font-mono text-[9px] text-[#555]">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-sm font-sans text-xs leading-relaxed ${
                          isMe
                            ? "bg-[#c5a059] text-black font-medium border border-[#c5a059]"
                            : "bg-[#181818] text-[#f5f5f5] border border-white/10"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* PRESET INQUIRY BUTTONS */}
              {currentUser?.role === "guest" && (
                <div className="px-3 py-2 bg-[#121212] border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[9px] font-mono uppercase text-[#888] self-center whitespace-nowrap pr-1">
                    Quick Ask:
                  </span>
                  {PRESET_INQUIRIES.map((inquiry, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(inquiry)}
                      className="text-[10px] font-mono whitespace-nowrap px-2.5 py-1 rounded-sm bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#d0d0d0] hover:text-white border border-white/10 transition"
                    >
                      {inquiry}
                    </button>
                  ))}
                </div>
              )}

              {/* INPUT BAR */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-[#111] border-t border-white/10 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={
                    currentUser?.role === "guest"
                      ? "Ask property owner about room availability, Ksh pricing, or viewing..."
                      : "Reply to student resident..."
                  }
                  className="flex-1 px-3 py-2.5 rounded-sm bg-[#1a1a1a] text-xs font-sans text-white border border-white/10 placeholder-[#666] outline-none focus:border-[#c5a059] transition"
                />
                <button
                  type="submit"
                  disabled={!inputMsg.trim()}
                  className="px-4 py-2.5 rounded-sm bg-[#c5a059] hover:brightness-110 disabled:opacity-40 text-black font-mono text-xs uppercase font-bold transition flex items-center gap-1.5"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5 text-black" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <MessageSquare className="w-12 h-12 text-[#444]" />
              <h3 className="font-serif text-lg text-white font-bold">Select a Conversation</h3>
              <p className="font-sans text-xs text-[#888] max-w-sm">
                Choose a conversation from the sidebar or click "Message Property Owner" on any student hostel detail page.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
