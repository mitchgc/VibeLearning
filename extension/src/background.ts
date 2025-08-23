import browser from 'webextension-polyfill';

interface UserSettings {
  enabled: boolean;
  autoDetect: boolean;
  learningMode: string;
}

interface ActiveWorkflow {
  workflow: any;
  currentStep: number;
  startTime: number;
  tabId: number;
}

class BackgroundService {
  private activeWorkflows: Map<number, ActiveWorkflow> = new Map();
  private userSettings: UserSettings = {
    enabled: true,
    autoDetect: true,
    learningMode: 'adaptive'
  };

  constructor() {
    this.init();
  }

  async init() {
    await this.loadUserSettings();
    this.setupListeners();
    console.log('VibeLearning background service initialized');
  }

  async loadUserSettings(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get('settings');
      this.userSettings = stored.settings || {
        enabled: true,
        autoDetect: true,
        learningMode: 'adaptive'
      };
    } catch (error) {
      console.error('Failed to load user settings:', error);
      // Use defaults on error
    }
  }

  setupListeners(): void {
    // Register listeners synchronously at top level (MV3 best practice)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    chrome.action.onClicked.addListener(async (tab) => {
      // Open the side panel when extension icon is clicked
      await chrome.sidePanel.open({ windowId: tab.windowId });
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.checkForSupportedApp(tab);
      }
    });

    // Service worker lifecycle events
    chrome.runtime.onStartup.addListener(() => {
      console.log('VibeLearning service worker started');
    });

    chrome.runtime.onInstalled.addListener(() => {
      console.log('VibeLearning extension installed/updated');
    });
  }

  async handleMessage(request: any, sender: any, sendResponse: any): Promise<void> {
    try {
      switch (request.type) {
        case 'START_WORKFLOW':
          console.log('Received START_WORKFLOW message:', request.workflowId);
          let tab = sender.tab;
          
          // If message comes from popup (no tab context), get current active tab
          if (!tab) {
            console.log('No sender tab, getting current active tab');
            try {
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              tab = tabs[0];
              console.log('Got current active tab:', tab?.id, tab?.url);
            } catch (error) {
              console.error('Failed to get current active tab:', error);
              sendResponse({ error: 'Could not get current tab' });
              return;
            }
          }
          
          if (!tab) {
            sendResponse({ error: 'No tab available' });
            return;
          }
          
          const workflow = await this.startWorkflow(request.workflowId, tab);
          sendResponse({ success: true, workflow });
          break;

        case 'GET_ELEMENT':
          if (!sender.tab) {
            sendResponse({ error: 'No tab context available' });
            return;
          }
          const element = await this.findElement(request.intent, request.context, sender.tab);
          sendResponse({ success: true, element });
          break;

        case 'WORKFLOW_STEP_COMPLETE':
          await this.recordStepCompletion(request.workflowId, request.stepId, request.data);
          sendResponse({ success: true });
          break;

        case 'GET_WORKFLOWS':
          // For GET_WORKFLOWS, we can try to get URL from request or current active tab
          let url = request.url;
          if (!url && sender.tab?.url) {
            url = sender.tab.url;
          } else if (!url) {
            // Try to get current active tab
            try {
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              url = tabs[0]?.url || '';
            } catch (e) {
              url = '';
            }
          }
          const workflows = await this.getAvailableWorkflows(url);
          sendResponse({ workflows });
          break;

        case 'REPORT_ERROR':
          if (!sender.tab) {
            sendResponse({ error: 'No tab context available' });
            return;
          }
          await this.handleError(request.error, sender.tab);
          sendResponse({ success: true });
          break;

        case 'LEARN_ELEMENT':
          if (!sender.tab) {
            sendResponse({ error: 'No tab context available' });
            return;
          }
          await this.learnElementPattern(request.element, request.intent, sender.tab);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown request type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message || 'Unknown error occurred' });
    }
  }

  async startWorkflow(workflowId, tab) {
    console.log('Starting workflow:', workflowId, 'for tab:', tab.id);
    
    const workflow = await this.loadWorkflow(workflowId);
    console.log('Loaded workflow:', workflow);
    
    if (!workflow) {
      console.error('No workflow found for ID:', workflowId);
      throw new Error('Workflow not found');
    }
    
    this.activeWorkflows.set(tab.id, {
      workflow,
      currentStep: 0,
      startTime: Date.now(),
      tabId: tab.id
    });

    console.log('Sending workflow to side panel');
    
    try {
      // Send workflow to side panel (don't try to open it - it should already be open)
      await chrome.runtime.sendMessage({
        type: 'START_WORKFLOW',
        workflow: workflow
      });
      
      console.log('Workflow sent to side panel');
    } catch (error) {
      console.error('Failed to send workflow to side panel:', error);
      throw error;
    }

    return workflow;
  }

  async loadWorkflow(workflowId) {
    // Use local workflow definitions instead of fetching from server
    return this.getLocalWorkflow(workflowId);
  }

  async getLocalWorkflow(workflowId) {
    const workflows = {
      'create_playlist': {
        id: 'create_playlist',
        name: 'Create a Playlist',
        description: 'Learn how to create a new playlist on YouTube',
        steps: [
          {
            id: 'step1',
            title: 'Navigate to Library',
            instruction: 'Click on "Library" in the left sidebar to access your playlists.',
            intent: 'click',
            target: 'library_link',
            selector: 'a[href="/feed/library"]',
            position: 'right'
          },
          {
            id: 'step2', 
            title: 'Find Playlists Section',
            instruction: 'Look for the "Playlists" section in your library.',
            intent: 'highlight',
            target: 'playlists_section',
            selector: '#playlists',
            position: 'bottom'
          },
          {
            id: 'step3',
            title: 'Create New Playlist',
            instruction: 'Click "New playlist" or the "+" button to create a playlist.',
            intent: 'click',
            target: 'new_playlist_button',
            selector: 'button[aria-label="Create playlist"], ytd-button-renderer:has-text("New playlist")',
            position: 'bottom'
          },
          {
            id: 'step4',
            title: 'Enter Playlist Name',
            instruction: 'Enter a name for your new playlist in the text field.',
            intent: 'input',
            target: 'playlist_name_input',
            selector: 'input[placeholder*="playlist" i], input[placeholder*="name" i]',
            position: 'top'
          },
          {
            id: 'step5',
            title: 'Set Privacy',
            instruction: 'Choose whether your playlist should be public, unlisted, or private.',
            intent: 'click',
            target: 'privacy_dropdown',
            selector: 'tp-yt-paper-dropdown-menu',
            position: 'left'
          },
          {
            id: 'step6',
            title: 'Create Playlist',
            instruction: 'Click "Create" to finish creating your playlist.',
            intent: 'click',
            target: 'create_button',
            selector: 'button:has-text("Create"), ytd-button-renderer:has-text("Create")',
            position: 'bottom'
          }
        ]
      },
      'upload_video': {
        id: 'upload_video',
        name: 'Upload a Video',
        description: 'Learn how to upload a video to YouTube',
        steps: [
          {
            id: 'step1',
            title: 'Click Create Button',
            instruction: 'Click the "Create" button (camera icon) in the top right corner.',
            intent: 'click',
            target: 'create_button',
            selector: 'ytd-topbar-menu-button-renderer button[aria-label*="Create"]',
            position: 'bottom'
          },
          {
            id: 'step2',
            title: 'Select Upload Video',
            instruction: 'Click "Upload video" from the dropdown menu.',
            intent: 'click',
            target: 'upload_video_option',
            selector: 'tp-yt-paper-item:has-text("Upload video")',
            position: 'left'
          },
          {
            id: 'step3',
            title: 'Select Files',
            instruction: 'Click "SELECT FILES" to choose a video from your computer.',
            intent: 'click',
            target: 'select_files_button',
            selector: 'input[type="file"], button:has-text("SELECT FILES")',
            position: 'top'
          },
          {
            id: 'step4',
            title: 'Add Title',
            instruction: 'Enter a title for your video in the title field.',
            intent: 'input',
            target: 'video_title_input',
            selector: 'input[placeholder*="title" i], textarea[placeholder*="title" i]',
            position: 'right'
          },
          {
            id: 'step5',
            title: 'Add Description',
            instruction: 'Write a description for your video (optional but recommended).',
            intent: 'input',
            target: 'video_description',
            selector: 'textarea[placeholder*="description" i]',
            position: 'right'
          },
          {
            id: 'step6',
            title: 'Set Visibility',
            instruction: 'Choose whether your video should be public, unlisted, or private.',
            intent: 'click',
            target: 'visibility_dropdown',
            selector: 'tp-yt-paper-radio-button',
            position: 'left'
          },
          {
            id: 'step7',
            title: 'Publish Video',
            instruction: 'Click "PUBLISH" to upload your video to YouTube.',
            intent: 'click',
            target: 'publish_button',
            selector: 'button:has-text("PUBLISH")',
            position: 'bottom'
          }
        ]
      },
      'customize_channel': {
        id: 'customize_channel',
        name: 'Customize Your Channel',
        description: 'Learn how to customize your YouTube channel',
        steps: [
          {
            id: 'step1',
            title: 'Go to Your Channel',
            instruction: 'Click your profile picture and select "Your channel" from the menu.',
            intent: 'click',
            target: 'profile_menu',
            selector: 'button[aria-label*="Account menu"]',
            position: 'bottom'
          },
          {
            id: 'step2',
            title: 'Customize Channel',
            instruction: 'Click "Customize channel" to access channel settings.',
            intent: 'click',
            target: 'customize_button',
            selector: 'a[href*="customize"]:has-text("Customize")',
            position: 'bottom'
          },
          {
            id: 'step3',
            title: 'Upload Channel Art',
            instruction: 'Click on the camera icon to upload channel art/banner.',
            intent: 'click',
            target: 'upload_banner',
            selector: 'input[accept*="image"], button:has-text("Upload")',
            position: 'top'
          }
        ]
      },
      'enable_monetization': {
        id: 'enable_monetization',
        name: 'Enable Monetization',
        description: 'Learn how to enable monetization on your YouTube channel',
        steps: [
          {
            id: 'step1',
            title: 'Go to YouTube Studio',
            instruction: 'Click your profile picture and select "YouTube Studio".',
            intent: 'click',
            target: 'youtube_studio',
            selector: 'a[href*="studio"]:has-text("YouTube Studio")',
            position: 'bottom'
          },
          {
            id: 'step2',
            title: 'Access Monetization',
            instruction: 'In the left sidebar, click on "Monetization".',
            intent: 'click',
            target: 'monetization_menu',
            selector: 'a[href*="monetization"]',
            position: 'right'
          },
          {
            id: 'step3',
            title: 'Start Application',
            instruction: 'Click "Get started" to begin the monetization application process.',
            intent: 'click',
            target: 'get_started',
            selector: 'button:has-text("Get started")',
            position: 'bottom'
          }
        ]
      },
      'organize_inbox': {
        id: 'organize_inbox',
        name: 'Organize Your Inbox',
        description: 'Learn how to organize your Gmail inbox efficiently',
        steps: [
          {
            id: 'step1',
            title: 'Check Unread Emails',
            instruction: 'Look at your inbox and identify unread emails (bold text).',
            intent: 'highlight',
            target: 'unread_emails',
            selector: '.zA.zE:not(.yW)',
            position: 'right'
          },
          {
            id: 'step2',
            title: 'Create Labels',
            instruction: 'Click "Labels" in the left sidebar to create new labels for organizing.',
            intent: 'click',
            target: 'labels_menu',
            selector: 'a[href*="label"]',
            position: 'right'
          },
          {
            id: 'step3',
            title: 'Apply Labels',
            instruction: 'Select emails and click the labels icon to categorize them.',
            intent: 'click',
            target: 'label_button',
            selector: 'div[data-tooltip*="Label"]',
            position: 'bottom'
          },
          {
            id: 'step4',
            title: 'Archive Old Emails',
            instruction: 'Select old emails and click Archive to clean up your inbox.',
            intent: 'click',
            target: 'archive_button',
            selector: 'div[data-tooltip*="Archive"]',
            position: 'bottom'
          }
        ]
      },
      'create_filters': {
        id: 'create_filters',
        name: 'Create Email Filters',
        description: 'Learn how to create filters for automatic email organization',
        steps: [
          {
            id: 'step1',
            title: 'Open Settings',
            instruction: 'Click the gear icon in the top right and select "Settings".',
            intent: 'click',
            target: 'settings_gear',
            selector: 'button[aria-label*="Settings"]',
            position: 'bottom'
          },
          {
            id: 'step2',
            title: 'Go to Filters',
            instruction: 'Click on "Filters and Blocked Addresses" tab.',
            intent: 'click',
            target: 'filters_tab',
            selector: 'span:has-text("Filters and Blocked Addresses")',
            position: 'bottom'
          },
          {
            id: 'step3',
            title: 'Create New Filter',
            instruction: 'Click "Create a new filter" to set up automatic email rules.',
            intent: 'click',
            target: 'create_filter',
            selector: 'a:has-text("Create a new filter")',
            position: 'bottom'
          },
          {
            id: 'step4',
            title: 'Set Filter Criteria',
            instruction: 'Enter criteria like sender email or subject keywords.',
            intent: 'input',
            target: 'filter_from',
            selector: 'input[name="from"]',
            position: 'top'
          }
        ]
      },
      'setup_signature': {
        id: 'setup_signature',
        name: 'Setup Email Signature',
        description: 'Learn how to create and setup an email signature',
        steps: [
          {
            id: 'step1',
            title: 'Open Settings',
            instruction: 'Click the gear icon in the top right and select "Settings".',
            intent: 'click',
            target: 'settings_gear',
            selector: 'button[aria-label*="Settings"]',
            position: 'bottom'
          },
          {
            id: 'step2',
            title: 'Find Signature Section',
            instruction: 'Scroll down to find the "Signature" section in General settings.',
            intent: 'highlight',
            target: 'signature_section',
            selector: 'td:has-text("Signature")',
            position: 'right'
          },
          {
            id: 'step3',
            title: 'Create Signature',
            instruction: 'Click "Create new" to add a new email signature.',
            intent: 'click',
            target: 'create_signature',
            selector: 'div[role="button"]:has-text("Create new")',
            position: 'bottom'
          },
          {
            id: 'step4',
            title: 'Edit Signature',
            instruction: 'Type your signature text and format it as desired.',
            intent: 'input',
            target: 'signature_editor',
            selector: 'div[contenteditable="true"]',
            position: 'top'
          }
        ]
      }
    };

    return workflows[workflowId] || null;
  }

  async findElement(intent, context, tab) {
    try {
      const response = await fetch('http://localhost:3000/api/element-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          context,
          url: tab.url,
          companyId: await this.getCompanyId(tab.url)
        })
      });

      if (!response.ok) {
        return await this.fallbackElementFinder(intent, context, tab);
      }

      return response.json();
    } catch (error) {
      console.error('Element finder API error:', error);
      return await this.fallbackElementFinder(intent, context, tab);
    }
  }

  async fallbackElementFinder(intent, context, tab) {
    const result = await browser.tabs.sendMessage(tab.id, {
      type: 'FIND_ELEMENT_LOCAL',
      intent,
      context
    });
    return result;
  }

  async getCompanyId(url) {
    const domain = new URL(url).hostname;
    const stored = await browser.storage.local.get('companyId');
    return stored.companyId || domain;
  }

  async checkForSupportedApp(tab) {
    if (!tab.url) return;

    const supportedApps = [
      { pattern: /workday\.com/, name: 'Workday' },
      { pattern: /salesforce\.com/, name: 'Salesforce' },
      { pattern: /servicenow\.com/, name: 'ServiceNow' },
      { pattern: /concur\.com/, name: 'Concur' }
    ];

    const app = supportedApps.find(app => app.pattern.test(tab.url));
    
    if (app && this.userSettings.autoDetect) {
      await browser.action.setBadgeText({ text: '!', tabId: tab.id });
      await browser.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tab.id });
      
      await browser.tabs.sendMessage(tab.id, {
        type: 'APP_DETECTED',
        appName: app.name
      });
    }
  }

  async recordStepCompletion(workflowId, stepId, data) {
    const timestamp = Date.now();
    const record = {
      workflowId,
      stepId,
      timestamp,
      success: data.success,
      duration: data.duration,
      elementFound: data.elementFound
    };

    await browser.storage.local.get('analytics').then(stored => {
      const analytics = stored.analytics || [];
      analytics.push(record);
      return browser.storage.local.set({ analytics });
    });

    if (data.elementSelector) {
      await this.cacheElementSelector(workflowId, stepId, data.elementSelector);
    }
  }

  async cacheElementSelector(workflowId, stepId, selector) {
    const key = `selector_${workflowId}_${stepId}`;
    await browser.storage.local.set({ [key]: selector });
  }

  async learnElementPattern(element, intent, tab) {
    const pattern = {
      intent,
      selector: element.selector,
      text: element.text,
      attributes: element.attributes,
      url: tab.url,
      timestamp: Date.now()
    };

    await browser.storage.local.get('patterns').then(stored => {
      const patterns = stored.patterns || [];
      patterns.push(pattern);
      return browser.storage.local.set({ patterns });
    });

    try {
      await fetch('http://localhost:3000/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pattern)
      });
    } catch (error) {
      console.error('Failed to sync pattern:', error);
    }
  }

  async toggleExtension(tab) {
    this.userSettings.enabled = !this.userSettings.enabled;
    await browser.storage.local.set({ settings: this.userSettings });

    const badgeText = this.userSettings.enabled ? '' : 'OFF';
    await browser.action.setBadgeText({ text: badgeText, tabId: tab.id });

    await browser.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_EXTENSION',
      enabled: this.userSettings.enabled
    });
  }

  async handleError(error, tab) {
    console.error('Workflow error:', error);
    
    const errorLog = {
      error: error.message,
      stack: error.stack,
      url: tab.url,
      timestamp: Date.now()
    };

    await browser.storage.local.get('errors').then(stored => {
      const errors = stored.errors || [];
      errors.push(errorLog);
      return browser.storage.local.set({ errors: errors.slice(-100) });
    });
  }

  async getAvailableWorkflows(url) {
    console.log('Getting workflows for URL:', url);
    
    try {
      const domain = new URL(url).hostname;
      console.log('Domain:', domain);
      
      if (domain.includes('youtube.com')) {
        return [
          { id: 'create_playlist', name: 'Create a Playlist', difficulty: 'easy' },
          { id: 'upload_video', name: 'Upload a Video', difficulty: 'medium' },
          { id: 'customize_channel', name: 'Customize Your Channel', difficulty: 'medium' },
          { id: 'enable_monetization', name: 'Enable Monetization', difficulty: 'hard' }
        ];
      }

      if (domain.includes('github.com')) {
        return [
          { id: 'create_repository', name: 'Create New Repository', difficulty: 'easy' },
          { id: 'create_pull_request', name: 'Create Pull Request', difficulty: 'medium' },
          { id: 'setup_actions', name: 'Setup GitHub Actions', difficulty: 'hard' }
        ];
      }

      if (domain.includes('mail.google.com')) {
        return [
          { id: 'organize_inbox', name: 'Organize Your Inbox', difficulty: 'easy' },
          { id: 'create_filters', name: 'Create Email Filters', difficulty: 'medium' },
          { id: 'setup_signature', name: 'Setup Email Signature', difficulty: 'easy' }
        ];
      }
      
      if (domain.includes('workday.com')) {
        return [
          { id: 'expense_submission', name: 'Submit Expense Report', difficulty: 'medium' },
          { id: 'add_expense_items', name: 'Add Expense Items', difficulty: 'easy' },
          { id: 'attach_receipts', name: 'Attach Receipts', difficulty: 'easy' },
          { id: 'check_approval_status', name: 'Check Approval Status', difficulty: 'easy' },
          { id: 'recall_submission', name: 'Recall Submission', difficulty: 'medium' }
        ];
      }

      console.log('No workflows found for domain:', domain);
      return [];
    } catch (error) {
      console.error('Error parsing URL or getting workflows:', error);
      return [];
    }
  }
}

const backgroundService = new BackgroundService();