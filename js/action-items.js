/**
 * Action Items module
 * - Safe global attach (window.ActionItems) to avoid redeclare
 * - Supports:
 *    - mini dashboard card (actionItemsMiniCard)
 *    - notifications action items card (actionItemsCard)
 *    - admin filters (actionItemsUnitFilter, actionItemsStatusFilter)
 *    - settings modal (actionItemsSettingsModal)
 *
 * Requires existing globals: Auth, API, Utils, CONFIG
 */

(function () {
  // Prevent redeclaration if script is loaded twice
  if (window.ActionItems) return;

  const ActionItems = {
    // ---------------- STATE ----------------
    items: [],
    count: 0,
    settings: null,

    RULES: [
      {
        key: "PAID_NO_CN",
        title: "Paid but not released (No Control Number)",
        description: "Voucher is PAID but has no Control Number / not released to CPO.",
      },
      {
        key: "UNPAID_NO_CN_30D",
        title: "Unpaid in Payable for over 30 days (No Control Number)",
        description: "Voucher is UNPAID, has no Control Number, and is older than 30 days.",
      },
      {
        key: "RELEASED_UNPAID_15D",
        title: "Released but still Unpaid after 15 days",
        description: "Voucher has Control Number (released) but status remains UNPAID after 15 days.",
      },
    ],

    UNITS: [
      { key: "PAYABLE", label: "Payable Unit" },
      { key: "CPO", label: "CPO Unit" },
    ],

    // ---------------- PERMISSIONS ----------------
    canConfigure() {
      const user = Auth.getUser();
      return user && [CONFIG.ROLES.ADMIN, CONFIG.ROLES.DDFA, CONFIG.ROLES.DFA].includes(user.role);
    },

    // ---------------- INIT ----------------
    async initAuto() {
      // If Auth user isn't ready yet, try again shortly (safe + non-invasive)
      const user = Auth.getUser();
      if (!user) {
        setTimeout(() => this.initAuto(), 150);
        return;
      }

      // Notifications page card
      if (document.getElementById("actionItemsCard")) {
        this.setupFiltersUI();
        this.applyPermissionsUI();
        await this.refreshFull();
      }

      // Dashboard mini card
      if (document.getElementById("actionItemsMiniCard")) {
        await this.refreshCount();
        this.renderMini();
      }
    },

    applyPermissionsUI() {
      const settingsBtn = document.getElementById("actionItemsSettingsBtn");
      if (settingsBtn) settingsBtn.style.display = this.canConfigure() ? "inline-block" : "none";
    },

    setupFiltersUI() {
      const unitFilter = document.getElementById("actionItemsUnitFilter");
      const statusFilter = document.getElementById("actionItemsStatusFilter");

      // Filters are optional: if not present, just skip
      if (!unitFilter || !statusFilter) return;

      if (this.canConfigure()) {
        unitFilter.style.display = "inline-block";
        statusFilter.style.display = "inline-block";

        // Prevent double-binding (in case initAuto reruns)
        unitFilter.onchange = () => this.refreshFull();
        statusFilter.onchange = () => this.refreshFull();
      } else {
        unitFilter.style.display = "none";
        statusFilter.style.display = "none";
      }
    },

    getFilterParams() {
      // Non-admin users: backend returns their unit + pending by default
      if (!this.canConfigure()) return null;

      const unit = document.getElementById("actionItemsUnitFilter")?.value || "ALL";
      const status = document.getElementById("actionItemsStatusFilter")?.value || "PENDING";
      return { unit, status };
    },

    // ---------------- API CALLS ----------------
    async refreshCount() {
      try {
        const params = this.getFilterParams();
        const r = await API.getActionItemCount(params); // params optional
        if (r && r.success) this.count = r.count || 0;
      } catch (e) {
        console.error("ActionItems.refreshCount error:", e);
      }
    },

    async refreshFull() {
      try {
        const params = this.getFilterParams();
        const r = await API.getActionItems(params); // params optional

        if (r && r.success) {
          this.items = r.items || [];
          this.count = typeof r.count === "number" ? r.count : this.items.length;
        } else {
          this.items = [];
          this.count = 0;
        }

        this.renderCard();
        this.renderMini(); // if mini exists on same page
      } catch (e) {
        console.error("ActionItems.refreshFull error:", e);
      }
    },

    // ---------------- RENDERING ----------------
    renderMini() {
      const card = document.getElementById("actionItemsMiniCard");
      const text = document.getElementById("actionItemsMiniText");
      if (!card || !text) return;

      if (!this.count) {
        card.style.display = "none";
        return;
      }

      card.style.display = "block";
      text.textContent = `${this.count} action item${this.count === 1 ? "" : "s"}`;
    },

    renderCard() {
      const card = document.getElementById("actionItemsCard");
      const countEl = document.getElementById("actionItemsCount");
      const listEl = document.getElementById("actionItemsList");
      if (!card || !countEl || !listEl) return;

      if (!this.count) {
        card.style.display = "none";
        return;
      }

      card.style.display = "block";
      countEl.textContent = this.count;

      listEl.innerHTML = this.items
        .map((item) => {
          // Map severity to your alert classes
          const severityClass =
            item.severity === "danger"
              ? "alert-error"
              : item.severity === "warning"
              ? "alert-warning"
              : "alert-info";

          const openVoucherLink =
            item.year === "2026" && item.rowIndex ? `vouchers.html?edit=${item.rowIndex}` : "vouchers.html";

          const itemStatus = item.itemStatus || item.status || "PENDING";

          return `
            <div class="alert ${severityClass}" style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; gap:10px;">
                <div>
                  <strong>${item.title || "Action Item"}</strong><br>
                  ${item.message || ""}<br>
                  <small>
                    Unit: <strong>${item.unit || "-"}</strong>
                    • Status: <strong>${itemStatus}</strong>
                    • Voucher: <strong>${item.voucherNumber || "-"}</strong>
                    ${item.controlNumber ? ` • CN: <strong>${item.controlNumber}</strong>` : ""}
                    • Payee: ${item.payee || "-"}
                    • Amount: ${Utils.formatCurrency(item.grossAmount || 0)}
                  </small>
                </div>
                <div style="white-space:nowrap;">
                  <span class="badge badge-warning">${item.unit || ""}</span>
                </div>
              </div>

              <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
                <a class="btn btn-sm btn-primary" href="${openVoucherLink}">
                  <i class="fas fa-folder-open"></i> Open Voucher
                </a>
              </div>
            </div>
          `;
        })
        .join("");
    },

    // ---------------- SETTINGS (ADMIN/DDFA/DFA) ----------------
    async openSettings() {
      if (!this.canConfigure()) return;

      const modal = document.getElementById("actionItemsSettingsModal");
      modal?.classList.add("active");

      const body = document.getElementById("actionItemsSettingsBody");
      if (body) body.innerHTML = "<p class='text-muted'>Loading settings...</p>";

      try {
        const r = await API.getActionItemSettings();
        if (!r || !r.success) {
          if (body) body.innerHTML = "<p class='text-danger'>Failed to load settings</p>";
          return;
        }

        this.settings = r.settings || {};
        this.renderSettingsUI();
      } catch (e) {
        console.error("ActionItems.openSettings error:", e);
        if (body) body.innerHTML = "<p class='text-danger'>Error loading settings</p>";
      }
    },

    closeSettings() {
      document.getElementById("actionItemsSettingsModal")?.classList.remove("active");
    },

    renderSettingsUI() {
      const body = document.getElementById("actionItemsSettingsBody");
      if (!body) return;

      const unitSettings = this.settings?.unit || {};

      let html = `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Rule</th>
                ${this.UNITS.map((u) => `<th>${u.label}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
      `;

      this.RULES.forEach((rule) => {
        html += `
          <tr>
            <td>
              <strong>${rule.title}</strong><br>
              <small class="text-muted">${rule.description}</small>
            </td>
            ${this.UNITS.map((u) => {
              const enabled = unitSettings?.[u.key]?.[rule.key];
              const checked = enabled === false ? "" : "checked"; // default ON if missing
              const id = `ai_${u.key}_${rule.key}`;
              return `<td style="text-align:center;"><input type="checkbox" id="${id}" ${checked}></td>`;
            }).join("")}
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      body.innerHTML = html;
    },

    async saveSettings() {
      if (!this.canConfigure()) return;

      const newSettings = { unit: {} };

      this.UNITS.forEach((u) => {
        newSettings.unit[u.key] = {};
        this.RULES.forEach((rule) => {
          const id = `ai_${u.key}_${rule.key}`;
          const el = document.getElementById(id);
          newSettings.unit[u.key][rule.key] = !!el?.checked;
        });
      });

      try {
        const r = await API.saveActionItemSettings(newSettings);
        if (r && r.success) {
          Utils.showToast(r.message || "Settings saved", "success");
          this.settings = newSettings;
          this.closeSettings();
          await this.refreshFull();
        } else {
          Utils.showToast(r?.error || "Failed to save settings", "error");
        }
      } catch (e) {
        console.error("ActionItems.saveSettings error:", e);
        Utils.showToast("Error saving settings", "error");
      }
    },
  };

  // expose
  window.ActionItems = ActionItems;

  // boot
  document.addEventListener("DOMContentLoaded", () => window.ActionItems.initAuto());
})();

