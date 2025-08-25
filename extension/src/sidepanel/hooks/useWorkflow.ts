import { useState, useEffect, useCallback } from 'react'

interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
}

interface WorkflowStep {
  id: string
  title: string
  instruction: string
  intent: string
  target: string
  selector: string
  position: string
}

// Note: ActiveWorkflow interface will be used for tracking workflow state
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ActiveWorkflow {
  workflow: Workflow
  currentStep: number
}

export function useWorkflow() {
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    // Check for existing active workflow
    chrome.storage.local.get('activeWorkflow').then((stored) => {
      if (stored.activeWorkflow) {
        setCurrentWorkflow(stored.activeWorkflow.workflow)
        setCurrentStep(stored.activeWorkflow.currentStep)
      }
    })

    // Listen for workflow messages
    const handleMessage = (request: any) => {
      switch (request.type) {
        case 'START_WORKFLOW':
          if (request.workflow) {
            setCurrentWorkflow(request.workflow)
            setCurrentStep(0)
          }
          break
        case 'UPDATE_STEP':
          setCurrentStep(request.stepIndex)
          break
        case 'CLOSE_WORKFLOW':
          setCurrentWorkflow(null)
          setCurrentStep(0)
          break
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  const startWorkflow = useCallback(async (workflow: Workflow) => {
    setCurrentWorkflow(workflow)
    setCurrentStep(0)

    // Store in chrome storage
    await chrome.storage.local.set({
      activeWorkflow: {
        workflow,
        currentStep: 0
      }
    })

    // Notify background script
    await chrome.runtime.sendMessage({
      type: 'START_WORKFLOW',
      workflowId: workflow.id
    })
  }, [])

  const nextStep = useCallback(async () => {
    if (!currentWorkflow) return

    const newStep = Math.min(currentStep + 1, currentWorkflow.steps.length - 1)
    setCurrentStep(newStep)

    await chrome.storage.local.set({
      activeWorkflow: {
        workflow: currentWorkflow,
        currentStep: newStep
      }
    })
  }, [currentWorkflow, currentStep])

  const previousStep = useCallback(async () => {
    if (!currentWorkflow) return

    const newStep = Math.max(currentStep - 1, 0)
    setCurrentStep(newStep)

    await chrome.storage.local.set({
      activeWorkflow: {
        workflow: currentWorkflow,
        currentStep: newStep
      }
    })
  }, [currentWorkflow, currentStep])

  const exitWorkflow = useCallback(async () => {
    setCurrentWorkflow(null)
    setCurrentStep(0)

    await chrome.storage.local.remove('activeWorkflow')

    // Clear highlights on page
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id!, {
          type: 'CLEAR_HIGHLIGHTS'
        })
      }
    } catch (error) {
      console.log('Could not clear highlights:', error)
    }
  }, [])

  const smartDetection = useCallback(async () => {
    if (!currentWorkflow) return

    const step = currentWorkflow.steps[currentStep]
    
    // Build workflow context for the LLM
    const workflowContext = {
      previousSteps: currentStep > 0 
        ? currentWorkflow.steps.slice(0, currentStep)
        : [],
      currentStepIndex: currentStep + 1, // 1-based for display
      nextStep: currentStep < currentWorkflow.steps.length - 1
        ? currentWorkflow.steps[currentStep + 1]
        : null
    }
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]) {
        // First, ensure content script is injected
        await ensureContentScriptInjected(tabs[0].id!)
        
        // Then try smart detection with workflow context
        await chrome.tabs.sendMessage(tabs[0].id!, {
          type: 'SMART_DETECT',
          selector: step.selector,
          step: step,
          workflowContext: workflowContext
        })
      }
    } catch (error) {
      console.error('Smart detection failed:', error)
      
      // Send failure message to sidepanel
      chrome.runtime.sendMessage({
        type: 'SMART_DETECT_FAILURE',
        message: 'Could not connect to page. Try refreshing the page.'
      })
    }
  }, [currentWorkflow, currentStep])

  // Helper function to ensure content script is loaded
  const ensureContentScriptInjected = async (tabId: number) => {
    try {
      // Try to ping the content script with a timeout
      await Promise.race([
        chrome.tabs.sendMessage(tabId, { type: 'PING' }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ping timeout')), 1000)
        )
      ])
      console.log('Content script is already loaded')
    } catch (error) {
      console.log('Content script not responding, attempting injection...')
      
      try {
        // Get current tab info to check URL
        const tab = await chrome.tabs.get(tabId)
        if (!tab.url) {
          throw new Error('Cannot access tab URL')
        }
        
        // Check if URL is supported
        const supportedHosts = ['workday.com', 'youtube.com', 'github.com', 'mail.google.com']
        const isSupported = supportedHosts.some(host => tab.url!.includes(host))
        
        if (!isSupported) {
          throw new Error(`Unsupported website: ${new URL(tab.url).hostname}`)
        }
        
        // Try to inject the content script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['assets/content-main.ts-DvhctQT1.js']
        })
        
        // Wait for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Try to ping again
        await chrome.tabs.sendMessage(tabId, { type: 'PING' })
        console.log('Content script injected and responding')
        
      } catch (injectionError) {
        console.error('Failed to inject or verify content script:', injectionError)
        throw new Error(`Content script injection failed: ${injectionError instanceof Error ? injectionError.message : 'Unknown error'}`)
      }
    }
  }

  return {
    currentWorkflow,
    currentStep,
    startWorkflow,
    nextStep,
    previousStep,
    exitWorkflow,
    smartDetection
  }
}