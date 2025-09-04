/* import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyARi1x2qtniVLlK2gfoLqapYHbmGEXgc0s",
  authDomain: "global-tech-portfolio-d6fa9.firebaseapp.com",
  projectId: "global-tech-portfolio-d6fa9",
  storageBucket: "global-tech-portfolio-d6fa9.firebasestorage.app",
  messagingSenderId: "713058661946",
  appId: "1:713058661946:web:2215b57065aac516476703",
  measurementId: "G-ZW69EV8TF0"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, analytics }; */