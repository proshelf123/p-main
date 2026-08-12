import { initializeApp } from "firebase/app";
// IMPORTANTE: Adicione o connectAuthEmulator aqui
import { getAuth } from "firebase/auth";
// IMPORTANTE: Adicione o connectFirestoreEmulator aqui
import { initializeFirestore } from "firebase/firestore";
// IMPORTANTE: Adicione o connectStorageEmulator aqui
import { getStorage } from "firebase/storage";
// IMPORTANTE: Adicione o connectFunctionsEmulator aqui
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

// 2. App Check
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== "SUA_SITE_KEY_AQUI") {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
} else if (import.meta.env.DEV) {
  console.warn(
    "[App Check] VITE_RECAPTCHA_SITE_KEY ausente — App Check desativado. " +
    "Defina a chave reCAPTCHA v3 no arquivo .env para ativar."
  );
}

export const auth = getAuth(app);

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

export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');