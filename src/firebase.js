import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyD4EN941sdYO3uyTEhhj37mViV8t2Sgf8s",
  authDomain: "proshelf-8ecfd.firebaseapp.com",
  databaseURL: "https://proshelf-8ecfd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "proshelf-8ecfd",
  storageBucket: "proshelf-8ecfd.firebasestorage.app",
  messagingSenderId: "814026747108",
  appId: "1:814026747108:web:efe59342c77f8c020990f1"
};

// 1. Inicializa o app primeiro
const app = initializeApp(firebaseConfig);

// 2. Debug token só em desenvolvimento
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// 3. App Check depois do app, antes de qualquer uso de Firestore/Auth/Functions
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("SUA_SITE_KEY_AQUI"),
  isTokenAutoRefreshEnabled: true,
});

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