/*
 * Compatibility Notifications module
 * Provides `Notifications` used across pages and proxies to AnnouncementHelper and API.
 */
const Notifications = {
    async checkAnnouncements(page) {
        if (window.AnnouncementHelper && typeof AnnouncementHelper.checkAndShow === 'function') {
            return AnnouncementHelper.checkAndShow(page);
        }
        return null;
    },

    async initBell() {
        try {
            if (!window.API) return;
            const res = await API.getNotifications(true);
            const bell = document.getElementById('notificationBell');
            if (bell && res && res.success && Array.isArray(res.notifications)) {
                const unread = res.notifications.length;
                let badge = bell.querySelector('.notif-count');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'notif-count';
                    badge.style.marginLeft = '8px';
                    bell.appendChild(badge);
                }
                badge.textContent = unread > 0 ? unread : '';
            }
        } catch (e) {
            console.error('Notifications.initBell error', e);
        }
    },

    async initPage() {
        // Ensure sidebar/menuToggle is initialized
        if (window.Components && typeof Components.initPage === 'function') {
            await Components.initPage('notifications');
        }
        // Used by notifications.html to initialize the page UI
        try {
            const container = document.getElementById('notificationsList');
            if (!container || !window.API) return;

            const res = await API.getNotifications(false);
            if (!res || !res.success) {
                container.innerHTML = '<p class="text-muted text-center">No notifications found</p>';
                return;
            }

            const items = res.notifications || [];
            if (items.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">No notifications found</p>';
                return;
            }

            const html = items.map(n => {
                const date = new Date(n.createdAt || n.date || Date.now()).toLocaleString();
                return `
                    <div class="notification-item">
                        <div class="notification-title">${n.title || 'Untitled'}</div>
                        <div class="notification-body">${n.message || ''}</div>
                        <div class="notification-meta"><small>${date}</small></div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;
        } catch (e) {
            console.error('Notifications.initPage error', e);
        }
    },

    // Proxy rich-text / admin functions to AnnouncementHelper when available
    execCmd(cmd) {
        if (window.AnnouncementHelper && typeof AnnouncementHelper.execCmd === 'function') {
            return AnnouncementHelper.execCmd(cmd);
        }
        document.execCommand(cmd);
    },

    formatBlock(tag) {
        if (window.AnnouncementHelper && typeof AnnouncementHelper.formatBlock === 'function') {
            return AnnouncementHelper.formatBlock(tag);
        }
        document.execCommand('formatBlock', false, `<${tag}>`);
    },

    clearForm() {
        if (window.AnnouncementHelper && typeof AnnouncementHelper.clearForm === 'function') {
            return AnnouncementHelper.clearForm();
        }
    },

    sendAnnouncement() {
        if (window.AnnouncementHelper && typeof AnnouncementHelper.sendAnnouncement === 'function') {
            return AnnouncementHelper.sendAnnouncement();
        }
    }
};

// Expose as window for legacy code
window.Notifications = Notifications;
