export class WorkflowEngine {
  constructor() {
    this.currentWorkflow = null;
    this.currentStepIndex = 0;
    this.stepHistory = [];
    this.adaptations = new Map();
  }

  loadWorkflow(workflow) {
    this.currentWorkflow = workflow;
    this.currentStepIndex = 0;
    this.stepHistory = [];
    
    if (workflow.adaptive) {
      this.loadAdaptations(workflow.id);
    }
  }

  async loadAdaptations(workflowId) {
    try {
      const stored = await browser.storage.local.get(`adaptations_${workflowId}`);
      if (stored[`adaptations_${workflowId}`]) {
        this.adaptations = new Map(Object.entries(stored[`adaptations_${workflowId}`]));
      }
    } catch (error) {
      console.error('Failed to load adaptations:', error);
    }
  }

  getCurrentStep() {
    if (!this.currentWorkflow || this.currentStepIndex >= this.currentWorkflow.steps.length) {
      return null;
    }
    
    const step = this.currentWorkflow.steps[this.currentStepIndex];
    return this.applyAdaptations(step);
  }

  applyAdaptations(step) {
    const adaptedStep = { ...step };
    
    if (this.adaptations.has(step.id)) {
      const adaptation = this.adaptations.get(step.id);
      
      if (adaptation.pace === 'slow') {
        adaptedStep.extraContext = true;
        adaptedStep.waitForConfirmation = true;
      }
      
      if (adaptation.customSelector) {
        adaptedStep.selector = adaptation.customSelector;
      }
      
      if (adaptation.skipCondition && this.evaluateCondition(adaptation.skipCondition)) {
        return this.nextStep();
      }
    }
    
    return adaptedStep;
  }

  evaluateCondition(condition) {
    try {
      if (condition.type === 'element_exists') {
        return !!document.querySelector(condition.selector);
      }
      
      if (condition.type === 'url_contains') {
        return window.location.href.includes(condition.value);
      }
      
      if (condition.type === 'user_role') {
        const userRole = this.getUserRole();
        return userRole === condition.value;
      }
    } catch (error) {
      console.error('Failed to evaluate condition:', error);
    }
    
    return false;
  }

  getUserRole() {
    const roleElement = document.querySelector('[data-user-role]');
    return roleElement?.getAttribute('data-user-role') || 'standard';
  }

  async nextStep() {
    if (!this.currentWorkflow) return null;
    
    this.recordStepCompletion(this.getCurrentStep());
    
    this.currentStepIndex++;
    
    if (this.currentStepIndex >= this.currentWorkflow.steps.length) {
      await this.completeWorkflow();
      return null;
    }
    
    return this.getCurrentStep();
  }

  async previousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      return this.getCurrentStep();
    }
    return null;
  }

  recordStepCompletion(step) {
    if (!step) return;
    
    this.stepHistory.push({
      stepId: step.id,
      timestamp: Date.now(),
      success: true
    });
  }

  async completeWorkflow() {
    const completion = {
      workflowId: this.currentWorkflow.id,
      completedAt: Date.now(),
      steps: this.stepHistory,
      duration: this.calculateTotalDuration()
    };
    
    await this.saveCompletion(completion);
    await this.updateUserProgress();
    
    this.currentWorkflow = null;
    this.currentStepIndex = 0;
    this.stepHistory = [];
  }

  calculateTotalDuration() {
    if (this.stepHistory.length === 0) return 0;
    
    const firstStep = this.stepHistory[0];
    const lastStep = this.stepHistory[this.stepHistory.length - 1];
    
    return lastStep.timestamp - firstStep.timestamp;
  }

  async saveCompletion(completion) {
    try {
      const stored = await browser.storage.local.get('completions');
      const completions = stored.completions || [];
      completions.push(completion);
      
      await browser.storage.local.set({ 
        completions: completions.slice(-100)
      });
      
      await fetch('http://localhost:3000/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completion)
      });
    } catch (error) {
      console.error('Failed to save completion:', error);
    }
  }

  async updateUserProgress() {
    try {
      const stored = await browser.storage.local.get('userProgress');
      const progress = stored.userProgress || {
        totalWorkflows: 0,
        completedWorkflows: 0,
        averageTime: 0,
        lastCompleted: null
      };
      
      progress.totalWorkflows++;
      progress.completedWorkflows++;
      progress.lastCompleted = Date.now();
      
      const duration = this.calculateTotalDuration();
      progress.averageTime = (progress.averageTime * (progress.completedWorkflows - 1) + duration) / progress.completedWorkflows;
      
      await browser.storage.local.set({ userProgress: progress });
    } catch (error) {
      console.error('Failed to update user progress:', error);
    }
  }

  async adaptToUserBehavior(stepId, behavior) {
    const adaptation = this.adaptations.get(stepId) || {};
    
    if (behavior.timeTaken > 10000) {
      adaptation.pace = 'slow';
    } else if (behavior.timeTaken < 2000) {
      adaptation.pace = 'fast';
    }
    
    if (behavior.elementNotFound) {
      adaptation.customSelector = behavior.userProvidedSelector;
    }
    
    if (behavior.skipped) {
      adaptation.skipCondition = await this.inferSkipCondition();
    }
    
    this.adaptations.set(stepId, adaptation);
    await this.saveAdaptations();
  }

  async inferSkipCondition() {
    const url = window.location.href;
    const visibleElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.offsetParent !== null)
      .slice(0, 100);
    
    return {
      type: 'url_contains',
      value: new URL(url).pathname
    };
  }

  async saveAdaptations() {
    if (!this.currentWorkflow) return;
    
    const key = `adaptations_${this.currentWorkflow.id}`;
    const adaptationsObj = Object.fromEntries(this.adaptations);
    
    await browser.storage.local.set({ [key]: adaptationsObj });
  }

  canSkipStep(step) {
    if (!step.skippable) return false;
    
    if (step.skipCondition) {
      return this.evaluateCondition(step.skipCondition);
    }
    
    const adaptation = this.adaptations.get(step.id);
    if (adaptation?.skipCondition) {
      return this.evaluateCondition(adaptation.skipCondition);
    }
    
    return true;
  }

  async validateStep(step) {
    if (!step.validation) return true;
    
    try {
      if (step.validation.type === 'element_exists') {
        return !!document.querySelector(step.validation.selector);
      }
      
      if (step.validation.type === 'element_contains_text') {
        const element = document.querySelector(step.validation.selector);
        return element?.textContent.includes(step.validation.text);
      }
      
      if (step.validation.type === 'url_matches') {
        return new RegExp(step.validation.pattern).test(window.location.href);
      }
      
      if (step.validation.type === 'custom') {
        return await this.runCustomValidation(step.validation.function);
      }
    } catch (error) {
      console.error('Step validation failed:', error);
      return false;
    }
    
    return true;
  }

  async runCustomValidation(validationFunction) {
    try {
      const fn = new Function('document', 'window', validationFunction);
      return fn(document, window);
    } catch (error) {
      console.error('Custom validation error:', error);
      return false;
    }
  }

  getProgress() {
    if (!this.currentWorkflow) return null;
    
    return {
      current: this.currentStepIndex + 1,
      total: this.currentWorkflow.steps.length,
      percentage: ((this.currentStepIndex + 1) / this.currentWorkflow.steps.length) * 100,
      timeElapsed: this.stepHistory.length > 0 ? 
        Date.now() - this.stepHistory[0].timestamp : 0
    };
  }

  async pauseWorkflow() {
    if (!this.currentWorkflow) return;
    
    const pausedState = {
      workflow: this.currentWorkflow,
      stepIndex: this.currentStepIndex,
      history: this.stepHistory,
      adaptations: Object.fromEntries(this.adaptations),
      timestamp: Date.now()
    };
    
    await browser.storage.local.set({ pausedWorkflow: pausedState });
    
    this.currentWorkflow = null;
    this.currentStepIndex = 0;
    this.stepHistory = [];
  }

  async resumeWorkflow() {
    try {
      const stored = await browser.storage.local.get('pausedWorkflow');
      if (!stored.pausedWorkflow) return false;
      
      const { workflow, stepIndex, history, adaptations } = stored.pausedWorkflow;
      
      this.currentWorkflow = workflow;
      this.currentStepIndex = stepIndex;
      this.stepHistory = history;
      this.adaptations = new Map(Object.entries(adaptations));
      
      await browser.storage.local.remove('pausedWorkflow');
      
      return true;
    } catch (error) {
      console.error('Failed to resume workflow:', error);
      return false;
    }
  }
}