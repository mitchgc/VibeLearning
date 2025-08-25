import React, { Suspense } from 'react'

export function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <h3>Initializing VibeLearning...</h3>
      <p>Detecting your current application and loading available workflows.</p>
    </div>
  )
}

// React 19 Suspense boundary for nested loading states
export function LoadingBoundary({ children, fallback }: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <Suspense fallback={fallback || <LoadingState />}>
      {children}
    </Suspense>
  )
}