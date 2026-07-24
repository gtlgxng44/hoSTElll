import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc, query, where, updateDoc } from "firebase/firestore";
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
export const db = getFirestore(app, "ai-studio-hostellog-90f61e39-fcad-4d24-8076-83259698eddb");

// Firestore helpers
export const fetchHostels = async (): Promise<Hostel[]> => {
  const snapshot = await getDocs(collection(db, "hostels"));
  return snapshot.docs.map(d => d.data() as Hostel);
};

export const saveHostel = async (hostel: Hostel): Promise<void> => {
  await setDoc(doc(db, "hostels", hostel.id), hostel);
};

export const removeHostel = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "hostels", id));
};

export const fetchUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(d => d.data() as User);
};

export const saveUser = async (user: User): Promise<void> => {
  await setDoc(doc(db, "users", user.id), user);
};

export const fetchBookings = async (userId: string): Promise<Booking[]> => {
  const q = query(collection(db, "bookings"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as Booking);
};

export const saveBooking = async (booking: Booking): Promise<void> => {
  await setDoc(doc(db, "bookings", booking.id), booking);
};

export const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  // To avoid complex composite indexes for now, fetch all and filter client side
  const snapshot = await getDocs(collection(db, "conversations"));
  const allConvs = snapshot.docs.map(d => d.data() as Conversation);
  return allConvs.filter(c => c.studentId === userId || c.hostId === userId);
};

export const saveConversation = async (conv: Conversation): Promise<void> => {
  await setDoc(doc(db, "conversations", conv.id), conv);
};

export const fetchMessages = async (convId: string): Promise<ChatMessage[]> => {
  const q = query(collection(db, "messages"), where("conversationId", "==", convId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as ChatMessage).sort((a, b) => a.timestamp - b.timestamp);
};

export const saveMessage = async (msg: ChatMessage): Promise<void> => {
  await setDoc(doc(db, "messages", msg.id), msg);
};

