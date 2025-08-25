import { useState, useEffect } from 'react'
import { WorkflowState } from './components/WorkflowState'
import { WorkflowSelection } from './components/WorkflowSelection'
import { NoWorkflowState } from './components/NoWorkflowState'
import { LoadingState } from './components/LoadingState'
import { useWorkflow } from './hooks/useWorkflow'
import { useAppDetection } from './hooks/useAppDetection'
import './styles/sidepanel.css'

type AppState = 'loading' | 'no-workflow' | 'workflow-selection' | 'workflow-active'

export default function SidePanelApp() {
  const [appState, setAppState] = useState<AppState>('loading')
  const { currentApp, availableWorkflows } = useAppDetection()
  const { 
    currentWorkflow, 
    currentStep, 
    startWorkflow, 
    nextStep, 
    previousStep, 
    exitWorkflow,
    smartDetection 
  } = useWorkflow()

  useEffect(() => {
    console.log('SidePanel initialized')
    
    if (!currentApp) {
      setAppState('no-workflow')
    } else if (currentWorkflow) {
      setAppState('workflow-active')
    } else if (availableWorkflows.length > 0) {
      setAppState('workflow-selection')
    } else {
      setAppState('no-workflow')
    }
  }, [currentApp, currentWorkflow, availableWorkflows])

  const handleWorkflowSelect = (workflowId: string) => {
    const workflow = availableWorkflows.find(w => w.id === workflowId)
    if (workflow) {
      startWorkflow(workflow)
      setAppState('workflow-active')
    }
  }

  const handleExitWorkflow = () => {
    exitWorkflow()
    setAppState(availableWorkflows.length > 0 ? 'workflow-selection' : 'no-workflow')
  }

  return (
    <div className="sidepanel-container">
      <header className="sidepanel-header">
        <h1 className="sidepanel-title">
          {currentWorkflow ? currentWorkflow.name : 'VibeLearning'}
        </h1>
        {currentApp && (
          <div className="app-badge">
            <span className="app-name">{currentApp.name}</span>
            <span className="app-status">Detected</span>
          </div>
        )}
      </header>

      <main className="sidepanel-content">
        {appState === 'loading' && <LoadingState />}
        
        {appState === 'no-workflow' && <NoWorkflowState />}
        
        {appState === 'workflow-selection' && (
          <WorkflowSelection 
            workflows={availableWorkflows}
            onSelect={handleWorkflowSelect}
          />
        )}
        
        {appState === 'workflow-active' && currentWorkflow && (
          <WorkflowState
            workflow={currentWorkflow}
            currentStep={currentStep}
            onNext={nextStep}
            onPrevious={previousStep}
            onExit={handleExitWorkflow}
            onSmartDetect={smartDetection}
          />
        )}
      </main>
    </div>
  )
}