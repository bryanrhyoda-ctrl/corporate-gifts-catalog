import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNUhJDS5omotKq2c9ueb0p6MRUmktSZB8",
  authDomain: "corporate-gifts-catalog.firebaseapp.com",
  projectId: "corporate-gifts-catalog",
  storageBucket: "corporate-gifts-catalog.firebasestorage.app",
  messagingSenderId: "363640826064",
  appId: "1:363640826064:web:bcf1ff57345bea316ed6d5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
