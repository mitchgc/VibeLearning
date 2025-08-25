import { useState, useEffect } from 'react'

interface App {
  name: string
  id: string
  pattern: RegExp
}

interface Workflow {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  steps: any[]
}

// Get workflows for URL
const getWorkflows = async (url: string): Promise<Workflow[]> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_WORKFLOWS',
      url
    })
    return response?.workflows || []
  } catch (error) {
    console.error('Failed to load workflows:', error)
    return []
  }
}

const getCurrentTab = async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    return tabs[0]
  } catch (error) {
    console.error('Error getting current tab:', error)
    return null
  }
}

export function useAppDetection() {
  const [currentApp, setCurrentApp] = useState<App | null>(null)
  const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const detectApp = async () => {
      try {
        const tab = await getCurrentTab()
        
        if (!tab?.url || !mounted) return

        const supportedApps: App[] = [
          { pattern: /youtube\.com/, name: 'YouTube', id: 'youtube' },
          { pattern: /github\.com/, name: 'GitHub', id: 'github' },
          { pattern: /mail\.google\.com/, name: 'Gmail', id: 'gmail' },
          { pattern: /workday\.com/, name: 'Workday', id: 'workday' }
        ]

        const detectedApp = supportedApps.find(app => app.pattern.test(tab.url!))
        
        if (mounted) {
          setCurrentApp(detectedApp || null)
          
          if (detectedApp) {
            // Use React 19 cache for workflows
            const workflows = await getWorkflows(tab.url!)
            if (mounted) {
              setAvailableWorkflows(workflows)
            }
          } else {
            setAvailableWorkflows([])
          }
        }
      } catch (error) {
        console.error('App detection failed:', error)
        if (mounted) {
          setCurrentApp(null)
          setAvailableWorkflows([])
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    detectApp()

    // Listen for tab updates
    const handleTabUpdate = (_tabId: number, changeInfo: any) => {
      if (changeInfo.status === 'complete') {
        detectApp()
      }
    }

    chrome.tabs.onUpdated.addListener(handleTabUpdate)

    return () => {
      mounted = false
      chrome.tabs.onUpdated.removeListener(handleTabUpdate)
    }
  }, [])

  return {
    currentApp,
    availableWorkflows,
    isLoading
  }
}