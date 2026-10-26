// utils.js
(function() {
  window.Utils = {
    showToast: function(message, type = 'success', duration = 3000) {
      const toastContainer = document.getElementById('toast-container') || this._createToastContainer();
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type} fade-in`;
      toast.innerHTML = `
        <div class="toast-content">
          <span>${message}</span>
        </div>
      `;
      
      toastContainer.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.replace('fade-in', 'fade-out');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    },

    _createToastContainer: function() {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
      return container;
    },

    showModal: function(contentHTML, options = {}) {
      return new Promise((resolve) => {
        this.hideModal(); // hide existing
        const modal = document.createElement('div');
        modal.id = 'dynamic-modal';
        modal.className = 'modal modal-overlay fade-in';
        modal.innerHTML = `
          <div class="modal-content scale-in" style="${options.width ? `max-width: ${options.width}` : ''}">
            <div class="modal-header">
              <h3>${options.title || 'Modal'}</h3>
              <button class="close-btn" id="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              ${contentHTML}
            </div>
            ${options.showFooter ? `
            <div class="modal-footer">
              <button class="btn btn-secondary" id="modal-cancel">${options.cancelText || 'Cancelar'}</button>
              <button class="btn btn-primary" id="modal-confirm">${options.confirmText || 'Aceptar'}</button>
            </div>` : ''}
          </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#modal-close').onclick = () => { this.hideModal(); resolve(false); };
        if (options.showFooter) {
          modal.querySelector('#modal-cancel').onclick = () => { this.hideModal(); resolve(false); };
          modal.querySelector('#modal-confirm').onclick = () => { 
            if(options.onConfirm) options.onConfirm();
            this.hideModal(); 
            resolve(true); 
          };
        }
      });
    },

    hideModal: function() {
      const modal = document.getElementById('dynamic-modal');
      if (modal) modal.remove();
    },

    confirmDialog: function(message) {
      return this.showModal(`<p>${message}</p>`, {
        title: 'Confirmación',
        showFooter: true
      });
    },

    formatDate: function(timestamp, format = 'DD/MM/YYYY') {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return format.replace('DD', d).replace('MM', m).replace('YYYY', y);
    },

    formatRelativeTime: function(timestamp) {
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
      const daysDifference = Math.round((date - new Date()) / (1000 * 60 * 60 * 24));
      return rtf.format(daysDifference, 'day');
    },

    debounce: function(fn, delay) {
      let timeoutId;
      return function(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fn.apply(this, args);
        }, delay);
      };
    },

    throttle: function(fn, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          fn.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    truncateText: function(text, maxLength) {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    generateId: function() {
      return Math.random().toString(36).substr(2, 9);
    },

    validateEmail: function(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    },

    validatePhone: function(phone) {
      const re = /^\+?[\d\s-]{7,15}$/;
      return re.test(String(phone));
    },

    sanitizeHTML: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    getInitials: function(name) {
      if (!name) return 'U';
      const names = name.split(' ');
      let initials = names[0].substring(0, 1).toUpperCase();
      if (names.length > 1) {
        initials += names[names.length - 1].substring(0, 1).toUpperCase();
      }
      return initials;
    },

    formatCurrency: function(amount) {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    },

    calculateDistance: function(lat1, lon1, lat2, lon2) {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },

    renderStarRating: function(rating, interactive = false) {
      let html = `<div class="star-rating ${interactive ? 'interactive' : ''}">`;
      for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= rating ? 'active' : ''}" data-value="${i}">★</span>`;
      }
      html += `</div>`;
      return html;
    },

    showLoading: function() {
      const loading = document.createElement('div');
      loading.id = 'full-page-loading';
      loading.className = 'modal-overlay';
      loading.innerHTML = `<div class="spinner" style="width: 50px; height: 50px; border: 5px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;
      document.body.appendChild(loading);
    },

    hideLoading: function() {
      const loading = document.getElementById('full-page-loading');
      if (loading) loading.remove();
    },

    copyToClipboard: function(text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('Copiado al portapapeles', 'success');
      }).catch(err => {
        this.showToast('Error al copiar', 'error');
      });
    },

    getQueryParam: function(name) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(name);
    },

    setPageTitle: function(title) {
      document.title = `${title} | TuOficioCol`;
    },

    animateCounter: function(element, target, duration = 1000) {
      let start = 0;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          element.textContent = target;
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(start);
        }
      }, 16);
    },

    lazyLoadImages: function() {
      const images = document.querySelectorAll('img[data-src]');
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            obs.unobserve(img);
          }
        });
      });
      images.forEach(img => observer.observe(img));
    },

    initTooltips: function() {
      const tooltips = document.querySelectorAll('[data-tooltip]');
      // Simplified tooltip implementation
      tooltips.forEach(el => {
        el.title = el.dataset.tooltip;
      });
    }
  };
})();
