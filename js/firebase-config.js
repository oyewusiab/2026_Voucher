/**
 * PAYABLE VOUCHER 2026 - Firebase Configuration
 * Required for Authentication and Storage
 */

const firebaseConfig = {
    apiKey: "AIzaSyChOpulIbP58j6UU8_FzAAWPd7oZWGIRx4",
    authDomain: "voucher-acff6.firebaseapp.com",
    projectId: "voucher-acff6",
    storageBucket: "voucher-acff6.firebasestorage.app",
    messagingSenderId: "1061995667366",
    appId: "1:1061995667366:web:8392e0487e3d32e04d3967",
    measurementId: "G-TFMYTYZQPE"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);

// Globals for easier access
const FB_AUTH = firebase.auth();
const FB_STORAGE = firebase.storage();
const FB_DB = firebase.firestore();
const FB_ANALYTICS = firebase.analytics();

console.log("Firebase initialized successfully for voucher-acff6");
