console.log('🚀 VIBE CONTENT SCRIPT LOADED ON:', window.location.href);

// Simple test to see if content script is injecting
setTimeout(() => {
  console.log('🎯 Content script still running after 1 second');
}, 1000);

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔥 Content script received message:', request);
  
  if (request.type === 'INIT_WORKFLOW') {
    console.log('✅ Starting workflow:', request.workflow?.name);
    
    // Create a simple visible indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 50px;
      right: 50px;
      background: #4CAF50;
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 999999;
      font-size: 16px;
    `;
    indicator.textContent = '🎯 Workflow Started: ' + (request.workflow?.name || 'Unknown');
    document.body.appendChild(indicator);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 5000);
  }
  
  sendResponse({ success: true });
  return true;
});