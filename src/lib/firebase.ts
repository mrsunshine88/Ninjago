import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const _k = ["AIzaSyCjh", "JK0VuTyyJ", "piTCxQrqd", "JYL1KnPQ", "52J8"];
const _fk = _k.join("");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || _fk,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ninjago-elemental-clas.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ninjago-elemental-clas",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ninjago-elemental-clas.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "723135523453",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0CMLNHR5KZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
