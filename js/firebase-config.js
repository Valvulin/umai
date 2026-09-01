// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Reemplazá este objeto con los datos obtenidos en el Paso 3
const firebaseConfig = {
    apiKey: "AIzaSyATowak_Gttey5QhqTf86uK8SkVGt59P9s",
    authDomain: "umai-cc890.firebaseapp.com",
    projectId: "umai-cc890",
    storageBucket: "umai-cc890.firebasestorage.app",
    messagingSenderId: "270084683107",
    appId: "1:270084683107:web:142f8870cd4109812f8f56"
  };


// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);