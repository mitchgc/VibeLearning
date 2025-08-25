/**
 * Workflow Engine Module - Manages workflow state and step progression
 * Uses modern state management patterns
 */

interface WorkflowStep {
  id: string
  title: string
  instruction: string
  selector: string
  target: string
  intent?: string
  position?: string
}

interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
}

export default class WorkflowEngine {
  private currentWorkflow: Workflow | null = null
  private currentStepIndex = 0
  private stepHistory: number[] = []

  async init() {
    console.log('WorkflowEngine initialized')
  }

  async destroy() {
    this.currentWorkflow = null
    this.currentStepIndex = 0
    this.stepHistory = []
    console.log('WorkflowEngine destroyed')
  }

  /**
   * Set the current workflow
   */
  async setWorkflow(workflow: Workflow) {
    this.currentWorkflow = workflow
    this.currentStepIndex = 0
    this.stepHistory = []
    
    console.log(`✓ Workflow set: ${workflow.name} (${workflow.steps.length} steps)`)
  }

  /**
   * Get current workflow
   */
  getCurrentWorkflow(): Workflow | null {
    return this.currentWorkflow
  }

  /**
   * Get current step
   */
  getCurrentStep(): WorkflowStep | null {
    if (!this.currentWorkflow || this.currentStepIndex >= this.currentWorkflow.steps.length) {
      return null
    }
    return this.currentWorkflow.steps[this.currentStepIndex]
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex
  }

  /**
   * Move to next step
   */
  async nextStep(): Promise<boolean> {
    if (!this.currentWorkflow) return false

    if (this.currentStepIndex < this.currentWorkflow.steps.length - 1) {
      this.stepHistory.push(this.currentStepIndex)
      this.currentStepIndex++
      
      console.log(`✓ Advanced to step ${this.currentStepIndex + 1}/${this.currentWorkflow.steps.length}`)
      return true
    }

    console.log('✓ Workflow completed')
    return false
  }

  /**
   * Move to previous step
   */
  async previousStep(): Promise<boolean> {
    if (!this.currentWorkflow || this.stepHistory.length === 0) return false

    this.currentStepIndex = this.stepHistory.pop()!
    
    console.log(`✓ Returned to step ${this.currentStepIndex + 1}/${this.currentWorkflow.steps.length}`)
    return true
  }

  /**
   * Jump to specific step
   */
  async goToStep(stepIndex: number): Promise<boolean> {
    if (!this.currentWorkflow || stepIndex < 0 || stepIndex >= this.currentWorkflow.steps.length) {
      return false
    }

    this.stepHistory.push(this.currentStepIndex)
    this.currentStepIndex = stepIndex
    
    console.log(`✓ Jumped to step ${stepIndex + 1}/${this.currentWorkflow.steps.length}`)
    return true
  }

  /**
   * Check if workflow is complete
   */
  isComplete(): boolean {
    if (!this.currentWorkflow) return false
    return this.currentStepIndex >= this.currentWorkflow.steps.length
  }

  /**
   * Check if on first step
   */
  isFirstStep(): boolean {
    return this.currentStepIndex === 0
  }

  /**
   * Check if on last step
   */
  isLastStep(): boolean {
    if (!this.currentWorkflow) return false
    return this.currentStepIndex === this.currentWorkflow.steps.length - 1
  }

  /**
   * Get workflow progress as percentage
   */
  getProgress(): number {
    if (!this.currentWorkflow) return 0
    return Math.round((this.currentStepIndex / this.currentWorkflow.steps.length) * 100)
  }

  /**
   * Get step context for smart detection
   */
  getStepContext(): {
    step: WorkflowStep | null
    workflow: Workflow | null
    index: number
    total: number
    progress: number
  } {
    return {
      step: this.getCurrentStep(),
      workflow: this.currentWorkflow,
      index: this.currentStepIndex,
      total: this.currentWorkflow?.steps.length || 0,
      progress: this.getProgress()
    }
  }

  /**
   * Find step by selector
   */
  findStepBySelector(selector: string): WorkflowStep | null {
    if (!this.currentWorkflow) return null

    return this.currentWorkflow.steps.find(step => 
      step.selector === selector || 
      step.target === selector
    ) || null
  }

  /**
   * Validate workflow structure
   */
  validateWorkflow(workflow: Workflow): boolean {
    if (!workflow.id || !workflow.name || !Array.isArray(workflow.steps)) {
      return false
    }

    return workflow.steps.every(step => 
      step.id && 
      step.title && 
      step.instruction && 
      (step.selector || step.target)
    )
  }

  /**
   * Reset workflow to beginning
   */
  async resetWorkflow(): Promise<void> {
    this.currentStepIndex = 0
    this.stepHistory = []
    console.log('✓ Workflow reset to beginning')
  }
}