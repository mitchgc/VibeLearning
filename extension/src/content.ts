import browser from 'webextension-polyfill';
import Shepherd from 'shepherd.js';
import { UniversalElementFinder } from './elementFinder';
import { WorkflowEngine } from './workflowEngine';
import { UIOverlay } from './uiOverlay';

class VibeLearningContent {
  constructor() {
    this.elementFinder = new UniversalElementFinder();
    this.workflowEngine = new WorkflowEngine();
    this.uiOverlay = new UIOverlay();
    this.currentTour = null;
    this.isEnabled = true;
    this.init();
  }

  async init() {
    await this.injectStyles();
    this.setupMessageListeners();
    this.setupMutationObserver();
    await this.checkForActiveWorkflow();
    console.log('VibeLearning content script initialized');
  }

  async injectStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = browser.runtime.getURL('src/styles/shepherd-theme.css');
    document.head.appendChild(link);
  }

  setupMessageListeners() {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sendResponse);
      return true;
    });
  }

  async handleMessage(request, sendResponse) {
    console.log('Content script received message:', request.type, request);
    
    switch (request.type) {
      case 'INIT_WORKFLOW':
        console.log('Initializing workflow:', request.workflow);
        await this.initializeWorkflow(request.workflow);
        sendResponse({ success: true });
        break;

      case 'FIND_ELEMENT_LOCAL':
        const element = await this.elementFinder.find(
          document,
          request.intent,
          request.context
        );
        sendResponse({ element });
        break;

      case 'APP_DETECTED':
        this.showAppDetectedNotification(request.appName);
        break;

      case 'TOGGLE_EXTENSION':
        this.isEnabled = request.enabled;
        if (!this.isEnabled) {
          this.cleanup();
        }
        break;

      case 'NEXT_STEP':
        await this.workflowEngine.nextStep();
        break;

      case 'PREVIOUS_STEP':
        await this.workflowEngine.previousStep();
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async initializeWorkflow(workflow) {
    this.cleanup();
    
    this.workflowEngine.loadWorkflow(workflow);
    await this.startTour(workflow);
  }

  async startTour(workflow) {
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true
        },
        scrollTo: { behavior: 'smooth', block: 'center' },
        showCancelLink: true,
        classes: 'vibe-shepherd-theme'
      }
    });

    for (const step of workflow.steps) {
      const element = await this.findStepElement(step);
      
      tour.addStep({
        id: step.id,
        title: step.title || step.intent,
        text: step.instruction,
        attachTo: element ? {
          element: element.selector,
          on: step.position || 'bottom'
        } : undefined,
        buttons: this.getStepButtons(step, workflow),
        when: {
          show: () => this.onStepShow(step),
          hide: () => this.onStepHide(step)
        }
      });
    }

    tour.on('complete', () => this.onTourComplete(workflow));
    tour.on('cancel', () => this.onTourCancel(workflow));

    this.currentTour = tour;
    tour.start();
  }

  async findStepElement(step) {
    try {
      const cachedSelector = await this.getCachedSelector(step.id);
      if (cachedSelector && document.querySelector(cachedSelector)) {
        return { selector: cachedSelector };
      }

      const element = await this.elementFinder.find(
        document,
        step.intent,
        { step, url: window.location.href }
      );

      if (element && element.selector) {
        await this.cacheSelector(step.id, element.selector);
        return element;
      }

      return await this.promptUserForElement(step);
    } catch (error) {
      console.error('Error finding element:', error);
      return null;
    }
  }

  async getCachedSelector(stepId) {
    const stored = await browser.storage.local.get(`selector_${stepId}`);
    return stored[`selector_${stepId}`];
  }

  async cacheSelector(stepId, selector) {
    await browser.storage.local.set({ [`selector_${stepId}`]: selector });
  }

  async promptUserForElement(step) {
    return new Promise((resolve) => {
      this.uiOverlay.showElementSelector(
        `Please click on: ${step.instruction}`,
        (element) => {
          const selector = this.generateSelector(element);
          this.learnElement(element, step.intent);
          resolve({ selector });
        }
      );
    });
  }

  generateSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c);
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }

    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      const siblings = Array.from(current.parentNode?.children || []);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentNode;
    }

    return path.join(' > ');
  }

  async learnElement(element, intent) {
    const data = {
      selector: this.generateSelector(element),
      text: element.textContent?.trim().substring(0, 100),
      attributes: {
        class: element.className,
        id: element.id,
        'data-automation-id': element.getAttribute('data-automation-id'),
        'aria-label': element.getAttribute('aria-label'),
        role: element.getAttribute('role')
      }
    };

    await browser.runtime.sendMessage({
      type: 'LEARN_ELEMENT',
      element: data,
      intent
    });
  }

  getStepButtons(step, workflow) {
    const buttons = [];
    const isLastStep = workflow.steps.indexOf(step) === workflow.steps.length - 1;

    if (workflow.steps.indexOf(step) > 0) {
      buttons.push({
        text: 'Back',
        action: () => this.currentTour.back(),
        secondary: true
      });
    }

    buttons.push({
      text: isLastStep ? 'Complete' : 'Next',
      action: () => {
        this.recordStepCompletion(step);
        if (isLastStep) {
          this.currentTour.complete();
        } else {
          this.currentTour.next();
        }
      }
    });

    buttons.push({
      text: 'Skip',
      action: () => this.currentTour.next(),
      secondary: true
    });

    return buttons;
  }

  async onStepShow(step) {
    const startTime = Date.now();
    step.startTime = startTime;

    await this.highlightElement(step);
    
    if (step.waitForElement) {
      await this.waitForElement(step.waitForElement);
    }

    if (step.autoAdvance) {
      this.setupAutoAdvance(step);
    }
  }

  async onStepHide(step) {
    const duration = Date.now() - (step.startTime || Date.now());
    
    await browser.runtime.sendMessage({
      type: 'WORKFLOW_STEP_COMPLETE',
      workflowId: this.workflowEngine.currentWorkflow.id,
      stepId: step.id,
      data: {
        success: true,
        duration,
        elementFound: true
      }
    });
  }

  async highlightElement(step) {
    const element = document.querySelector(step.selector);
    if (element) {
      element.classList.add('vibe-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(checkInterval);
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Element not found within timeout'));
        }
      }, 100);
    });
  }

  setupAutoAdvance(step) {
    const element = document.querySelector(step.selector);
    if (!element) return;

    const eventType = step.autoAdvanceOn || 'click';
    
    const handler = () => {
      element.removeEventListener(eventType, handler);
      setTimeout(() => {
        if (this.currentTour) {
          this.currentTour.next();
        }
      }, 500);
    };

    element.addEventListener(eventType, handler);
  }

  async recordStepCompletion(step) {
    const element = document.querySelector(step.selector);
    
    await browser.runtime.sendMessage({
      type: 'WORKFLOW_STEP_COMPLETE',
      workflowId: this.workflowEngine.currentWorkflow?.id,
      stepId: step.id,
      data: {
        success: true,
        duration: Date.now() - (step.startTime || Date.now()),
        elementFound: !!element,
        elementSelector: element ? this.generateSelector(element) : null
      }
    });
  }

  async onTourComplete(workflow) {
    this.uiOverlay.showSuccess('Workflow completed successfully!');
    await browser.runtime.sendMessage({
      type: 'WORKFLOW_COMPLETE',
      workflowId: workflow.id
    });
    this.cleanup();
  }

  async onTourCancel(workflow) {
    await browser.runtime.sendMessage({
      type: 'WORKFLOW_CANCELLED',
      workflowId: workflow.id
    });
    this.cleanup();
  }

  showAppDetectedNotification(appName) {
    this.uiOverlay.showNotification(
      `${appName} detected! Click the VibeLearning icon to see available workflows.`,
      {
        duration: 5000,
        action: {
          text: 'View Workflows',
          callback: () => this.showWorkflowList()
        }
      }
    );
  }

  async showWorkflowList() {
    const response = await browser.runtime.sendMessage({
      type: 'GET_WORKFLOWS'
    });

    if (response.workflows && response.workflows.length > 0) {
      this.uiOverlay.showWorkflowList(response.workflows, (workflow) => {
        browser.runtime.sendMessage({
          type: 'START_WORKFLOW',
          workflowId: workflow.id
        });
      });
    }
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      if (this.currentTour && this.currentTour.getCurrentStep()) {
        const currentStep = this.currentTour.getCurrentStep();
        const element = document.querySelector(currentStep.options.attachTo?.element);
        
        if (!element) {
          this.handleElementDisappeared(currentStep);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });
  }

  async handleElementDisappeared(step) {
    console.log('Target element disappeared, attempting to re-find...');
    
    const newElement = await this.findStepElement(step.options);
    if (newElement) {
      step.updateStepOptions({
        attachTo: {
          element: newElement.selector,
          on: step.options.attachTo.on
        }
      });
    } else {
      this.uiOverlay.showWarning('Target element not found. Please click on the correct element.');
      await this.promptUserForElement(step.options);
    }
  }

  async checkForActiveWorkflow() {
    const stored = await browser.storage.local.get('activeWorkflow');
    if (stored.activeWorkflow) {
      const shouldResume = await this.uiOverlay.confirm(
        'Resume previous workflow?',
        'You have an incomplete workflow. Would you like to continue?'
      );
      
      if (shouldResume) {
        await this.initializeWorkflow(stored.activeWorkflow);
      } else {
        await browser.storage.local.remove('activeWorkflow');
      }
    }
  }

  cleanup() {
    if (this.currentTour) {
      this.currentTour.complete();
      this.currentTour = null;
    }
    
    document.querySelectorAll('.vibe-highlight').forEach(el => {
      el.classList.remove('vibe-highlight');
    });
    
    this.uiOverlay.cleanup();
  }
}

const vibelearning = new VibeLearningContent();