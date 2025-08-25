// React 19 JSX runtime - no need to import React

export function NoWorkflowState() {
  return (
    <div className="no-workflow-state">
      <div className="empty-state-icon">🎯</div>
      <h2>No workflows available</h2>
      <p>
        VibeLearning doesn't have workflows for this application yet, or you're on an unsupported page.
      </p>
      <div className="supported-apps">
        <h3>Supported Applications:</h3>
        <ul>
          <li>YouTube</li>
          <li>GitHub</li>
          <li>Gmail</li>
          <li>Workday</li>
        </ul>
      </div>
      <div className="help-text">
        <p>Navigate to a supported application to see available workflows.</p>
      </div>
    </div>
  )
}