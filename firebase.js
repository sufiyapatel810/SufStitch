// ── IMPORT Firebase tools from internet ──
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"

import { getFirestore, collection,
         getDocs, addDoc, doc,
         setDoc, getDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"

import { getAuth,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"


// ── PASTE YOUR KEYS HERE ──
// (open your mykeys.txt and copy from there)
const firebaseConfig = {
  apiKey:            "AIzaSyBpfwNcpTF9ruv84jqz28oWg5zjnKMakmA",
  authDomain:        "sufstitch.firebaseapp.com",
  projectId:         "sufstitch",
  storageBucket:     "sufstitch.firebasestorage.app",
  messagingSenderId: "449411658716",
  appId:             "1:449411658716:web:003a7ba817f12bb5a1d519"
}


// ── START FIREBASE ──
const app  = initializeApp(firebaseConfig)
const db   = getFirestore(app)
const auth = getAuth(app)


// ── SHARE with other files ──
export { 
  db, 
  auth, 
  collection, 
  getDocs,
  addDoc,           // ← must be here
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp,  // ← must be here
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
}