import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, setDoc, deleteDoc, doc, query, where, updateDoc, onSnapshot } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, sendEmailVerification, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { Hostel, User, Booking, Conversation, ChatMessage } from "../types";

const firebaseConfig = {
  projectId: "gen-lang-client-0798338011",
  appId: "1:715318083855:web:7689e5ac352d319c897e7a",
  apiKey: "AIzaSyBt8oYrDGVSr_6rsaozjNOEmWnI8DAL9wA",
  authDomain: "gen-lang-client-0798338011.firebaseapp.com",
  storageBucket: "gen-lang-client-0798338011.firebasestorage.app",
  messagingSenderId: "715318083855",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const sendFirebaseAuthVerification = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      return { success: true, message: `Verification email dispatched via Firebase to ${email}. Please check your inbox and spam folder.` };
    }
    return { success: false, message: "No active Firebase session. Sign in with Google or Auth first." };
  } catch (err: any) {
    console.warn("Firebase email verification error:", err);
    return { success: false, message: err?.message || "Failed to send Firebase verification email." };
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || "Google Sign-In failed" };
  }
};

export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  "ai-studio-hostellog-90f61e39-fcad-4d24-8076-83259698eddb"
);

// Firestore helpers with graceful error handling and local caching
export const fetchHostels = async (): Promise<Hostel[]> => {
  try {
    const snapshot = await getDocs(collection(db, "hostels"));
    const data = snapshot.docs.map(d => d.data() as Hostel);
    if (data.length > 0) {
      try { localStorage.setItem("hostels_cache", JSON.stringify(data)); } catch {}
      return data;
    }
  } catch (err) {
    console.warn("Firestore fetchHostels unavailable, falling back to local storage", err);
  }
  try {
    const cached = localStorage.getItem("hostels_cache");
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const saveHostel = async (hostel: Hostel): Promise<void> => {
  try {
    await setDoc(doc(db, "hostels", hostel.id), hostel);
  } catch (err) {
    console.warn("Firestore saveHostel offline fallback", err);
  }
  try {
    const cached = localStorage.getItem("hostels_cache");
    const list: Hostel[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(h => h.id === hostel.id);
    if (idx >= 0) list[idx] = hostel;
    else list.push(hostel);
    localStorage.setItem("hostels_cache", JSON.stringify(list));
  } catch {}
};

export const removeHostel = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "hostels", id));
  } catch (err) {
    console.warn("Firestore removeHostel offline fallback", err);
  }
  try {
    const cached = localStorage.getItem("hostels_cache");
    if (cached) {
      const list: Hostel[] = JSON.parse(cached);
      localStorage.setItem("hostels_cache", JSON.stringify(list.filter(h => h.id !== id)));
    }
  } catch {}
};

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const data = snapshot.docs.map(d => d.data() as User);
    if (data.length > 0) {
      try { localStorage.setItem("users_cache", JSON.stringify(data)); } catch {}
      return data;
    }
  } catch (err) {
    console.warn("Firestore fetchUsers unavailable, falling back to local storage", err);
  }
  try {
    const cached = localStorage.getItem("users_cache");
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export const saveUser = async (user: User): Promise<void> => {
  try {
    await setDoc(doc(db, "users", user.id), user);
  } catch (err) {
    console.warn("Firestore saveUser offline fallback", err);
  }
  try {
    const cached = localStorage.getItem("users_cache");
    const list: User[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(u => u.id === user.id);
    if (idx >= 0) list[idx] = user;
    else list.push(user);
    localStorage.setItem("users_cache", JSON.stringify(list));
  } catch {}
};

export const fetchBookings = async (userId: string): Promise<Booking[]> => {
  try {
    const q = query(collection(db, "bookings"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as Booking);
  } catch (err) {
    console.warn("Firestore fetchBookings unavailable", err);
    return [];
  }
};

export const saveBooking = async (booking: Booking): Promise<void> => {
  try {
    await setDoc(doc(db, "bookings", booking.id), booking);
  } catch (err) {
    console.warn("Firestore saveBooking offline fallback", err);
  }
};

export const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    const snapshot = await getDocs(collection(db, "conversations"));
    const allConvs = snapshot.docs.map(d => d.data() as Conversation);
    return allConvs.filter(c => c.studentId === userId || c.hostId === userId);
  } catch (err) {
    console.warn("Firestore fetchConversations unavailable", err);
    return [];
  }
};

export const subscribeToConversations = (userId: string, callback: (convs: Conversation[]) => void) => {
  try {
    const q = query(collection(db, "conversations"));
    return onSnapshot(
      q,
      (snapshot) => {
        const allConvs = snapshot.docs.map(d => d.data() as Conversation);
        callback(allConvs.filter(c => c.studentId === userId || c.hostId === userId));
      },
      (err) => {
        console.warn("Firestore subscribeToConversations error, falling back gracefully", err);
        fetchConversations(userId).then(callback).catch(() => callback([]));
      }
    );
  } catch (err) {
    console.warn("Firestore subscribeToConversations catch block", err);
    fetchConversations(userId).then(callback).catch(() => callback([]));
    return () => {};
  }
};

export const saveConversation = async (conv: Conversation): Promise<void> => {
  try {
    await setDoc(doc(db, "conversations", conv.id), conv);
  } catch (err) {
    console.warn("Firestore saveConversation offline fallback", err);
  }
};

export const fetchMessages = async (convId: string): Promise<ChatMessage[]> => {
  try {
    const q = query(collection(db, "messages"), where("conversationId", "==", convId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ChatMessage).sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.warn("Firestore fetchMessages unavailable", err);
    return [];
  }
};

export const subscribeToMessages = (convId: string, callback: (msgs: ChatMessage[]) => void) => {
  try {
    const q = query(collection(db, "messages"), where("conversationId", "==", convId));
    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map(d => d.data() as ChatMessage).sort((a, b) => a.timestamp - b.timestamp);
        callback(msgs);
      },
      (err) => {
        console.warn("Firestore subscribeToMessages error, falling back gracefully", err);
        fetchMessages(convId).then(callback).catch(() => callback([]));
      }
    );
  } catch (err) {
    console.warn("Firestore subscribeToMessages catch block", err);
    fetchMessages(convId).then(callback).catch(() => callback([]));
    return () => {};
  }
};

export const saveMessage = async (msg: ChatMessage): Promise<void> => {
  try {
    await setDoc(doc(db, "messages", msg.id), msg);
  } catch (err) {
    console.warn("Firestore saveMessage offline fallback", err);
  }
};

