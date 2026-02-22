/**
 * ANNOUNCEMENTS MODULE - Separate from Notifications
 */

const AnnouncementHelper = {
    allUsers: [],
    
    /**
     * Initialize announcement features
     */
    async init() {
        console.log('AnnouncementHelper.init() called');
        
        const user = Auth.getUser();
        if (!user) {
            console.log('No user found');
            return;
        }
        
        console.log('Current user role:', user.role);
        
        // Show admin section if Admin (case-insensitive, config-driven)
        const adminRole = (window.CONFIG && CONFIG.ROLES && CONFIG.ROLES.ADMIN) ? CONFIG.ROLES.ADMIN : 'ADMIN';
        if (user.role && user.role.toUpperCase() === adminRole.toUpperCase()) {
            console.log('Admin detected - showing announcement section');
            const section = document.getElementById('adminAnnouncementSection');
            if (section) {
                section.style.display = 'block';
                await this.loadUsers();
                await this.loadHistory();
                this.setupHandlers();
            } else {
                console.error('adminAnnouncementSection not found in DOM');
            }
        } else {
            console.log('Not admin - role is:', user.role);
        }
    },
    
    /**
     * Setup event handlers
     */
    setupHandlers() {
        console.log('Setting up handlers');
        
        // Recipient type change
        const recipientAll = document.getElementById('recipientAll');
        const recipientSpecific = document.getElementById('recipientSpecific');
        const usersDropdown = document.getElementById('usersDropdown');
        
        if (recipientAll) {
            recipientAll.addEventListener('change', () => {
                if (usersDropdown) usersDropdown.classList.remove('active');
            });
        }
        
        if (recipientSpecific) {
            recipientSpecific.addEventListener('change', () => {
                if (usersDropdown) usersDropdown.classList.add('active');
            });
        }
        
        // Expiry time change
        document.querySelectorAll('[name="expiryTime"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const customDatetime = document.getElementById('customDatetime');
                if (customDatetime) {
                    if (e.target.value === 'custom') {
                        customDatetime.classList.add('active');
                    } else {
                        customDatetime.classList.remove('active');
                    }
                }
            });
        });
        
        console.log('Handlers setup complete');
    },
    
    /**
     * Load all users
     */
    async loadUsers() {
        console.log('Loading users...');
        try {
            const result = await API.getUsers();
            console.log('getUsers result:', result);
            
            if (result.success && result.users) {
                this.allUsers = result.users;
                this.renderUsers();
            } else {
                console.error('Failed to load users:', result.error);
            }
        } catch (e) {
            console.error('Load users error:', e);
        }
    },
    
    /**
     * Render user checkboxes
     */
    renderUsers() {
        const container = document.getElementById('usersList');
        if (!container) {
            console.error('usersList container not found');
            return;
        }
        
        let html = '';
        this.allUsers.forEach(user => {
            html += `
                <label class="user-item">
                    <input type="checkbox" name="selectedUsers" value="${user.username}">
                    <span>${user.name || user.username} <small style="color: #6c757d;">(${user.role})</small></span>
                </label>
            `;
        });
        
        container.innerHTML = html || '<p class="text-muted text-center">No users found</p>';
        console.log('Users rendered:', this.allUsers.length);
    },
    
    /**
     * Rich text commands
     */
    execCmd(command) {
        document.execCommand(command, false, null);
        document.getElementById('messageEditor')?.focus();
    },
    
    formatBlock(tag) {
        document.execCommand('formatBlock', false, `<${tag}>`);
        document.getElementById('messageEditor')?.focus();
    },
    
    /**
     * Send announcement
     */
    async sendAnnouncement() {
        console.log('sendAnnouncement() called');
        
        const title = document.getElementById('announcementTitle')?.value.trim();
        const message = document.getElementById('messageEditor')?.innerHTML.trim();
        
        console.log('Title:', title);
        console.log('Message:', message);
        
        // Validation
        if (!title) {
            alert('❌ Please enter a title');
            return;
        }
        
        if (!message || message === '<br>') {
            alert('❌ Please enter a message');
            return;
        }
        
        // Get locations
        const locations = [];
        document.querySelectorAll('[name="displayLocation"]:checked').forEach(el => {
            locations.push(el.value);
        });
        
        console.log('Locations:', locations);
        
        if (locations.length === 0) {
            alert('❌ Please select at least one display location');
            return;
        }
        
        // Get recipients
        const recipientType = document.querySelector('[name="recipientType"]:checked')?.value;
        let recipients = [];
        
        if (recipientType === 'all') {
            recipients = ['ALL'];
        } else {
            document.querySelectorAll('[name="selectedUsers"]:checked').forEach(el => {
                recipients.push(el.value);
            });
            
            if (recipients.length === 0) {
                alert('❌ Please select at least one user');
                return;
            }
        }
        
        console.log('Recipients:', recipients);
        
        // Calculate expiry
        const expiryValue = document.querySelector('[name="expiryTime"]:checked')?.value;
        let expiryDate;
        
        if (expiryValue === 'custom') {
            const customInput = document.getElementById('customExpiryInput')?.value;
            if (!customInput) {
                alert('❌ Please select a custom expiry date');
                return;
            }
            expiryDate = new Date(customInput);
        } else {
            expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + parseInt(expiryValue));
        }
        
        console.log('Expiry:', expiryDate);
        
        const allowDismiss = document.querySelector('[name="allowDismiss"]:checked')?.value === 'yes';
        
        const data = {
            id: 'ANN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            message: message,
            locations: locations,
            recipients: recipients,
            expiry: expiryDate.toISOString(),
            allowDismiss: allowDismiss,
            createdBy: Auth.getUser()?.username || 'Admin',
            createdAt: new Date().toISOString()
        };
        
        console.log('Sending data:', data);
        
        try {
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Sending announcement...', 'info');
            }
            
            const result = await API.sendAnnouncement(data);
            console.log('Send result:', result);
            
            if (result.success) {
                alert('✅ Announcement sent successfully!');
                this.clearForm();
                await this.loadHistory();
            } else {
                alert('❌ Error: ' + (result.error || 'Failed to send'));
            }
        } catch (e) {
            console.error('Send error:', e);
            alert('❌ Error sending announcement');
        }
    },
    
    /**
     * Clear form
     */
    clearForm() {
        console.log('Clearing form');
        
        document.getElementById('announcementTitle').value = '';
        document.getElementById('messageEditor').innerHTML = '';
        
        document.querySelectorAll('[name="displayLocation"]').forEach(el => el.checked = false);
        document.getElementById('recipientAll').checked = true;
        document.querySelectorAll('[name="selectedUsers"]').forEach(el => el.checked = false);
        document.getElementById('usersDropdown')?.classList.remove('active');
        
        const default24 = document.querySelector('[name="expiryTime"][value="24"]');
        if (default24) default24.checked = true;
        document.getElementById('customDatetime')?.classList.remove('active');
        
        const defaultYes = document.querySelector('[name="allowDismiss"][value="yes"]');
        if (defaultYes) defaultYes.checked = true;
    },
    
    /**
     * Load announcement history
     */
    async loadHistory() {
        console.log('Loading history...');
        const container = document.getElementById('announcementHistory');
        if (!container) return;
        
        try {
            const result = await API.getAnnouncements();
            console.log('History result:', result);
            
            if (!result.success || !result.announcements || result.announcements.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">No announcements sent yet</p>';
                return;
            }
            
            let html = '';
            result.announcements.forEach(ann => {
                const isExpired = new Date(ann.expiry) < new Date();
                const statusBadge = isExpired 
                    ? '<span class="status-badge badge-expired">❌ Expired</span>'
                    : '<span class="status-badge badge-active">✅ Active</span>';
                
                const locationBadges = (ann.locations || []).map(loc => 
                    `<span class="status-badge badge-location">${loc}</span>`
                ).join(' ');
                
                html += `
                    <div class="history-item">
                        <div class="history-header">
                            <div class="history-title">${ann.title}</div>
                            <button class="btn btn-sm btn-danger" onclick="AnnouncementHelper.deleteAnnouncement('${ann.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div style="margin-bottom: 8px;">
                            ${statusBadge}
                            ${locationBadges}
                        </div>
                        <div style="font-size: 12px; color: #6c757d;">
                            To: ${ann.recipients?.join(', ') || 'All'} • 
                            Expires: ${this.formatDate(ann.expiry)} • 
                            Created: ${this.formatDate(ann.createdAt)}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (e) {
            console.error('Load history error:', e);
            container.innerHTML = '<p class="text-danger text-center">Error loading history</p>';
        }
    },
    
    /**
     * Delete announcement
     */
    async deleteAnnouncement(id) {
        if (!confirm('Delete this announcement?')) return;
        
        try {
            const result = await API.deleteAnnouncement(id);
            
            if (result.success) {
                alert('✅ Deleted');
                await this.loadHistory();
            } else {
                alert('❌ Failed to delete');
            }
        } catch (e) {
            console.error('Delete error:', e);
            alert('❌ Error deleting');
        }
    },
    
    /**
     * Format date
     */
    formatDate(dateStr) {
        if (typeof Utils !== 'undefined' && Utils.formatDateTime) {
            return Utils.formatDateTime(dateStr);
        }
        return new Date(dateStr).toLocaleString();
    },
    
    /**
     * Check and show announcements for current page
     */
    async checkAndShow(page) {
        console.log('Checking announcements for page:', page);
        
        try {
            const user = Auth.getUser();
            if (!user) {
                console.log('No user logged in');
                return;
            }
            
            const username = user.username;
            console.log('Username:', username);
            
            const result = await API.getActiveAnnouncements(page, username);
            console.log('Active announcements result:', result);
            
            if (!result.success || !result.announcements || result.announcements.length === 0) {
                console.log('No active announcements');
                return;
            }
            
            // Get dismissed list
            const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '{}');
            console.log('Dismissed:', dismissed);
            
            // Find first non-dismissed
            const toShow = result.announcements.find(ann => {
                const key = `${ann.id}_${username}`;
                return !dismissed[key];
            });
            
            if (toShow) {
                console.log('Showing announcement:', toShow);
                this.showPopup(toShow, username);
            } else {
                console.log('All announcements dismissed');
            }
            
        } catch (e) {
            console.error('Check announcements error:', e);
        }
    },
    
    /**
     * Show popup
     */
    showPopup(announcement, username) {
        console.log('Showing popup for:', announcement.title);
        
        // Remove existing
        const existing = document.getElementById('announcementPopup');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'announcementPopup';
        overlay.className = 'announcement-popup-overlay';
        
        overlay.innerHTML = `
            <div class="announcement-popup-box">
                <div class="popup-header">
                    <div class="popup-icon">
                        <i class="fas fa-bullhorn"></i>
                    </div>
                    <h2 class="popup-title">${announcement.title}</h2>
                </div>
                <div class="popup-body">
                    ${announcement.message}
                </div>
                <div class="popup-footer">
                    ${announcement.allowDismiss ? `
                        <label class="dismiss-checkbox">
                            <input type="checkbox" id="doNotShowCheck">
                            <span>Don't show this again</span>
                        </label>
                    ` : '<div></div>'}
                    <button class="btn-dismiss" onclick="AnnouncementHelper.dismissPopup('${announcement.id}', '${username}')">
                        <i class="fas fa-check"></i> Got it!
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        console.log('Popup added to DOM');
    },
    
    /**
     * Dismiss popup
     */
    dismissPopup(announcementId, username) {
        console.log('Dismissing popup');
        
        const doNotShow = document.getElementById('doNotShowCheck')?.checked;
        
        if (doNotShow) {
            const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '{}');
            dismissed[`${announcementId}_${username}`] = true;
            localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
            console.log('Saved to dismissed list');
        }
        
        const popup = document.getElementById('announcementPopup');
        if (popup) popup.remove();
    }
};

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready - initializing AnnouncementHelper');
    setTimeout(() => {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            AnnouncementHelper.init();
        }
    }, 500);
});