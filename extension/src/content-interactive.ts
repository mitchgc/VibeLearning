// VibeLearning Interactive Content Script
console.log('VibeLearning content script loaded');

class VibeLearningContent {
  private currentTour: any = null;
  private isEnabled: boolean = true;
  private currentWorkflow: any = null;
  private currentStep: number = 0;

  constructor() {
    this.init();
  }

  async init() {
    console.log('VibeLearning content script initialized on:', window.location.hostname);
    this.setupMessageListeners();
    this.injectStyles();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .vibe-highlight {
        outline: 3px solid #4CAF50 !important;
        outline-offset: 2px;
        animation: vibe-pulse 2s infinite;
        position: relative;
        z-index: 999998;
      }
      
      @keyframes vibe-pulse {
        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
      }

      .vibe-step-guide {
        position: fixed;
        top: 0;
        right: 0;
        width: 380px;
        height: 100vh;
        background: white;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border-left: 3px solid #4CAF50;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .vibe-sidebar-content {
        padding: 24px;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .vibe-page-resized {
        margin-right: 380px !important;
        transition: margin-right 0.3s ease;
      }

      .vibe-page-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 380px;
        bottom: 0;
        background: rgba(0, 0, 0, 0.05);
        z-index: 999998;
        pointer-events: none;
      }

      .vibe-sidebar-header {
        background: #f8f9fa;
        padding: 20px 24px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .vibe-workflow-title {
        font-weight: 600;
        color: #1a1a1a;
        font-size: 18px;
        margin: 0;
      }

      .vibe-close-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #666;
        padding: 4px;
        border-radius: 4px;
      }

      .vibe-close-btn:hover {
        background: #e0e0e0;
      }

      .vibe-step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }

      .vibe-step-title {
        font-weight: 600;
        color: #1a1a1a;
        font-size: 16px;
      }

      .vibe-step-counter {
        background: #4CAF50;
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
      }

      .vibe-step-instruction {
        font-size: 14px;
        color: #444;
        line-height: 1.5;
        margin-bottom: 24px;
        flex: 1;
      }

      .vibe-step-buttons {
        display: flex;
        gap: 12px;
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
      }

      .vibe-btn {
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .vibe-btn-primary {
        background: #4CAF50;
        color: white;
      }

      .vibe-btn-primary:hover {
        background: #45a049;
      }

      .vibe-btn-secondary {
        background: #f5f5f5;
        color: #666;
      }

      .vibe-btn-secondary:hover {
        background: #e0e0e0;
      }

      .vibe-element-not-found {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 13px;
        color: #856404;
      }
    `;
    document.head.appendChild(style);
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request.type, request);
      this.handleMessage(request, sendResponse);
      return true;
    });
  }

  async handleMessage(request: any, sendResponse: any) {
    switch (request.type) {
      case 'INIT_WORKFLOW':
        console.log('Initializing workflow:', request.workflow);
        await this.initializeWorkflow(request.workflow);
        sendResponse({ success: true });
        break;
        
      case 'START_WORKFLOW':
        console.log('Starting workflow:', request.workflowId);
        this.startWorkflowGuide(request.workflowId);
        sendResponse({ success: true });
        break;
        
      case 'HIGHLIGHT_ELEMENT':
        this.highlightElement(request.selector);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async initializeWorkflow(workflow: any) {
    console.log('Starting interactive workflow:', workflow.name);
    
    if (!workflow || !workflow.steps) {
      console.error('Invalid workflow:', workflow);
      return;
    }

    this.currentWorkflow = workflow;
    this.currentStep = 0;
    this.startInteractiveGuide();
  }

  startInteractiveGuide() {
    this.removeExistingGuide();
    this.showCurrentStep();
  }

  showCurrentStep() {
    if (!this.currentWorkflow || this.currentStep >= this.currentWorkflow.steps.length) {
      this.completeWorkflow();
      return;
    }

    const step = this.currentWorkflow.steps[this.currentStep];
    console.log('Showing step:', this.currentStep + 1, step);

    // Try to find and highlight the target element
    const element = this.findElement(step);
    
    // Create step guide UI
    this.createStepGuide(step, element);
    
    if (element) {
      this.highlightElement(element);
    }
  }

  findElement(step: any): Element | null {
    if (!step.selector) return null;

    // Try multiple selector strategies
    const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(element)) {
          return element;
        }
      } catch (error) {
        console.warn('Invalid selector:', selector, error);
      }
    }

    // Try some generic fallbacks for common YouTube elements
    if (window.location.hostname.includes('youtube.com')) {
      return this.findYouTubeElement(step);
    }

    return null;
  }

  findYouTubeElement(step: any): Element | null {
    const fallbacks: Record<string, string[]> = {
      'library_link': ['a[href="/feed/library"]', 'a[href*="library"]', 'ytd-guide-entry-renderer:has-text("Library")'],
      'create_button': ['ytd-topbar-menu-button-renderer button[aria-label*="Create"]', 'button[aria-label*="Create"]', '#create-icon'],
      'playlists_section': ['#playlists', '[id*="playlist"]', 'ytd-guide-section-renderer:has-text("Playlists")']
    };

    const targetFallbacks = fallbacks[step.target];
    if (targetFallbacks) {
      for (const selector of targetFallbacks) {
        try {
          const element = document.querySelector(selector);
          if (element && this.isElementVisible(element)) {
            return element;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
    }

    return null;
  }

  isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
  }

  createStepGuide(step: any, targetElement: Element | null) {
    // Resize the main page content to make room for sidebar
    this.resizePageContent();

    // Create optional overlay for visual effect
    const overlay = document.createElement('div');
    overlay.className = 'vibe-page-overlay';
    document.body.appendChild(overlay);

    // Create sidebar guide
    const guide = document.createElement('div');
    guide.className = 'vibe-step-guide';
    
    const elementFound = targetElement !== null;
    const stepNum = this.currentStep + 1;
    const totalSteps = this.currentWorkflow.steps.length;

    guide.innerHTML = `
      <div class="vibe-sidebar-header">
        <h2 class="vibe-workflow-title">${this.currentWorkflow.name}</h2>
        <button class="vibe-close-btn" onclick="window.vibeSkipTour()">✕</button>
      </div>
      
      <div class="vibe-sidebar-content">
        <div class="vibe-step-header">
          <div class="vibe-step-title">${step.title || step.instruction}</div>
          <div class="vibe-step-counter">Step ${stepNum} of ${totalSteps}</div>
        </div>
        
        ${!elementFound ? `
          <div class="vibe-element-not-found">
            ⚠️ Element not found automatically. Look for the item described below.
            <div style="margin-top: 12px;">
              <button class="vibe-btn vibe-btn-smart-detect" onclick="window.vibeSmartDetect()" style="background: #2196F3; color: white; padding: 8px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer;">
                🧠 Smart Detection
              </button>
            </div>
          </div>
        ` : ''}
        
        <div class="vibe-step-instruction">
          <strong>What to do:</strong><br>
          ${step.instruction}
          
          ${elementFound ? '<br><br><strong>👈 Look for the highlighted element</strong><br>The element you need to interact with is highlighted with a green outline.' : '<br><br><strong>💡 Tip:</strong><br>Look for the element described above and click on it when you find it.'}
          
          <br><br><strong>When ready:</strong><br>
          Click "${stepNum === totalSteps ? 'Finish' : 'Next Step'}" below to continue.
        </div>
        
        <div class="vibe-step-buttons">
          <button class="vibe-btn vibe-btn-primary" onclick="window.vibeNextStep()" style="flex: 1;">
            ${stepNum === totalSteps ? '🎉 Finish' : 'Next Step →'}
          </button>
          <button class="vibe-btn vibe-btn-secondary" onclick="window.vibeSkipTour()">
            Skip
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(guide);
  }

  resizePageContent() {
    // Find the main container elements that need to be resized
    const containers = [
      document.body,
      document.documentElement,
      document.querySelector('#page-manager'),
      document.querySelector('ytd-app'),
      document.querySelector('#content'),
      document.querySelector('.html5-video-player'),
      document.querySelector('#primary'),
      document.querySelector('#secondary')
    ].filter(el => el !== null);

    containers.forEach(container => {
      if (container && !container.classList.contains('vibe-page-resized')) {
        container.classList.add('vibe-page-resized');
      }
    });

    // For YouTube specifically, also resize the player and layout
    if (window.location.hostname.includes('youtube.com')) {
      this.resizeYouTubeLayout();
    }
  }

  resizeYouTubeLayout() {
    // YouTube-specific layout adjustments
    const ytdApp = document.querySelector('ytd-app');
    const masthead = document.querySelector('#masthead-container');
    const pageManager = document.querySelector('#page-manager');
    
    if (ytdApp) ytdApp.classList.add('vibe-page-resized');
    if (masthead) masthead.classList.add('vibe-page-resized');
    if (pageManager) pageManager.classList.add('vibe-page-resized');
  }

  removeExistingGuide() {
    const existing = document.querySelector('.vibe-step-guide');
    if (existing) existing.remove();

    const overlay = document.querySelector('.vibe-page-overlay');
    if (overlay) overlay.remove();
    
    // Restore page content to full width
    document.querySelectorAll('.vibe-page-resized').forEach(el => {
      el.classList.remove('vibe-page-resized');
    });
    
    // Remove highlights
    document.querySelectorAll('.vibe-highlight').forEach(el => {
      el.classList.remove('vibe-highlight');
    });
  }

  nextStep() {
    this.currentStep++;
    this.showCurrentStep();
  }

  skipTour() {
    this.removeExistingGuide();
    this.currentWorkflow = null;
    this.currentStep = 0;
  }

  completeWorkflow() {
    this.removeExistingGuide();
    
    // Create page overlay
    const overlay = document.createElement('div');
    overlay.className = 'vibe-page-overlay';
    document.body.appendChild(overlay);
    
    // Show completion message in sidebar
    const completion = document.createElement('div');
    completion.className = 'vibe-step-guide';
    completion.innerHTML = `
      <div class="vibe-sidebar-header">
        <h2 class="vibe-workflow-title">🎉 Workflow Complete!</h2>
        <button class="vibe-close-btn" onclick="window.vibeSkipTour()">✕</button>
      </div>
      
      <div class="vibe-sidebar-content">
        <div class="vibe-step-instruction">
          <strong>Congratulations!</strong><br><br>
          You've successfully completed the "<strong>${this.currentWorkflow.name}</strong>" workflow. 
          
          <br><br>You now know how to:
          <ul style="margin: 16px 0; padding-left: 20px;">
            ${this.currentWorkflow.steps.map((step: any) => `<li style="margin: 8px 0;">${step.instruction}</li>`).join('')}
          </ul>
          
          <br><strong>What's next?</strong><br>
          Try exploring other workflows or practice this one again to master it!
        </div>
        
        <div class="vibe-step-buttons">
          <button class="vibe-btn vibe-btn-primary" onclick="window.vibeSkipTour()" style="flex: 1;">
            🎯 Done
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(completion);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (completion.parentElement) {
        completion.remove();
      }
      if (overlay.parentElement) {
        overlay.remove();
      }
      // Restore page layout
      document.querySelectorAll('.vibe-page-resized').forEach(el => {
        el.classList.remove('vibe-page-resized');
      });
    }, 8000);
    
    this.currentWorkflow = null;
    this.currentStep = 0;
  }

  highlightElement(element: Element | string) {
    // Remove existing highlights
    document.querySelectorAll('.vibe-highlight').forEach(el => {
      el.classList.remove('vibe-highlight');
    });

    let targetElement: Element | null = null;
    
    if (typeof element === 'string') {
      targetElement = document.querySelector(element);
    } else {
      targetElement = element;
    }

    if (targetElement) {
      targetElement.classList.add('vibe-highlight');
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async smartDetect() {
    if (!this.currentWorkflow || this.currentStep >= this.currentWorkflow.steps.length) {
      return;
    }

    const step = this.currentWorkflow.steps[this.currentStep];
    console.log('Starting smart detection for step:', step);

    // Update button to show loading state
    this.updateSmartDetectButton('🔍 Analyzing...', true);

    try {
      // Strategy 1: Enhanced DOM analysis with accessibility tree approach
      const element = await this.analyzePageAccessibility(step);
      
      if (element) {
        console.log('Smart detection found element:', element);
        this.highlightElement(element);
        this.updateSmartDetectButton('✅ Found!', true);
        
        // Auto-advance after 2 seconds to show success
        setTimeout(() => {
          this.updateSmartDetectButton('🧠 Smart Detection', false);
        }, 2000);
        
        // Update the guide to show element was found
        this.refreshStepGuide(step, element);
        return;
      }

      // Strategy 2: Fallback to LLM-powered text analysis
      const textBasedElement = await this.findElementByTextAnalysis(step);
      if (textBasedElement) {
        console.log('Smart detection found element via text analysis:', textBasedElement);
        this.highlightElement(textBasedElement);
        this.updateSmartDetectButton('✅ Found!', true);
        setTimeout(() => {
          this.updateSmartDetectButton('🧠 Smart Detection', false);
        }, 2000);
        this.refreshStepGuide(step, textBasedElement);
        return;
      }

      // No element found
      console.log('Smart detection could not find element');
      this.updateSmartDetectButton('❌ Not found', true);
      setTimeout(() => {
        this.updateSmartDetectButton('🧠 Smart Detection', false);
      }, 3000);

    } catch (error) {
      console.error('Smart detection error:', error);
      this.updateSmartDetectButton('⚠️ Error', true);
      setTimeout(() => {
        this.updateSmartDetectButton('🧠 Smart Detection', false);
      }, 3000);
    }
  }

  updateSmartDetectButton(text: string, disabled: boolean) {
    const button = document.querySelector('.vibe-btn-smart-detect') as HTMLButtonElement;
    if (button) {
      button.textContent = text;
      button.disabled = disabled;
      button.style.opacity = disabled ? '0.7' : '1';
    }
  }

  async analyzePageAccessibility(step: any): Promise<Element | null> {
    // Enhanced accessibility-based element detection
    // This simulates what Playwright MCP would do with accessibility tree
    
    const instruction = step.instruction?.toLowerCase() || '';
    const target = step.target || '';
    
    // Strategy: Find elements by accessibility properties
    const candidates: Element[] = [];
    
    // Look for elements with relevant ARIA labels, roles, and text content
    const allElements = document.querySelectorAll('*');
    
    for (const element of allElements) {
      if (!this.isElementVisible(element)) continue;
      
      const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
      const role = element.getAttribute('role')?.toLowerCase() || '';
      const textContent = element.textContent?.toLowerCase() || '';
      const tagName = element.tagName.toLowerCase();
      
      // Score elements based on relevance to the instruction
      let score = 0;
      
      // High priority matches
      if (instruction.includes('click') || instruction.includes('select')) {
        if (['button', 'a', 'input'].includes(tagName)) score += 3;
        if (role === 'button' || role === 'link') score += 3;
      }
      
      // Text content matching
      const instructionWords = instruction.split(/\s+/);
      for (const word of instructionWords) {
        if (word.length > 2) {
          if (textContent.includes(word)) score += 2;
          if (ariaLabel.includes(word)) score += 2;
        }
      }
      
      // Target matching
      if (target && textContent.includes(target.toLowerCase())) score += 3;
      
      if (score > 0) {
        candidates.push(element);
        (element as any)._smartScore = score;
      }
    }
    
    // Return the highest scoring candidate
    candidates.sort((a, b) => ((b as any)._smartScore || 0) - ((a as any)._smartScore || 0));
    return candidates.length > 0 ? candidates[0] : null;
  }

  async findElementByTextAnalysis(step: any): Promise<Element | null> {
    // Fallback strategy using text-based heuristics
    const instruction = step.instruction?.toLowerCase() || '';
    
    // Look for common UI patterns
    if (instruction.includes('library') || instruction.includes('your library')) {
      // Find links with "library" in href or text content
      const allLinks = document.querySelectorAll('a[href*="library"]');
      for (const link of allLinks) {
        if (this.isElementVisible(link)) return link;
      }
      // Also check text content
      const textLinks = Array.from(document.querySelectorAll('a')).filter(a => 
        a.textContent?.toLowerCase().includes('library')
      );
      for (const link of textLinks) {
        if (this.isElementVisible(link)) return link;
      }
    }
    
    if (instruction.includes('create') || instruction.includes('new')) {
      const createButtons = document.querySelectorAll('button[aria-label*="Create"], [id*="create"]');
      for (const button of createButtons) {
        if (this.isElementVisible(button)) return button;
      }
      // Also check text content
      const textButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent?.toLowerCase().includes('create')
      );
      for (const button of textButtons) {
        if (this.isElementVisible(button)) return button;
      }
    }
    
    if (instruction.includes('playlist')) {
      const playlistElements = document.querySelectorAll('[id*="playlist"], a[href*="playlist"]');
      for (const element of playlistElements) {
        if (this.isElementVisible(element)) return element;
      }
      // Also check text content
      const textElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent?.toLowerCase().includes('playlist') && 
        ['button', 'a', 'div'].includes(el.tagName.toLowerCase())
      );
      for (const element of textElements) {
        if (this.isElementVisible(element)) return element;
      }
    }
    
    return null;
  }

  refreshStepGuide(step: any, foundElement: Element | null) {
    // Remove and recreate the step guide with updated element status
    this.removeExistingGuide();
    this.createStepGuide(step, foundElement);
    if (foundElement) {
      this.highlightElement(foundElement);
    }
  }
}

// Initialize content script
const vibelearning = new VibeLearningContent();

// Global functions for button clicks
(window as any).vibeNextStep = () => vibelearning.nextStep();
(window as any).vibeSkipTour = () => vibelearning.skipTour();
(window as any).vibeSmartDetect = () => vibelearning.smartDetect();