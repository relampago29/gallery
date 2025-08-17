import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBOgUqJ9sgLocrNtL1jGYPst99WWQ0yBbo",
  authDomain: "vanfer-ab962.firebaseapp.com",
  projectId: "vanfer-ab962",
  storageBucket: "vanfer-ab962.appspot.com",
  messagingSenderId: "1087701926696",
  appId: "1:1087701926696:web:3cad294f2e76c2ab2b861d",
  measurementId: "G-Z4G32J6D2X"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };