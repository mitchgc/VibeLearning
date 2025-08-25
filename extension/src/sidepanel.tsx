import React from 'react'
import { createRoot } from 'react-dom/client'
import SidePanelApp from './sidepanel/SidePanelApp'

console.log('Loading React-based sidepanel...')

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container not found')
}

const root = createRoot(container)
root.render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>
)