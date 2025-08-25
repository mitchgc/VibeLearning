// VibeLearning Side Panel Controller

console.log('VibeLearning sidepanel loading...');

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  title: string;
  instruction: string;
  intent: string;
  target: string;
  selector: string;
  position: string;
}

class SidePanelController {
  private currentWorkflow: Workflow | null = null;
  private currentStep: number = 0;
  private currentTab: any = null;
  private currentApp: any = null;
  private availableWorkflows: any[] = [];

  constructor() {
    this.init();
  }

  async init() {
    console.log('Initializing VibeLearning sidepanel...');
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sendResponse);
      return true;
    });

    // Set up button event listeners
    this.setupEventListeners();
    
    // Get current tab
    await this.getCurrentTab();
    
    // Detect application and load workflows
    await this.detectApplication();
    
    // Check for existing workflow
    await this.checkForActiveWorkflow();
    
    console.log('VibeLearning sidepanel initialized');
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      console.log('Current tab:', this.currentTab?.url);
    } catch (error) {
      console.error('Error getting current tab:', error);
    }
  }

  setupEventListeners() {
    const nextStepBtn = document.getElementById('next-step-btn');
    const backStepBtn = document.getElementById('back-step-btn');
    const exitTourBtn = document.getElementById('exit-tour-btn');
    const smartDetectBtn = document.getElementById('smart-detect-btn');

    if (nextStepBtn) {
      nextStepBtn.addEventListener('click', () => this.nextStep());
    }

    if (backStepBtn) {
      backStepBtn.addEventListener('click', () => this.previousStep());
    }

    if (exitTourBtn) {
      exitTourBtn.addEventListener('click', () => this.exitTour());
    }

    if (smartDetectBtn) {
      smartDetectBtn.addEventListener('click', () => this.smartDetection());
    }
  }

  handleMessage(request: any, sendResponse: any) {
    console.log('Sidepanel received message:', request.type, request);

    switch (request.type) {
      case 'START_WORKFLOW':
        this.startWorkflow(request.workflow);
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_STEP':
        this.updateStep(request.stepIndex);
        sendResponse({ success: true });
        break;
        
      case 'CLOSE_WORKFLOW':
        this.closeWorkflow();
        sendResponse({ success: true });
        break;
        
      case 'SMART_DETECT_PROGRESS':
        this.handleSmartDetectProgress(request.phase, request.message);
        sendResponse({ success: true });
        break;
        
      case 'SMART_DETECT_SUCCESS':
        this.handleSmartDetectSuccess(request.message, request.elementInfo);
        sendResponse({ success: true });
        break;
        
      case 'SMART_DETECT_FAILURE':
        this.handleSmartDetectFailure(request.message);
        sendResponse({ success: true });
        break;
        
      case 'SMART_DETECT_GUIDANCE':
        this.handleSmartDetectGuidance(request.guidance);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async detectApplication() {
    if (!this.currentTab || !this.currentTab.url) {
      this.showNoWorkflowState();
      return;
    }

    const url = this.currentTab.url;
    const supportedApps = [
      { pattern: /youtube\.com/, name: 'YouTube', id: 'youtube' },
      { pattern: /github\.com/, name: 'GitHub', id: 'github' },
      { pattern: /mail\.google\.com/, name: 'Gmail', id: 'gmail' }
    ];

    this.currentApp = supportedApps.find(app => app.pattern.test(url));

    if (this.currentApp) {
      console.log('Detected app:', this.currentApp.name);
      await this.loadWorkflows();
    } else {
      console.log('No supported app detected for:', url);
      this.showNoWorkflowState();
    }
  }

  async loadWorkflows() {
    try {
      console.log('Loading workflows for:', this.currentTab?.url);
      
      const response = await chrome.runtime.sendMessage({
        type: 'GET_WORKFLOWS',
        url: this.currentTab?.url || ''
      });

      console.log('Workflows response:', response);
      this.availableWorkflows = response?.workflows || [];
      
      if (this.availableWorkflows.length > 0) {
        this.showWorkflowSelection();
      } else {
        this.showNoWorkflowState();
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      this.availableWorkflows = [];
      this.showNoWorkflowState();
    }
  }

  async checkForActiveWorkflow() {
    // Check if there's an active workflow in storage
    try {
      const stored = await chrome.storage.local.get('activeWorkflow');
      if (stored.activeWorkflow) {
        this.startWorkflow(stored.activeWorkflow.workflow, stored.activeWorkflow.currentStep);
      } else if (this.availableWorkflows.length === 0) {
        this.showNoWorkflowState();
      }
      // If we have workflows but no active one, showWorkflowSelection will have been called
    } catch (error) {
      console.error('Error checking for active workflow:', error);
      this.showNoWorkflowState();
    }
  }

  startWorkflow(workflow: Workflow, step: number = 0) {
    console.log('Starting workflow in sidepanel:', workflow.name);
    
    this.currentWorkflow = workflow;
    this.currentStep = step;
    
    // Store active workflow
    chrome.storage.local.set({
      activeWorkflow: {
        workflow: workflow,
        currentStep: step
      }
    });
    
    this.showWorkflowState();
    this.updateCurrentStep();
  }

  showWorkflowSelection() {
    const loadingState = document.getElementById('loading-state');
    const workflowSelectionState = document.getElementById('workflow-selection-state');
    const noWorkflowState = document.getElementById('no-workflow-state');
    const workflowState = document.getElementById('workflow-state');
    const workflowNameEl = document.getElementById('workflow-name');

    if (loadingState) loadingState.style.display = 'none';
    if (workflowSelectionState) workflowSelectionState.style.display = 'flex';
    if (noWorkflowState) noWorkflowState.style.display = 'none';
    if (workflowState) workflowState.style.display = 'none';
    
    if (workflowNameEl) {
      workflowNameEl.textContent = 'VibeLearning';
    }

    this.updateAppInfo();
    this.renderWorkflows();
  }

  showWorkflowState() {
    const loadingState = document.getElementById('loading-state');
    const workflowSelectionState = document.getElementById('workflow-selection-state');
    const noWorkflowState = document.getElementById('no-workflow-state');
    const workflowState = document.getElementById('workflow-state');
    const workflowNameEl = document.getElementById('workflow-name');

    if (loadingState) loadingState.style.display = 'none';
    if (workflowSelectionState) workflowSelectionState.style.display = 'none';
    if (noWorkflowState) noWorkflowState.style.display = 'none';
    if (workflowState) workflowState.style.display = 'flex';
    
    if (workflowNameEl && this.currentWorkflow) {
      workflowNameEl.textContent = this.currentWorkflow.name;
    }
  }

  showNoWorkflowState() {
    const loadingState = document.getElementById('loading-state');
    const workflowSelectionState = document.getElementById('workflow-selection-state');
    const noWorkflowState = document.getElementById('no-workflow-state');
    const workflowState = document.getElementById('workflow-state');
    const workflowNameEl = document.getElementById('workflow-name');

    if (loadingState) loadingState.style.display = 'none';
    if (workflowSelectionState) workflowSelectionState.style.display = 'none';
    if (noWorkflowState) noWorkflowState.style.display = 'block';
    if (workflowState) workflowState.style.display = 'none';
    
    if (workflowNameEl) {
      workflowNameEl.textContent = 'VibeLearning';
    }
  }

  updateAppInfo() {
    const appNameEl = document.getElementById('app-name');
    const appBadgeEl = document.getElementById('app-badge');

    if (appNameEl && this.currentApp) {
      appNameEl.textContent = this.currentApp.name;
    }

    if (appBadgeEl) {
      appBadgeEl.textContent = 'Detected';
    }
  }

  renderWorkflows() {
    const container = document.getElementById('workflow-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (this.availableWorkflows.length === 0) {
      container.innerHTML = '<p class="loading-workflows">No workflows available for this application.</p>';
      return;
    }

    console.log('Rendering workflows:', this.availableWorkflows);

    this.availableWorkflows.forEach(workflow => {
      const item = document.createElement('div');
      item.className = 'workflow-item';
      item.innerHTML = `
        <div class="workflow-item-header">
          <span class="workflow-name">${workflow.name}</span>
          <span class="workflow-difficulty ${workflow.difficulty}">${workflow.difficulty}</span>
        </div>
        <span class="workflow-time">~${this.getEstimatedTime(workflow)}</span>
      `;
      
      item.addEventListener('click', () => this.selectWorkflow(workflow));
      container.appendChild(item);
    });
  }

  getEstimatedTime(workflow: any): string {
    const times: Record<string, string> = {
      easy: '2 min',
      medium: '5 min',
      hard: '10 min'
    };
    return times[workflow.difficulty] || '5 min';
  }

  async selectWorkflow(workflow: any) {
    console.log('Selected workflow:', workflow.id);
    
    try {
      // Send START_WORKFLOW message to background
      await chrome.runtime.sendMessage({
        type: 'START_WORKFLOW',
        workflowId: workflow.id
      });
    } catch (error) {
      console.error('Failed to start workflow:', error);
    }
  }

  updateCurrentStep() {
    if (!this.currentWorkflow || this.currentStep >= this.currentWorkflow.steps.length) {
      this.completeWorkflow();
      return;
    }

    const step = this.currentWorkflow.steps[this.currentStep];
    
    // Update UI elements
    const stepTitle = document.getElementById('step-title');
    const stepCounter = document.getElementById('step-counter');
    const stepInstruction = document.getElementById('step-instruction');
    const nextStepBtn = document.getElementById('next-step-btn') as HTMLButtonElement;
    const backStepBtn = document.getElementById('back-step-btn') as HTMLButtonElement;
    
    if (stepTitle) stepTitle.textContent = step.title;
    if (stepCounter) stepCounter.textContent = `Step ${this.currentStep + 1}/${this.currentWorkflow.steps.length}`;
    if (stepInstruction) {
      stepInstruction.textContent = step.instruction;
    }
    
    if (nextStepBtn) {
      const isLastStep = this.currentStep === this.currentWorkflow.steps.length - 1;
      nextStepBtn.textContent = isLastStep ? 'Finish' : 'Next Step';
    }

    // Show/hide back button
    if (backStepBtn) {
      if (this.currentStep > 0) {
        backStepBtn.style.display = 'block';
      } else {
        backStepBtn.style.display = 'none';
      }
    }

    // Show loading state while trying to find element
    this.showElementSearching(step);
    
    // Try to highlight element on the page
    this.highlightElementWithFeedback(step);
    
    // Update storage
    chrome.storage.local.set({
      activeWorkflow: {
        workflow: this.currentWorkflow,
        currentStep: this.currentStep
      }
    });
  }

  showElementSearching(step: WorkflowStep) {
    const elementWarning = document.getElementById('element-warning');
    if (elementWarning) {
      elementWarning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="loading-spinner" style="
            width: 16px; height: 16px; border: 2px solid #e0e0e0; 
            border-top: 2px solid #4CAF50; border-radius: 50%; 
            animation: spin 1s linear infinite;
          "></div>
          <span>🔍 Searching for element...</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          Looking for: <code>${step.selector}</code>
        </div>
      `;
      elementWarning.style.display = 'block';
    }
  }

  async highlightElementWithFeedback(step: WorkflowStep) {
    if (!this.currentTab) return;
    
    try {
      // Send message to content script to highlight element
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'HIGHLIGHT_ELEMENT',
        selector: step.selector,
        step: step
      });
      
      console.log('Highlight element response:', response);
      
      // Check if element was actually found
      if (response && response.elementFound) {
        // Element found successfully - hide the warning after showing success briefly
        setTimeout(() => {
          const elementWarning = document.getElementById('element-warning');
          if (elementWarning) {
            elementWarning.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #4CAF50;">✅ Element found and highlighted!</span>
              </div>
            `;
            elementWarning.style.backgroundColor = '#e8f5e9';
            elementWarning.style.color = '#2e7d32';
          }
        }, 800);
        
        // Hide completely after 2 seconds
        setTimeout(() => {
          const elementWarning = document.getElementById('element-warning');
          if (elementWarning) elementWarning.style.display = 'none';
        }, 2500);
        
      } else {
        // Element not found - show smart detection option
        this.showElementNotFoundState(step);
      }
      
    } catch (error) {
      console.log('Could not communicate with content script:', error);
      // Communication failed - also show smart detection option
      this.showElementNotFoundState(step);
    }
  }

  showElementNotFoundState(step: WorkflowStep) {
    // Show element not found state after the search period
    setTimeout(() => {
      const elementWarning = document.getElementById('element-warning');
      if (elementWarning) {
        elementWarning.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>⚠️ Element not found automatically</span>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: #666;">
            Target: <code>${step.selector}</code>
          </div>
          <div style="margin-top: 12px;">
            <button id="smart-detect-btn" class="smart-detect-btn" style="
              background: #2196F3; color: white; padding: 8px 12px; 
              border-radius: 4px; border: none; font-size: 12px; cursor: pointer;
              transition: all 0.2s;
            ">
              🧠 Try Smart Detection
            </button>
          </div>
        `;
        elementWarning.style.backgroundColor = '#fef3c7';
        elementWarning.style.color = '#92400e';
        elementWarning.style.display = 'block';
        
        // Add click listener for smart detection
        const smartDetectBtn = document.getElementById('smart-detect-btn');
        if (smartDetectBtn) {
          smartDetectBtn.addEventListener('click', () => this.smartDetectionWithFeedback());
        }
      }
    }, 1200); // Show the "not found" state after 1.2 seconds
  }

  nextStep() {
    if (!this.currentWorkflow) return;
    
    this.currentStep++;
    this.updateCurrentStep();
  }

  previousStep() {
    if (!this.currentWorkflow || this.currentStep <= 0) return;
    
    this.currentStep--;
    this.updateCurrentStep();
  }

  exitTour() {
    this.closeWorkflow();
  }

  async smartDetection() {
    // Legacy method - redirect to new method
    return this.smartDetectionWithFeedback();
  }

  async smartDetectionWithFeedback() {
    if (!this.currentWorkflow || !this.currentTab) return;
    
    const step = this.currentWorkflow.steps[this.currentStep];
    const elementWarning = document.getElementById('element-warning');
    
    // Phase 1: Show initial analysis
    if (elementWarning) {
      elementWarning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="loading-spinner" style="
            width: 16px; height: 16px; border: 2px solid #e0e0e0; 
            border-top: 2px solid #2196F3; border-radius: 50%; 
            animation: spin 1s linear infinite;
          "></div>
          <span>🧠 Analyzing page structure...</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          Phase 1: DOM Analysis
        </div>
      `;
      elementWarning.style.display = 'block';
    }
    
    // Phase 2: Accessibility tree analysis (after 1 second)
    setTimeout(() => {
      if (elementWarning) {
        elementWarning.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="loading-spinner" style="
              width: 16px; height: 16px; border: 2px solid #e0e0e0; 
              border-top: 2px solid #2196F3; border-radius: 50%; 
              animation: spin 1s linear infinite;
            "></div>
            <span>🔍 Checking accessibility labels...</span>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: #666;">
            Phase 2: Accessibility Analysis
          </div>
        `;
      }
    }, 1000);
    
    // Phase 3: Text content matching (after 2 seconds)
    setTimeout(() => {
      if (elementWarning) {
        elementWarning.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="loading-spinner" style="
              width: 16px; height: 16px; border: 2px solid #e0e0e0; 
              border-top: 2px solid #2196F3; border-radius: 50%; 
              animation: spin 1s linear infinite;
            "></div>
            <span>📝 Matching text content...</span>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: #666;">
            Phase 3: Text Content Analysis
          </div>
        `;
      }
    }, 2000);
    
    try {
      // Send the actual smart detection message after showing the phases
      setTimeout(async () => {
        try {
          // First ensure content script is loaded
          await this.ensureContentScript();
          
          const response = await chrome.tabs.sendMessage(this.currentTab.id, {
            type: 'SMART_DETECT',
            selector: step.selector,
            step: step
          });
          
          console.log('Smart detection attempted for:', step.selector);
          
          // The content script will handle the UI updates through its own feedback system
          
        } catch (error) {
          console.log('Smart detection failed:', error);
          
          // Show failure state with better error message
          if (elementWarning) {
            const errorMessage = this.getSmartDetectionErrorMessage(error);
            elementWarning.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>❌ Smart detection failed</span>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #666;">
                ${errorMessage}
              </div>
              <div style="margin-top: 12px;">
                <button onclick="location.reload()" style="
                  background: #f44336; color: white; padding: 8px 12px; 
                  border-radius: 4px; border: none; font-size: 12px; cursor: pointer;
                ">
                  Reload Page
                </button>
              </div>
            `;
          }
        }
      }, 3000);
      
    } catch (error) {
      console.log('Smart detection setup failed:', error);
    }
  }

  handleSmartDetectProgress(phase: string, message: string) {
    const elementWarning = document.getElementById('element-warning');
    if (elementWarning) {
      elementWarning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="loading-spinner" style="
            width: 16px; height: 16px; border: 2px solid #e0e0e0; 
            border-top: 2px solid #2196F3; border-radius: 50%; 
            animation: spin 1s linear infinite;
          "></div>
          <span>${message}</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          ${phase}
        </div>
      `;
      elementWarning.style.display = 'block';
    }
  }

  handleSmartDetectSuccess(message: string, elementInfo: any) {
    const elementWarning = document.getElementById('element-warning');
    if (elementWarning) {
      elementWarning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">✅</span>
          <span style="color: #4CAF50; font-weight: 500;">${message}</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          Found: <code>${elementInfo.tagName}</code> ${elementInfo.className ? `class="${elementInfo.className}"` : ''}
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #999; font-style: italic;">
          "${elementInfo.textContent}..."
        </div>
      `;
      elementWarning.style.backgroundColor = '#e8f5e9';
      elementWarning.style.color = '#2e7d32';
      elementWarning.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(() => {
        if (elementWarning) elementWarning.style.display = 'none';
      }, 3000);
    }
  }

  handleSmartDetectFailure(message: string) {
    const elementWarning = document.getElementById('element-warning');
    if (elementWarning) {
      elementWarning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${message}</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #666;">
          Try looking manually or check if you're on the correct page
        </div>
        <div style="margin-top: 12px;">
          <button onclick="this.closest('#element-warning').style.display='none'" style="
            background: #666; color: white; padding: 6px 10px; 
            border-radius: 4px; border: none; font-size: 11px; cursor: pointer;
          ">
            Dismiss
          </button>
        </div>
      `;
      elementWarning.style.backgroundColor = '#ffebee';
      elementWarning.style.color = '#c62828';
      elementWarning.style.display = 'block';
    }
  }

  handleSmartDetectGuidance(guidance: string) {
    const elementWarning = document.getElementById('element-warning');
    if (elementWarning) {
      elementWarning.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 16px;">🤖</span>
          <span style="color: #2196F3; font-weight: 500;">AI Guidance</span>
        </div>
        <div style="margin-bottom: 12px; line-height: 1.4; font-size: 13px;">
          ${guidance}
        </div>
        <div style="margin-top: 12px;">
          <button onclick="this.closest('#element-warning').style.display='none'" style="
            background: #2196F3; color: white; padding: 6px 10px; 
            border-radius: 4px; border: none; font-size: 11px; cursor: pointer;
          ">
            Got it
          </button>
        </div>
      `;
      elementWarning.style.backgroundColor = '#e3f2fd';
      elementWarning.style.color = '#1565c0';
      elementWarning.style.display = 'block';
    }
  }

  closeWorkflow() {
    this.currentWorkflow = null;
    this.currentStep = 0;
    
    // Clear storage
    chrome.storage.local.remove('activeWorkflow');
    
    // Clear highlights on page
    if (this.currentTab) {
      try {
        chrome.tabs.sendMessage(this.currentTab.id, {
          type: 'CLEAR_HIGHLIGHTS'
        });
      } catch (error) {
        console.log('Could not clear highlights:', error);
      }
    }
    
    // Go back to workflow selection if we have workflows
    if (this.availableWorkflows.length > 0) {
      this.showWorkflowSelection();
    } else {
      this.showNoWorkflowState();
    }
  }

  completeWorkflow() {
    if (!this.currentWorkflow) return;
    
    // Update title and counter
    const stepTitle = document.getElementById('step-title');
    const stepCounter = document.getElementById('step-counter');
    
    if (stepTitle) stepTitle.textContent = 'Complete!';
    if (stepCounter) stepCounter.textContent = 'Workflow finished';
    
    // Show completion message
    const stepInstruction = document.getElementById('step-instruction');
    const nextStepBtn = document.getElementById('next-step-btn') as HTMLButtonElement;
    const skipTourBtn = document.getElementById('skip-tour-btn') as HTMLButtonElement;
    
    if (stepInstruction) {
      stepInstruction.textContent = `You've successfully completed the "${this.currentWorkflow.name}" workflow! Try exploring other workflows or practice this one again to master it.`;
    }
    
    if (nextStepBtn) {
      nextStepBtn.textContent = 'Done';
      nextStepBtn.onclick = () => this.closeWorkflow();
    }
    
    // Hide back button on completion
    const backStepBtn = document.getElementById('back-step-btn') as HTMLButtonElement;
    if (backStepBtn) {
      backStepBtn.style.display = 'none';
    }
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      this.closeWorkflow();
    }, 5000);
  }

  async ensureContentScript() {
    try {
      // Try to ping the content script
      await chrome.tabs.sendMessage(this.currentTab.id, { type: 'PING' });
      console.log('Content script is loaded and ready');
    } catch (error) {
      console.log('Content script not responding, attempting injection...');
      
      try {
        // Inject content script
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          files: ['assets/content-main.ts-DvhctQT1.js']
        });
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify it's working
        await chrome.tabs.sendMessage(this.currentTab.id, { type: 'PING' });
        console.log('Content script injected successfully');
        
      } catch (injectionError) {
        throw new Error(`Content script injection failed: ${injectionError.message}`);
      }
    }
  }

  getSmartDetectionErrorMessage(error: any): string {
    const message = error?.message || error || 'Unknown error';
    
    if (message.includes('Receiving end does not exist')) {
      return 'Could not connect to page. The page may need to be refreshed.';
    } else if (message.includes('Cannot access')) {
      return 'Cannot access this page. Check if the extension has permission.';
    } else if (message.includes('injection failed')) {
      return 'Failed to load detection system. Try refreshing the page.';
    } else if (message.includes('Unsupported website')) {
      return 'This website is not currently supported for smart detection.';
    } else {
      return 'Detection system encountered an error. Try refreshing the page.';
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing sidepanel controller...');
  new SidePanelController();
});