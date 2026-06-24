import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD4EN941sdYO3uyTEhhj37mViV8t2Sgf8s",
  authDomain: "proshelf-8ecfd.firebaseapp.com",
  databaseURL: "https://proshelf-8ecfd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "proshelf-8ecfd",
  storageBucket: "proshelf-8ecfd.firebasestorage.app",
  messagingSenderId: "814026747108",
  appId: "1:814026747108:web:efe59342c77f8c020990f1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// initializeFirestore (em vez de getFirestore) permite ligar o long-polling
// automático, que evita que ad blockers / extensões de privacidade derrubem
// o canal de Write do Firestore (erro ERR_BLOCKED_BY_CLIENT).
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  'firestoreproshelf'
);

export const defaultDb = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  }
);

export const storage = getStorage(app);    // Storage (arquivos)
export const functions = getFunctions(app, 'us-central1');
