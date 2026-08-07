// Firebase config — this is your public "web app" config (safe to be in
// front-end code / GitHub). It is NOT a secret key like a server API key.
// Security is enforced separately via Firestore/Storage security rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfqcMBLr8ZVdSpFTdgYjqiAObAJL1itd8",
  authDomain: "ts-web-53319.firebaseapp.com",
  projectId: "ts-web-53319",
  storageBucket: "ts-web-53319.firebasestorage.app",
  messagingSenderId: "562970159023",
  appId: "1:562970159023:web:80ab51402e55e74458f15a",
  measurementId: "G-GMXQDDWHH8"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
