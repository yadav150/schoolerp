// ============================================
// FIREBASE INITIALIZATION – Modular SDK v9+
// ============================================

import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
} from "firebase/auth";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    remove, 
    update, 
    get 
} from "firebase/database";

// Your Firebase configuration (from provided details)
const firebaseConfig = {
    apiKey: "AIzaSyBLX-DBrAZZgi7OGRW3-oeno0PJsZ9hzEg",          // <-- Replace with your actual API key
    authDomain: "its-me-ame.firebaseapp.com",
    projectId: "its-me-ame",
    storageBucket: "its-me-ame.firebasestorage.app",
    messagingSenderId: "832380884001",
    appId: "1:832380884001:web:0c9239588ceb8d8995bf60",
    measurementId: "G-L12EEJG7L9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Export everything needed across the application
export {
    app,
    auth,
    database,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    ref,
    set,
    push,
    onValue,
    remove,
    update,
    get
};
