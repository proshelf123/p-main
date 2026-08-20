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

// 2. Configura o App Check com suporte a ambiente de desenvolvimento (Vite)
// Removi a duplicata e deixei apenas a string com o seu token real
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

// LOG INVESTIGATIVO PARA PRODUÇÃO (Pode apagar depois que funcionar)
console.log("Status da Chave reCAPTCHA:", RECAPTCHA_SITE_KEY ? "Carregada! Começa com " + RECAPTCHA_SITE_KEY.substring(0, 5) : "ERRO: CHAVE VAZIA (Undefined)");

export let appCheck; 

if (RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== "SUA_SITE_KEY_AQUI") {
  appCheck = initializeAppCheck(app, 
    {
    
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
} else if (import.meta.env.DEV) {
  console.warn(
    "[App Check] VITE_RECAPTCHA_SITE_KEY ausente — App Check desativado. " +
    "Defina a chave reCAPTCHA v3 no arquivo .env para ativar."
  );
}

// 3. Inicializa os demais serviços
export const auth = getAuth(app);

export const db = initializeFirestore(
  app,
  { experimentalAutoDetectLongPolling: true },
  'firestoreproshelf'
);

export const defaultDb = initializeFirestore(
  app,
  { experimentalAutoDetectLongPolling: true }
);

export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');