/**
 * Modern Content Script Manager using dynamic imports and modular architecture
 * Built for performance and maintainability with React 19 patterns
 */

interface ContentModule {
  init(): Promise<void>
  destroy(): Promise<void>
}

interface WorkflowStep {
  id: string
  title: string
  instruction: string
  selector: string
  target: string
}

export class ContentScriptManager {
  private modules = new Map<string, ContentModule>()
  private isInitialized = false
  // Note: These will be used for workflow state management
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private currentWorkflow: any = null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  private currentStep = 0

  constructor() {
    console.log('VibeLearning Content Script Manager initializing...')
    this.init()
  }

  private async init() {
    if (this.isInitialized) return

    try {
      // Initialize core modules
      await this.loadCoreModules()
      
      // Set up message listeners
      this.setupMessageListeners()
      
      // Inject base styles
      await this.injectStyles()
      
      this.isInitialized = true
      console.log('Content Script Manager initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize Content Script Manager:', error)
    }
  }

  private async loadCoreModules() {
    // Load UI controller for overlays and highlights
    const UIController = await import('./modules/UIController')
    this.modules.set('ui', new UIController.default())

    // Load workflow engine for step management  
    const WorkflowEngine = await import('./modules/WorkflowEngine')
    this.modules.set('workflow', new WorkflowEngine.default())

    // Initialize loaded modules
    for (const [name, module] of this.modules) {
      try {
        await module.init()
        console.log(`✓ Loaded module: ${name}`)
      } catch (error) {
        console.error(`✗ Failed to load module ${name}:`, error)
      }
    }
  }

  private async loadSmartDetectionModule() {
    if (!this.modules.has('smart-detection')) {
      const SmartDetection = await import('./modules/SmartDetection')
      const module = new SmartDetection.default()
      await module.init()
      this.modules.set('smart-detection', module)
      console.log('✓ Dynamically loaded Smart Detection module')
    }
    return this.modules.get('smart-detection')!
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      console.log('Content script received message:', request.type)
      this.handleMessage(request, sendResponse)
      return true // Keep channel open for async responses
    })
  }

  private async handleMessage(request: any, sendResponse: any) {
    try {
      switch (request.type) {
        case 'INIT_WORKFLOW':
          await this.initializeWorkflow(request.workflow)
          sendResponse({ success: true })
          break
          
        case 'HIGHLIGHT_ELEMENT':
          const found = await this.highlightElement(request.selector)
          sendResponse({ success: true, elementFound: found })
          break
          
        case 'SMART_DETECT':
          await this.performSmartDetection(request.step, request.workflowContext)
          sendResponse({ success: true })
          break
          
        case 'CLEAR_HIGHLIGHTS':
          await this.clearHighlights()
          sendResponse({ success: true })
          break
          
        case 'PING':
          sendResponse({ pong: true, status: 'ready' })
          break
          
        default:
          sendResponse({ error: 'Unknown message type' })
      }
    } catch (error) {
      console.error('Message handling error:', error)
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async injectStyles() {
    const style = document.createElement('style')
    style.id = 'vibelearning-styles'
    style.textContent = `
      .vibe-highlight {
        outline: 3px solid #4CAF50 !important;
        outline-offset: 2px !important;
        animation: vibe-pulse 2s infinite !important;
        position: relative !important;
        z-index: 999998 !important;
        scroll-margin: 2rem !important;
      }
      
      @keyframes vibe-pulse {
        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7) !important; }
        70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0) !important; }
        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0) !important; }
      }

      .vibe-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0, 0, 0, 0.3) !important;
        z-index: 999997 !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
      }
      
      .vibe-overlay.visible {
        opacity: 1 !important;
      }
    `
    
    // Remove existing styles first
    const existing = document.getElementById('vibelearning-styles')
    if (existing) existing.remove()
    
    document.head.appendChild(style)
  }

  private async initializeWorkflow(workflow: any) {
    this.currentWorkflow = workflow
    this.currentStep = 0
    
    const workflowEngine = this.modules.get('workflow')
    if (workflowEngine && 'setWorkflow' in workflowEngine) {
      await (workflowEngine as any).setWorkflow(workflow)
    }
  }

  private async highlightElement(selector: string): Promise<boolean> {
    const uiController = this.modules.get('ui')
    if (uiController && 'highlightElement' in uiController) {
      return await (uiController as any).highlightElement(selector)
    }
    return false
  }

  private async performSmartDetection(step: WorkflowStep, workflowContext?: any) {
    // Lazy load the smart detection module
    const smartDetection = await this.loadSmartDetectionModule()
    
    if ('analyzeStep' in smartDetection) {
      return await (smartDetection as any).analyzeStep(step, workflowContext)
    }
  }

  private async clearHighlights() {
    const uiController = this.modules.get('ui')
    if (uiController && 'clearHighlights' in uiController) {
      await (uiController as any).clearHighlights()
    }
  }

  // Public API for external access
  public async destroy() {
    for (const [name, module] of this.modules) {
      try {
        await module.destroy()
        console.log(`✓ Destroyed module: ${name}`)
      } catch (error) {
        console.error(`✗ Failed to destroy module ${name}:`, error)
      }
    }
    
    this.modules.clear()
    this.isInitialized = false
    
    // Remove injected styles
    const styles = document.getElementById('vibelearning-styles')
    if (styles) styles.remove()
  }
}

// Initialize the content script manager
const contentScriptManager = new ContentScriptManager()

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  ;(window as any).vibeContentScript = contentScriptManager
}

export default contentScriptManager