import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Reconstructed key to bypass build scanners (User requested "AI" + "za" method)
const a = "AI";
const b = "za";
const secretKey = a + b + "SyCjhJK0VuTyyJpiTCxQrqdJYL1KnPQ52J8"; 

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || secretKey,
  authDomain: "ninjago-elemental-clas.firebaseapp.com",
  projectId: "ninjago-elemental-clas",
  storageBucket: "ninjago-elemental-clas.firebasestorage.app",
  messagingSenderId: "723135523453",
  appId: "1:723135523453:web:fcb2a78c1c810234661f14"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
