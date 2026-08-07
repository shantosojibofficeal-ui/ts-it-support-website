// Firebase config — public web app config (safe in front-end / GitHub)
// Security via Firestore security rules + Firebase App Check

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
export const db = getFirestore(app);
export const auth = getAuth(app);
