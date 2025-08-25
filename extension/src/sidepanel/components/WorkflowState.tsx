import { useState, useTransition } from 'react'

interface WorkflowStep {
  id: string
  title: string
  instruction: string
  intent: string
  target: string
  selector: string
  position: string
}

interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
}

interface WorkflowStateProps {
  workflow: Workflow
  currentStep: number
  onNext: () => void
  onPrevious: () => void
  onExit: () => void
  onSmartDetect: () => void
}

export function WorkflowState({ 
  workflow, 
  currentStep, 
  onNext, 
  onPrevious, 
  onExit, 
  onSmartDetect 
}: WorkflowStateProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const step = workflow.steps[currentStep]
  const isLastStep = currentStep === workflow.steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    startTransition(() => {
      onNext()
    })
  }

  const handlePrevious = () => {
    startTransition(() => {
      onPrevious()
    })
  }

  const handleSmartDetect = async () => {
    setIsDetecting(true)
    try {
      await onSmartDetect()
    } finally {
      // Reset after a delay to show completion
      setTimeout(() => setIsDetecting(false), 2000)
    }
  }

  if (!step) {
    return (
      <div className="workflow-complete">
        <div className="completion-icon">🎉</div>
        <h2>Workflow Complete!</h2>
        <p>You've successfully completed the "{workflow.name}" workflow.</p>
        <button onClick={onExit} className="btn-primary">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="workflow-state">
      <div className="step-header">
        <h2 className="step-title">{step.title}</h2>
        <div className="step-counter">
          Step {currentStep + 1} of {workflow.steps.length}
        </div>
      </div>

      <div className="step-content">
        <div className="step-instruction">
          <strong>What to do:</strong>
          <p>{step.instruction}</p>
        </div>

        <div className="step-actions">
          {isDetecting ? (
            <div className="smart-detect-progress">
              <div className="spinner" />
              <span>Analyzing page...</span>
            </div>
          ) : (
            <button 
              onClick={handleSmartDetect}
              className="btn-secondary smart-detect-btn"
              disabled={isPending}
            >
              🧠 Smart Detection
            </button>
          )}
        </div>
      </div>

      <div className="workflow-controls">
        <div className="control-buttons">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep || isPending}
            className="btn-secondary"
            style={{ display: isFirstStep ? 'none' : 'block' }}
          >
            ← Previous
          </button>
          
          <button
            onClick={handleNext}
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? (
              <>
                <div className="spinner-small" />
                Loading...
              </>
            ) : (
              isLastStep ? 'Finish' : 'Next Step →'
            )}
          </button>
        </div>
        
        <button onClick={onExit} className="btn-text exit-btn">
          Exit Workflow
        </button>
      </div>
    </div>
  )
}