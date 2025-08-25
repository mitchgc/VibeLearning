/**
 * Modern Background Script for CRXJS
 * Uses native Chrome APIs for better compatibility
 */

interface UserSettings {
  enabled: boolean
  autoDetect: boolean
  learningMode: string
}

interface ActiveWorkflow {
  workflow: any
  currentStep: number
  startTime: number
  tabId: number
}

class BackgroundService {
  // Note: activeWorkflows will be used for managing workflow state in the future
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private activeWorkflows = new Map<number, ActiveWorkflow>()
  // Note: isInitialized will be used for preventing duplicate initialization
  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  private isInitialized = false
  private userSettings: UserSettings = {
    enabled: true,
    autoDetect: true,
    learningMode: 'adaptive'
  }

  constructor() {
    this.init()
  }

  async init() {
    console.log('🚀 VibeLearning Background Service starting...')
    
    await this.loadUserSettings()
    this.setupListeners()
    
    console.log('✅ VibeLearning Background Service initialized')
  }

  private async loadUserSettings(): Promise<void> {
    try {
      const { settings } = await chrome.storage.local.get('settings')
      this.userSettings = settings || this.userSettings
    } catch (error) {
      console.error('Failed to load user settings:', error)
    }
  }

  private setupListeners(): void {
    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse)
      return true
    })

    // Action click listener
    chrome.action.onClicked.addListener(async (tab) => {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId })
      } catch (error) {
        console.error('Failed to open side panel:', error)
      }
    })

    // Tab update listener
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.checkForSupportedApp(tab)
      }
    })

    // Installation listener
    chrome.runtime.onInstalled.addListener(() => {
      console.log('VibeLearning extension installed/updated')
    })
  }

  private async handleMessage(request: any, sender: any, sendResponse: any): Promise<void> {
    try {
      switch (request.type) {
        case 'GET_WORKFLOWS':
          await this.getWorkflows(request, sendResponse)
          break
          
        case 'START_WORKFLOW':
          await this.startWorkflow(request, sender, sendResponse)
          break
          
        case 'PING':
          sendResponse({ pong: true })
          break

        case 'LLM_REQUEST':
          await this.handleLLMRequest(request, sendResponse)
          break
          
        default:
          sendResponse({ error: 'Unknown message type' })
      }
    } catch (error) {
      console.error('Message handling error:', error)
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async getWorkflows(request: any, sendResponse: any) {
    try {
      const url = request.url || ''
      const availableWorkflows = await this.loadWorkflowsForUrl(url)
      
      sendResponse({ 
        success: true, 
        workflows: availableWorkflows
      })
    } catch (error) {
      console.error('Failed to get workflows:', error)
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async loadWorkflowsForUrl(url: string) {
    const workflows = []
    
    // YouTube workflows
    if (url.includes('youtube.com')) {
      workflows.push({
        id: 'create_playlist',
        name: 'Create a YouTube Playlist',
        description: 'Learn how to create and organize a new playlist on YouTube',
        difficulty: 'easy',
        estimatedTime: 120,
        platform: 'youtube',
        steps: await this.loadWorkflowSteps('youtube-playlist')
      })
    }
    
    // Gmail workflows
    if (url.includes('mail.google.com')) {
      workflows.push(
        {
          id: 'compose_email',
          name: 'Compose and Send Email',
          description: 'Learn how to compose, format, and send professional emails',
          difficulty: 'easy',
          estimatedTime: 90,
          platform: 'gmail',
          steps: await this.loadWorkflowSteps('gmail-compose')
        },
        {
          id: 'organize_inbox',
          name: 'Organize Your Inbox',
          description: 'Master Gmail labels, filters, and inbox organization',
          difficulty: 'medium',
          estimatedTime: 180,
          platform: 'gmail',
          steps: await this.loadWorkflowSteps('gmail-organize')
        }
      )
    }
    
    // Workday workflows
    if (url.includes('workday.com')) {
      workflows.push({
        id: 'expense_submission',
        name: 'Submit Expense Report',
        description: 'Complete workflow for submitting an expense report in Workday',
        difficulty: 'medium',
        estimatedTime: 300,
        platform: 'workday',
        steps: await this.loadWorkflowSteps('workday-expense')
      })
    }
    
    return workflows
  }

  private async loadWorkflowSteps(workflowId: string) {
    try {
      // In a real implementation, these would be loaded from workflow JSON files
      // For now, return sample steps based on the workflow type
      const workflowSteps = {
        'youtube-playlist': [
          {
            id: 'navigate_to_library',
            title: 'Go to Your Library',
            instruction: 'Click on Library in the left sidebar',
            intent: 'open_library',
            selector: 'a[href="/feed/library"]',
            position: 'right'
          },
          {
            id: 'click_new_playlist',
            title: 'Create New Playlist',
            instruction: 'Click New playlist or the + button',
            intent: 'create_new_playlist',
            selector: 'button:contains("New playlist")',
            position: 'top'
          },
          {
            id: 'enter_playlist_name',
            title: 'Name Your Playlist',
            instruction: 'Enter a name for your playlist',
            intent: 'enter_playlist_title',
            selector: 'input[placeholder*="playlist name"]',
            position: 'bottom'
          },
          {
            id: 'create_playlist_button',
            title: 'Create the Playlist',
            instruction: 'Click Create to make your playlist',
            intent: 'confirm_create_playlist',
            selector: 'button:contains("Create")',
            position: 'top'
          }
        ],
        'gmail-compose': [
          {
            id: 'click_compose',
            title: 'Start Composing',
            instruction: 'Click the Compose button to start a new email',
            intent: 'start_compose',
            selector: '[role="button"]:contains("Compose")',
            position: 'right'
          },
          {
            id: 'enter_recipient',
            title: 'Add Recipient',
            instruction: 'Enter the email address of your recipient',
            intent: 'add_recipient',
            selector: '[aria-label="To"]',
            position: 'bottom'
          },
          {
            id: 'enter_subject',
            title: 'Add Subject',
            instruction: 'Enter a clear and descriptive subject line',
            intent: 'add_subject',
            selector: '[aria-label="Subject"]',
            position: 'bottom'
          },
          {
            id: 'compose_message',
            title: 'Write Message',
            instruction: 'Type your email message!',
            intent: 'write_message',
            selector: '[aria-label="Message Body"]',
            position: 'bottom'
          },
          {
            id: 'send_email',
            title: 'Send Email',
            instruction: 'Click Send to deliver your email',
            intent: 'send_message',
            selector: '[role="button"]:contains("Send")',
            position: 'left'
          }
        ],
        'gmail-organize': [
          {
            id: 'select_email',
            title: 'Select an Email',
            instruction: 'Click on an email to select it',
            intent: 'select_email',
            selector: 'tr[role="row"]',
            position: 'right'
          },
          {
            id: 'click_labels',
            title: 'Access Labels',
            instruction: 'Click the Labels button in the toolbar',
            intent: 'access_labels',
            selector: '[aria-label="Labels"]',
            position: 'top'
          },
          {
            id: 'create_label',
            title: 'Create New Label',
            instruction: 'Click Create new to make a custom label',
            intent: 'create_new_label',
            selector: 'span:contains("Create new")',
            position: 'right'
          },
          {
            id: 'name_label',
            title: 'Name Your Label',
            instruction: 'Enter a name for your new label',
            intent: 'name_label',
            selector: 'input[placeholder="Please enter a new label name"]',
            position: 'bottom'
          }
        ],
        'workday-expense': [
          {
            id: 'navigate_to_expenses',
            title: 'Navigate to Expenses',
            instruction: 'Click on the Expenses worklet/tile on your Workday homepage',
            intent: 'open_expense_module',
            selector: '[data-automation-id="globalNavButton_expenses"]',
            position: 'bottom'
          },
          {
            id: 'create_expense_report',
            title: 'Create New Report',
            instruction: 'Click on Create Expense Report or the + button',
            intent: 'create_new_expense',
            selector: '[data-automation-id="createExpenseReport"]',
            position: 'right'
          },
          {
            id: 'enter_report_details',
            title: 'Enter Report Details',
            instruction: 'Enter a descriptive name for your expense report',
            intent: 'enter_report_name',
            selector: '[data-automation-id="expense_report_name"]',
            position: 'bottom'
          }
        ]
      }
      
      return workflowSteps[workflowId as keyof typeof workflowSteps] || []
    } catch (error) {
      console.error('Failed to load workflow steps:', error)
      return []
    }
  }

  private async startWorkflow(request: any, sender: any, sendResponse: any) {
    try {
      const workflowId = request.workflowId
      const tabId = sender.tab?.id || await this.getCurrentTabId()

      if (!tabId) {
        sendResponse({ success: false, error: 'No tab available' })
        return
      }

      // Send workflow to content script
      await chrome.tabs.sendMessage(tabId, {
        type: 'INIT_WORKFLOW',
        workflow: { id: workflowId, name: 'Test Workflow', steps: [] }
      })

      sendResponse({ success: true })
    } catch (error) {
      console.error('Failed to start workflow:', error)
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  private async getCurrentTabId(): Promise<number | null> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      return tabs[0]?.id || null
    } catch (error) {
      console.error('Failed to get current tab:', error)
      return null
    }
  }

  private checkForSupportedApp(tab: chrome.tabs.Tab) {
    if (!tab.url) return

    const supportedDomains = [
      'youtube.com',
      'github.com',
      'mail.google.com',
      'workday.com'
    ]

    const isSupported = supportedDomains.some(domain => tab.url!.includes(domain))
    console.log(`Tab ${tab.id}: ${isSupported ? 'Supported' : 'Not supported'} - ${tab.url}`)
  }

  private async handleLLMRequest(request: any, sendResponse: any) {
    try {
      console.log('🔄 Background script making LLM request...')
      console.log('🔍 Request payload:', request.payload)
      console.log('🔍 Extension ID:', chrome.runtime.id)
      console.log('🔍 Extension Origin:', `chrome-extension://${chrome.runtime.id}`)
      console.log('🔍 User Agent:', navigator.userAgent)
      
      // Skip health check, go directly to generate request
      console.log('🔄 Making direct generate request to Ollama...')
      
      // Test with a simple GET request first
      console.log('🧪 Testing GET /api/tags...')
      
      try {
        const tagsResponse = await fetch('http://localhost:11434/api/tags')
        console.log('🧪 GET tags status:', tagsResponse.status)
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          console.log('🧪 GET tags success:', tagsData)
        } else {
          console.log('🧪 GET tags failed:', await tagsResponse.text())
        }
      } catch (getError) {
        console.error('🧪 GET request failed:', getError)
      }

      // Test with a minimal POST request - no extra headers
      console.log('🧪 Testing minimal POST request...')
      
      const testResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': `chrome-extension://${chrome.runtime.id}`
        },
        body: JSON.stringify({
          model: 'qwen2.5-coder:7b',
          prompt: 'Hello',
          stream: false
        })
      })
      
      console.log('🧪 Test response status:', testResponse.status)
      
      if (!testResponse.ok) {
        const testError = await testResponse.text()
        console.error('🧪 Test failed:', testError)
      } else {
        console.log('🧪 Test passed, trying full request...')
      }
      
      // Now try the full request with explicit origin
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': `chrome-extension://${chrome.runtime.id}`
        },
        body: JSON.stringify(request.payload)
      })

      if (!response.ok) {
        console.error('LLM API response not OK:', response.status, response.statusText)
        const responseText = await response.text()
        console.error('Error response body:', responseText)
        sendResponse({ success: false, error: `HTTP ${response.status}: ${responseText}` })
        return
      }

      const data = await response.json()
      console.log('✅ LLM API response received:', data)
      sendResponse({ success: true, data })
      
    } catch (error) {
      console.error('Background LLM request failed:', error)
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'LLM request failed' 
      })
    }
  }
}

// Initialize the background service
new BackgroundService()

// Export for debugging
if (typeof globalThis !== 'undefined') {
  ;(globalThis as any).backgroundService = BackgroundService
}