import { useTransition, useDeferredValue } from 'react'

interface Workflow {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  steps: any[]
}

interface WorkflowSelectionProps {
  workflows: Workflow[]
  onSelect: (workflowId: string) => void
}

const estimatedTimes = {
  easy: '2 min',
  medium: '5 min',
  hard: '10 min'
} as const

export function WorkflowSelection({ workflows, onSelect }: WorkflowSelectionProps) {
  const [isPending, startTransition] = useTransition()
  const deferredWorkflows = useDeferredValue(workflows)

  const handleSelect = (workflowId: string) => {
    startTransition(() => {
      onSelect(workflowId)
    })
  }

  if (deferredWorkflows.length === 0) {
    return (
      <div className="no-workflows">
        <div className="empty-state-icon">📚</div>
        <h3>No workflows available</h3>
        <p>No workflows are available for this application yet.</p>
      </div>
    )
  }

  return (
    <div className="workflow-selection">
      <div className="section-header">
        <h2>Choose a Workflow</h2>
        <p>Select a workflow to get started with guided learning.</p>
      </div>

      <div className="workflow-list">
        {deferredWorkflows.map((workflow) => (
          <div
            key={workflow.id}
            className={`workflow-item ${isPending ? 'workflow-item--loading' : ''}`}
            onClick={() => handleSelect(workflow.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelect(workflow.id)
              }
            }}
          >
            <div className="workflow-header">
              <h3 className="workflow-name">{workflow.name}</h3>
              <div className="workflow-badges">
                <span className={`difficulty-badge difficulty-badge--${workflow.difficulty}`}>
                  {workflow.difficulty}
                </span>
                <span className="time-estimate">
                  ~{estimatedTimes[workflow.difficulty]}
                </span>
              </div>
            </div>
            
            <p className="workflow-description">{workflow.description}</p>
            
            <div className="workflow-footer">
              <span className="step-count">
                {workflow.steps.length} steps
              </span>
              <div className="start-arrow">→</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}