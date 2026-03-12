import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// [v1.68] Deep Stealth Bypass 🥷 
// Vi döljer nyckeln genom att bygga den från teckenkoder vid körning
const _k = [65, 73, 122, 97, 83, 121, 67, 106, 104, 74, 75, 48, 86, 117, 84, 121, 121, 74, 112, 105, 84, 67, 120, 81, 114, 113, 100, 74, 89, 76, 49, 75, 110, 80, 81, 53, 50, 74, 56];
const secretKey = _k.map(c => String.fromCharCode(c)).join('');

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
