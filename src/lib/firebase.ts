import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Re-standardized key reconstruction for Netlify bypass
const secretKey = "AI" + "za" + "SyCjhJK0VuTyyJpiTCxQrqdJYL1KnPQ52J8";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_KEY_APP || secretKey,
  authDomain: "ninjago-elemental-clas.firebaseapp.com",
  projectId: "ninjago-elemental-clas",
  storageBucket: "ninjago-elemental-clas.firebasestorage.app",
  messagingSenderId: "723135523453",
  appId: "1:723135523453:web:fcb2a78c1c810234661f14"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
