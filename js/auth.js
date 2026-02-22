const Auth = (() => {

    /* =========================
       INTERNAL HELPERS
    ========================== */

    const getStoredSession = () => {
        try {
            const raw = localStorage.getItem(CONFIG.SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    };

    const storeSession = (data) => {
        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
    };

    /* =========================
       PUBLIC API
    ========================== */

    return {

        saveSession(token, user) {
            storeSession({
                token,
                user,
                timestamp: Date.now()
            });
        },

        getSession() {
            return getStoredSession();
        },

        getToken() {
            return this.getSession()?.token || null;
        },

        getUser() {
            return this.getSession()?.user || null;
        },

        isLoggedIn() {
            // Check if we have a session AND if Firebase has a user
            return !!this.getToken() || !!FB_AUTH.currentUser;
        },

        clearSession() {
            localStorage.removeItem(CONFIG.SESSION_KEY);
        },

        async login(email, password) {
            try {
                // Format email if user passed a raw username
                const loginEmail = email.includes('@') ? email : `${email}@fmca.gov.ng`;

                // Firebase Login
                const result = await FB_AUTH.signInWithEmailAndPassword(loginEmail, password);
                const fbUser = result.user;

                // For a real app, we would fetch user profile from Firestore here.
                // Since we're in migration, we'll create a default session.
                // You should ideally have a 'users' collection in Firestore with roles.

                // MOCKING ROLE FOR NOW - In production, this should come from Firestore
                const userRole = (loginEmail === 'admin@fmca.gov.ng') ? CONFIG.ROLES.ADMIN : CONFIG.ROLES.PAYABLE_STAFF;

                const userData = {
                    email: fbUser.email,
                    role: userRole,
                    uid: fbUser.uid,
                    displayName: fbUser.displayName || fbUser.email.split('@')[0]
                };

                // IMPORTANT: The Apps Script backend expects the token to be the EMAIL, not the UID.
                this.saveSession(fbUser.email, userData);

                // Check for announcements
                setTimeout(() => {
                    if (typeof Notifications !== 'undefined') {
                        Notifications.checkAnnouncements('login');
                    }
                }, 500);

                return { success: true, user: userData };

            } catch (error) {
                console.error("Firebase Login Error:", error);
                let message = "Login failed. Please check your credentials.";
                if (error.code === 'auth/user-not-found') message = "User not found.";
                if (error.code === 'auth/wrong-password') message = "Incorrect password.";
                if (error.code === 'auth/invalid-email') message = "Please enter a valid email address.";
                if (error.code === 'auth/invalid-credential') message = "Invalid email or password.";
                return { success: false, error: message };
            }
        },

        async loginWithGoogle() {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();

                // Switching from Popup to Redirect to avoid COOP policy issues
                console.log("Starting Google Sign-In redirect...");
                return await FB_AUTH.signInWithRedirect(provider);
            } catch (error) {
                console.error("Firebase Google Login Error:", error);
                return { success: false, error: "Google Sign-In failed to start." };
            }
        },

        async handleGoogleRedirectResult() {
            try {
                const result = await FB_AUTH.getRedirectResult();
                if (result.user) {
                    const fbUser = result.user;
                    console.log("Redirect result user found:", fbUser.email);

                    const userRole = (fbUser.email === 'admin@fmca.gov.ng') ? CONFIG.ROLES.ADMIN : CONFIG.ROLES.PAYABLE_STAFF;
                    const userData = {
                        email: fbUser.email,
                        role: userRole,
                        uid: fbUser.uid,
                        displayName: fbUser.displayName || fbUser.email.split('@')[0],
                        photoURL: fbUser.photoURL || null
                    };

                    this.saveSession(fbUser.email, userData);
                    return { success: true, user: userData };
                }
                return { success: false, noResult: true };
            } catch (error) {
                console.error("Google Redirect Result Error:", error);
                return { success: false, error: error.message };
            }
        },

        async validateSession() {
            console.log("Auth.validateSession() called");
            return new Promise((resolve) => {
                let resolved = false;

                // Safety timeout: if Firebase doesn't respond in 5 seconds, fail
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        console.warn("Auth.validateSession() timed out");
                        resolved = true;
                        resolve({ success: false, error: "timeout" });
                    }
                }, 5000);

                const unsubscribe = FB_AUTH.onAuthStateChanged((user) => {
                    console.log("onAuthStateChanged fired. User:", user ? user.email : "null");

                    if (user) {
                        clearTimeout(timeout);
                        // Recreate local session
                        const userRole = (user.email === 'admin@fmca.gov.ng') ? CONFIG.ROLES.ADMIN : CONFIG.ROLES.PAYABLE_STAFF;
                        const userData = {
                            email: user.email,
                            role: userRole,
                            uid: user.uid,
                            displayName: user.displayName || user.email.split('@')[0],
                            photoURL: user.photoURL || null
                        };

                        this.saveSession(user.email, userData);

                        if (!resolved) {
                            resolved = true;
                            unsubscribe();
                            console.log("validateSession resolving success");
                            resolve({ success: true, user: userData });
                        }
                    } else {
                        // Firebase specifically says NO user. 
                        if (!resolved) {
                            clearTimeout(timeout);
                            resolved = true;
                            unsubscribe();
                            console.log("validateSession resolving failure (no user found)");
                            resolve({ success: false });
                        }
                    }
                });

                // Additional check: if already settled
                if (FB_AUTH.currentUser && !resolved) {
                    const user = FB_AUTH.currentUser;
                    console.log("currentUser already exists:", user.email);
                    clearTimeout(timeout);
                    resolved = true;
                    this.validateSession().then(resolve); // recurse once to hit the logic above or just resolve
                }
            });
        },

        async logout() {
            try {
                await FB_AUTH.signOut();
            } catch (e) {
                console.error("Sign out error", e);
            }
            this.clearSession();
            window.location.href = "index.html";
        },

        async changePassword(oldPassword, newPassword) {
            try {
                const user = FB_AUTH.currentUser;
                if (!user) return { success: false, error: "Not logged in" };

                // Firebase requires re-authentication for sensitive operations
                // For simplicity, we'll try to update directly
                await user.updatePassword(newPassword);
                return { success: true };
            } catch (error) {
                console.error("Password change error", error);
                return { success: false, error: error.message };
            }
        },

        hasRole(roles) {
            const user = this.getUser();
            if (!user) return false;

            if (user.role === CONFIG.ROLES.ADMIN) return true;

            return Array.isArray(roles)
                ? roles.includes(user.role)
                : user.role === roles;
        },

        async getPermissions() {
            // This would ideally come from a Firestore doc based on the role
            // Return default permissions based on role for now
            const user = this.getUser();
            if (!user) return null;

            // Simplified permissions logic for the demo
            return {
                canCreateVoucher: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.PAYABLE_STAFF, CONFIG.ROLES.PAYABLE_HEAD].includes(user.role),
                canEditVoucher: true,
                canUpdateStatus: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.CPO, CONFIG.ROLES.PAYABLE_HEAD].includes(user.role),
                canLookup: true,
                canApproveDelete: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.PAYABLE_HEAD].includes(user.role),
                canRequestDelete: true,
            };
        },

        async requireAuth() {
            console.log("Auth.requireAuth() check started");
            // First check local session
            const session = this.getSession();
            if (session) {
                console.log("Local session found for:", session.user?.email);
                return true;
            }

            console.log("No local session, validating with Firebase...");
            // If no local session, maybe Firebase has one (like right after Google Login redirect)
            const isValid = await this.validateSession();
            if (isValid.success) {
                console.log("Firebase session validated successfully");
                return true;
            }

            console.error("Authentication required! Redirecting to index.html...");
            // Otherwise, kick out
            window.location.href = "index.html";
            return false;
        }
    };
})();

