export class UIOverlay {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.init();
  }

  init() {
    this.createContainer();
    this.injectStyles();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'vibe-ui-container';
    this.container.className = 'vibe-ui-container';
    document.body.appendChild(this.container);
  }

  injectStyles() {
    const styles = `
      .vibe-ui-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        pointer-events: none;
      }

      .vibe-notification {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        margin-bottom: 10px;
        max-width: 350px;
        pointer-events: auto;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .vibe-notification.removing {
        animation: slideOut 0.3s ease-in;
      }

      .vibe-notification-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .vibe-notification-content {
        flex: 1;
      }

      .vibe-notification-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #1a1a1a;
      }

      .vibe-notification-message {
        color: #666;
        font-size: 14px;
        line-height: 1.4;
      }

      .vibe-notification-action {
        margin-top: 8px;
      }

      .vibe-notification-button {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .vibe-notification-button:hover {
        background: #45a049;
      }

      .vibe-notification.success .vibe-notification-icon {
        color: #4CAF50;
      }

      .vibe-notification.warning .vibe-notification-icon {
        color: #ff9800;
      }

      .vibe-notification.error .vibe-notification-icon {
        color: #f44336;
      }

      .vibe-notification.info .vibe-notification-icon {
        color: #2196F3;
      }

      .vibe-workflow-list {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        padding: 20px;
        max-width: 400px;
        max-height: 500px;
        overflow-y: auto;
        pointer-events: auto;
      }

      .vibe-workflow-list-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #1a1a1a;
      }

      .vibe-workflow-item {
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .vibe-workflow-item:hover {
        background: #f5f5f5;
        border-color: #4CAF50;
      }

      .vibe-workflow-name {
        font-weight: 500;
        margin-bottom: 4px;
        color: #333;
      }

      .vibe-workflow-difficulty {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .vibe-workflow-difficulty.easy {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .vibe-workflow-difficulty.medium {
        background: #fff3e0;
        color: #ef6c00;
      }

      .vibe-workflow-difficulty.hard {
        background: #ffebee;
        color: #c62828;
      }

      .vibe-element-selector-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999998;
        cursor: crosshair;
      }

      .vibe-selector-prompt {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 999999;
      }

      .vibe-selector-prompt p {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #333;
      }

      .vibe-cancel-selector {
        background: #f44336;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .vibe-highlight {
        outline: 3px solid #4CAF50 !important;
        outline-offset: 2px;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
        }
      }

      .vibe-progress-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: #e0e0e0;
        z-index: 999997;
      }

      .vibe-progress-fill {
        height: 100%;
        background: #4CAF50;
        transition: width 0.3s ease;
      }

      .vibe-confirm-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        max-width: 400px;
      }

      .vibe-confirm-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: #1a1a1a;
      }

      .vibe-confirm-message {
        color: #666;
        margin-bottom: 20px;
        line-height: 1.5;
      }

      .vibe-confirm-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .vibe-confirm-button {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .vibe-confirm-button.primary {
        background: #4CAF50;
        color: white;
      }

      .vibe-confirm-button.primary:hover {
        background: #45a049;
      }

      .vibe-confirm-button.secondary {
        background: #f5f5f5;
        color: #666;
      }

      .vibe-confirm-button.secondary:hover {
        background: #e0e0e0;
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  showNotification(message, options = {}) {
    const notification = document.createElement('div');
    notification.className = `vibe-notification ${options.type || 'info'}`;
    
    const iconSvg = this.getIcon(options.type || 'info');
    
    notification.innerHTML = `
      <div class="vibe-notification-icon">${iconSvg}</div>
      <div class="vibe-notification-content">
        ${options.title ? `<div class="vibe-notification-title">${options.title}</div>` : ''}
        <div class="vibe-notification-message">${message}</div>
        ${options.action ? `
          <div class="vibe-notification-action">
            <button class="vibe-notification-button">${options.action.text}</button>
          </div>
        ` : ''}
      </div>
    `;

    if (options.action) {
      notification.querySelector('.vibe-notification-button').addEventListener('click', () => {
        options.action.callback();
        this.removeNotification(notification);
      });
    }

    this.container.appendChild(notification);
    this.notifications.push(notification);

    const duration = options.duration || 5000;
    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);

    return notification;
  }

  removeNotification(notification) {
    notification.classList.add('removing');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  showSuccess(message) {
    return this.showNotification(message, { type: 'success', title: 'Success' });
  }

  showWarning(message) {
    return this.showNotification(message, { type: 'warning', title: 'Warning' });
  }

  showError(message) {
    return this.showNotification(message, { type: 'error', title: 'Error' });
  }

  showInfo(message) {
    return this.showNotification(message, { type: 'info', title: 'Info' });
  }

  showWorkflowList(workflows, onSelect) {
    const list = document.createElement('div');
    list.className = 'vibe-workflow-list';
    
    list.innerHTML = `
      <div class="vibe-workflow-list-title">Available Workflows</div>
    `;

    workflows.forEach(workflow => {
      const item = document.createElement('div');
      item.className = 'vibe-workflow-item';
      item.innerHTML = `
        <div class="vibe-workflow-name">${workflow.name}</div>
        <span class="vibe-workflow-difficulty ${workflow.difficulty}">${workflow.difficulty}</span>
      `;
      
      item.addEventListener('click', () => {
        onSelect(workflow);
        this.container.removeChild(list);
      });
      
      list.appendChild(item);
    });

    this.container.appendChild(list);

    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!list.contains(e.target)) {
          if (list.parentNode) {
            this.container.removeChild(list);
          }
        }
      }, { once: true });
    }, 100);
  }

  showElementSelector(prompt, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'vibe-element-selector-overlay';
    
    const promptBox = document.createElement('div');
    promptBox.className = 'vibe-selector-prompt';
    promptBox.innerHTML = `
      <p>${prompt}</p>
      <button class="vibe-cancel-selector">Cancel</button>
    `;
    
    overlay.appendChild(promptBox);
    document.body.appendChild(overlay);

    let highlightedElement = null;

    const handleMouseMove = (e) => {
      if (highlightedElement) {
        highlightedElement.classList.remove('vibe-highlight');
      }
      
      if (!promptBox.contains(e.target)) {
        highlightedElement = e.target;
        highlightedElement.classList.add('vibe-highlight');
      }
    };

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (promptBox.contains(e.target)) {
        cleanup();
        callback(null);
      } else {
        cleanup();
        callback(e.target);
      }
    };

    const cleanup = () => {
      if (highlightedElement) {
        highlightedElement.classList.remove('vibe-highlight');
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      overlay.remove();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
  }

  showProgressBar(progress) {
    let bar = document.querySelector('.vibe-progress-bar');
    
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'vibe-progress-bar';
      bar.innerHTML = '<div class="vibe-progress-fill"></div>';
      document.body.appendChild(bar);
    }

    const fill = bar.querySelector('.vibe-progress-fill');
    fill.style.width = `${progress}%`;

    if (progress >= 100) {
      setTimeout(() => {
        if (bar.parentNode) {
          bar.remove();
        }
      }, 1000);
    }
  }

  async confirm(title, message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'vibe-confirm-dialog';
      dialog.innerHTML = `
        <div class="vibe-confirm-title">${title}</div>
        <div class="vibe-confirm-message">${message}</div>
        <div class="vibe-confirm-buttons">
          <button class="vibe-confirm-button secondary">Cancel</button>
          <button class="vibe-confirm-button primary">Confirm</button>
        </div>
      `;

      const backdrop = document.createElement('div');
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999998;
      `;

      document.body.appendChild(backdrop);
      document.body.appendChild(dialog);

      const cleanup = (result) => {
        dialog.remove();
        backdrop.remove();
        resolve(result);
      };

      dialog.querySelector('.secondary').addEventListener('click', () => cleanup(false));
      dialog.querySelector('.primary').addEventListener('click', () => cleanup(true));
    });
  }

  getIcon(type) {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
    };
    
    return icons[type] || icons.info;
  }

  cleanup() {
    this.notifications.forEach(notification => {
      if (notification.parentNode) {
        notification.remove();
      }
    });
    this.notifications = [];
    
    const elements = [
      '.vibe-workflow-list',
      '.vibe-element-selector-overlay',
      '.vibe-progress-bar',
      '.vibe-confirm-dialog'
    ];
    
    elements.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.remove();
    });
  }
}