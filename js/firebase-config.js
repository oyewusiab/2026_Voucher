/**
 * PAYABLE VOUCHER 2026 - Firebase Configuration
 * Required for Authentication and Storage
 */

const firebaseConfig = {
    apiKey: "AIzaSyB6XUL8SNKCxLbYJWT9fxwcPJlI7k0fXXI",
    authDomain: "fmcapv-2026.firebaseapp.com",
    projectId: "fmcapv-2026",
    storageBucket: "fmcapv-2026.firebasestorage.app",
    messagingSenderId: "628828973072",
    appId: "1:628828973072:web:97ec985553301905778295",
    measurementId: "G-MFX3PW545R"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);

// Globals for easier access
const FB_AUTH = firebase.auth();
const FB_STORAGE = firebase.storage();
const FB_DB = firebase.firestore();
const FB_ANALYTICS = firebase.analytics();

console.log("Firebase initialized successfully for fmcapv-2026");
