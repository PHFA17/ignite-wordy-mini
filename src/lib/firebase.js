import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuracao publica do SDK Web — apenas o projeto Firebase Wordy Mini.
// Estes campos identificam o projeto; regras do Firestore/Auth protegem os dados.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC-0BmlYCJOEuCEOYMRU11qHmqgfJIv5m0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ignite-wordy-mini.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ignite-wordy-mini',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ignite-wordy-mini.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '569233923890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:569233923890:web:410303aa408254d4d3012b',
};

export const configured = true;
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
