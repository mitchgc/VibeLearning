// VibeLearning Popup Controller

console.log('VibeLearning popup loading...');

interface Tab {
  id?: number;
  url?: string;
  title?: string;
}

interface App {
  pattern: RegExp;
  name: string;
  id: string;
}

interface Workflow {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime?: number;
}

class PopupController {
  private currentTab: Tab | null = null;
  private currentApp: App | null = null;
  private workflows: Workflow[] = [];
  private activeWorkflow: Workflow | null = null;

  constructor() {
    this.init();
  }

  async init() {
    try {
      await this.getCurrentTab();
      await this.detectApplication();
      await this.loadUserStats();
      this.setupEventListeners();
      console.log('Popup controller initialized');
    } catch (error) {
      console.error('Error initializing popup:', error);
    }
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      console.log('Current tab:', this.currentTab?.url);
      console.log('Full tab object:', this.currentTab);
    } catch (error) {
      console.error('Error getting current tab:', error);
    }
  }

  async detectApplication() {
    console.log('detectApplication called, currentTab:', this.currentTab);
    
    if (!this.currentTab || !this.currentTab.url) {
      console.log('No current tab or URL, showing no app detected');
      this.showNoAppDetected();
      return;
    }

    const url = this.currentTab.url;
    console.log('Checking URL:', url);
    
    const supportedApps = [
      { pattern: /youtube\.com/, name: 'YouTube', id: 'youtube' },
      { pattern: /github\.com/, name: 'GitHub', id: 'github' },
      { pattern: /mail\.google\.com/, name: 'Gmail', id: 'gmail' },
      { pattern: /google\.com/, name: 'Google', id: 'google' }
    ];

    this.currentApp = supportedApps.find(app => app.pattern.test(url));
    console.log('Found app:', this.currentApp);

    if (this.currentApp) {
      console.log('Detected app:', this.currentApp.name);
      await this.showAppDetected();
    } else {
      console.log('No supported app detected for:', url);
      this.showNoAppDetected();
    }
  }

  showNoAppDetected() {
    const noApp = document.getElementById('no-app-detected');
    const appDetected = document.getElementById('app-detected');
    const workflowActive = document.getElementById('workflow-active');
    
    if (noApp) noApp.classList.remove('hidden');
    if (appDetected) appDetected.classList.add('hidden');
    if (workflowActive) workflowActive.classList.add('hidden');
    
    this.updateStatus('No app detected', 'inactive');
  }

  async showAppDetected() {
    const noApp = document.getElementById('no-app-detected');
    const appDetected = document.getElementById('app-detected');
    const workflowActive = document.getElementById('workflow-active');
    
    if (noApp) noApp.classList.add('hidden');
    if (appDetected) appDetected.classList.remove('hidden');
    if (workflowActive) workflowActive.classList.add('hidden');
    
    const appNameEl = document.getElementById('app-name');
    if (appNameEl) appNameEl.textContent = this.currentApp.name;
    
    this.updateStatus(`${this.currentApp.name} ready`, 'active');
    
    await this.loadWorkflows();
  }

  async loadWorkflows() {
    try {
      console.log('Loading workflows...');
      
      // Retry logic for when background script isn't ready yet
      let response = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!response && attempts < maxAttempts) {
        try {
          response = await chrome.runtime.sendMessage({
            type: 'GET_WORKFLOWS',
            url: this.currentTab?.url || ''
          });
        } catch (error: any) {
          attempts++;
          console.log(`Attempt ${attempts} failed, retrying...`, error.message);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms before retry
          }
        }
      }

      console.log('Workflows response:', response);
      this.workflows = response?.workflows || [];
      this.renderWorkflows();
    } catch (error) {
      console.error('Failed to load workflows after retries:', error);
      this.workflows = [];
      this.renderWorkflows();
    }
  }

  renderWorkflows() {
    const container = document.getElementById('workflow-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (this.workflows.length === 0) {
      container.innerHTML = '<p class="message-box">No workflows available for this application.</p>';
      return;
    }

    console.log('Rendering workflows:', this.workflows);

    this.workflows.forEach(workflow => {
      const item = document.createElement('div');
      item.className = 'workflow-item';
      item.innerHTML = `
        <div class="workflow-item-header">
          <span class="workflow-name">${workflow.name}</span>
          <span class="workflow-difficulty ${workflow.difficulty}">${workflow.difficulty}</span>
        </div>
        <span class="workflow-time">~${this.getEstimatedTime(workflow)}</span>
      `;
      
      item.addEventListener('click', () => this.startWorkflow(workflow));
      container.appendChild(item);
    });
  }

  getEstimatedTime(workflow) {
    const times = {
      easy: '2 min',
      medium: '5 min',
      hard: '10 min'
    };
    return times[workflow.difficulty] || '5 min';
  }

  async startWorkflow(workflow) {
    this.activeWorkflow = workflow;
    console.log('Starting workflow:', workflow.id);
    
    try {
      await chrome.runtime.sendMessage({
        type: 'START_WORKFLOW',
        workflowId: workflow.id
      });

      this.showActiveWorkflow();
    } catch (error) {
      console.error('Failed to start workflow:', error);
    }
  }

  showActiveWorkflow() {
    const appDetected = document.getElementById('app-detected');
    const workflowActive = document.getElementById('workflow-active');
    
    if (appDetected) appDetected.classList.add('hidden');
    if (workflowActive) workflowActive.classList.remove('hidden');
    
    const workflowName = document.getElementById('active-workflow-name');
    if (workflowName) workflowName.textContent = this.activeWorkflow.name;
    
    this.updateProgress(1, 10);
    this.updateStatus('Workflow in progress', 'active');
  }

  updateProgress(current, total) {
    const percentage = (current / total) * 100;
    const progressFill = document.getElementById('progress-fill');
    const currentStep = document.getElementById('current-step');
    const totalSteps = document.getElementById('total-steps');
    
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (currentStep) currentStep.textContent = current;
    if (totalSteps) totalSteps.textContent = total;
  }

  updateStatus(text, state = 'active') {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (statusText) statusText.textContent = text;
    
    const colors = {
      active: '#4CAF50',
      inactive: '#ccc',
      warning: '#ff9800',
      error: '#f44336'
    };
    
    if (statusDot) statusDot.style.background = colors[state] || colors.active;
  }

  async loadUserStats() {
    try {
      const stored = await chrome.storage.local.get('userProgress');
      const progress = stored.userProgress || {
        completedWorkflows: 0,
        averageTime: 0
      };

      const completedEl = document.getElementById('workflows-completed');
      const timeSavedEl = document.getElementById('time-saved');
      
      if (completedEl) completedEl.textContent = progress.completedWorkflows;
      
      const timeSaved = Math.round(progress.completedWorkflows * 5);
      if (timeSavedEl) timeSavedEl.textContent = `${timeSaved}m`;
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  setupEventListeners() {
    // Toggle extension
    const toggle = document.getElementById('enabled-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        this.toggleExtension(e.target.checked);
      });
    }

    // Search workflow
    const searchBtn = document.getElementById('search-workflow');
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSearchPanel();
      });
    }

    // Record workflow
    const recordBtn = document.getElementById('record-workflow');
    if (recordBtn) {
      recordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startRecording();
      });
    }

    // Search input functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchWorkflows(e.target.value);
      });
    }

    // Footer links
    const helpLink = document.getElementById('help-link');
    const feedbackLink = document.getElementById('feedback-link');
    
    if (helpLink) {
      helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://vibelearning.com/help' });
      });
    }
    
    if (feedbackLink) {
      feedbackLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://vibelearning.com/feedback' });
      });
    }
  }

  async toggleExtension(enabled) {
    try {
      await chrome.storage.local.set({ 
        settings: { enabled } 
      });

      this.updateStatus(enabled ? 'Ready' : 'Disabled', enabled ? 'active' : 'inactive');
    } catch (error) {
      console.error('Error toggling extension:', error);
    }
  }

  toggleSearchPanel() {
    const panel = document.getElementById('search-panel');
    if (panel) {
      panel.classList.toggle('hidden');
      
      if (!panel.classList.contains('hidden')) {
        const input = document.getElementById('search-input');
        if (input) {
          setTimeout(() => input.focus(), 100);
        }
        this.renderSearchResults(this.workflows);
      }
    }
  }

  async searchWorkflows(query) {
    if (!query) {
      this.renderSearchResults(this.workflows);
      return;
    }

    const filtered = this.workflows.filter(workflow => 
      workflow.name.toLowerCase().includes(query.toLowerCase()) ||
      workflow.difficulty.toLowerCase().includes(query.toLowerCase())
    );
    
    this.renderSearchResults(filtered);
  }

  renderSearchResults(results) {
    const container = document.getElementById('search-results');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (results.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #999; padding: 16px;">No workflows found</p>';
      return;
    }

    results.forEach(workflow => {
      const item = document.createElement('div');
      item.className = 'workflow-item';
      item.innerHTML = `
        <div class="workflow-item-header">
          <span class="workflow-name">${workflow.name}</span>
          <span class="workflow-difficulty ${workflow.difficulty}">${workflow.difficulty}</span>
        </div>
        <span class="workflow-time">~${this.getEstimatedTime(workflow)}</span>
      `;
      item.addEventListener('click', () => {
        this.startWorkflow(workflow);
        this.toggleSearchPanel();
      });
      container.appendChild(item);
    });
  }

  async startRecording() {
    this.showNotification('Recording feature coming soon!', 'info');
    console.log('Starting workflow recording...');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'info' ? '#2196F3' : '#4CAF50'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 999999;
      font-size: 14px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing popup controller...');
  new PopupController();
});