
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD3tc1EKESzh4ITdCbM3a5NSlZa4vDnVBY",
  authDomain: "soullink-96d4b.firebaseapp.com",
  projectId: "soullink-96d4b",
  storageBucket: "soullink-96d4b.firebasestorage.app",
  messagingSenderId: "321937432406",
  appId: "1:321937432406:web:e64265c245fa541e5380f7",
  measurementId: "G-TSRK0ZKFFC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
