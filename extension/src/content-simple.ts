// VibeLearning Content Script - Simplified Version
console.log('VibeLearning content script loaded');

class VibeLearningContent {
  private currentTour: any = null;
  private isEnabled: boolean = true;

  constructor() {
    this.init();
  }

  async init() {
    console.log('VibeLearning content script initialized on:', window.location.hostname);
    this.setupMessageListeners();
    this.injectStyles();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .vibe-highlight {
        outline: 3px solid #4CAF50 !important;
        outline-offset: 2px;
        animation: vibe-pulse 2s infinite;
      }
      
      @keyframes vibe-pulse {
        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request.type, request);
      this.handleMessage(request, sendResponse);
      return true;
    });
  }

  async handleMessage(request: any, sendResponse: any) {
    switch (request.type) {
      case 'INIT_WORKFLOW':
        console.log('Initializing workflow:', request.workflow);
        await this.initializeWorkflow(request.workflow);
        sendResponse({ success: true });
        break;
        
      case 'START_WORKFLOW':
        console.log('Starting workflow:', request.workflowId);
        this.startWorkflowGuide(request.workflowId);
        sendResponse({ success: true });
        break;
        
      case 'HIGHLIGHT_ELEMENT':
        this.highlightElement(request.selector);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async initializeWorkflow(workflow: any) {
    console.log('Starting workflow with steps:', workflow.steps);
    
    if (!workflow || !workflow.steps) {
      console.error('Invalid workflow:', workflow);
      return;
    }

    this.showSimpleGuide(workflow);
  }

  showSimpleGuide(workflow: any) {
    // Remove any existing guides
    const existing = document.querySelector('.vibe-workflow-guide');
    if (existing) existing.remove();

    // Create a simple overlay guide
    const guide = document.createElement('div');
    guide.className = 'vibe-workflow-guide';
    guide.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    guide.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 12px; color: #1a1a1a;">
        🎯 ${workflow.name}
      </div>
      <div style="font-size: 14px; color: #666; margin-bottom: 16px;">
        ${workflow.description || 'Follow these steps to complete the workflow.'}
      </div>
      <ol style="font-size: 13px; color: #666; margin: 0; padding-left: 16px;">
        ${workflow.steps.map((step: any) => `<li style="margin-bottom: 8px;">${step.instruction}</li>`).join('')}
      </ol>
      <div style="margin-top: 16px;">
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">Got it!</button>
      </div>
    `;

    document.body.appendChild(guide);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (guide.parentElement) {
        guide.remove();
      }
    }, 30000);
  }

  startWorkflowGuide(workflowId: string) {
    console.log('Starting simple workflow guide for:', workflowId);
    
    if (workflowId === 'create_playlist') {
      this.showCreatePlaylistGuide();
    } else if (workflowId === 'upload_video') {
      this.showUploadVideoGuide();
    }
  }

  showCreatePlaylistGuide() {
    this.showSimpleGuide({
      name: 'Create YouTube Playlist',
      description: 'Follow these steps to create a new playlist:',
      steps: [
        { instruction: 'Click "Library" in the left sidebar' },
        { instruction: 'Look for the "Playlists" section' },
        { instruction: 'Click "New playlist" or the "+" button' },
        { instruction: 'Enter a name for your playlist' },
        { instruction: 'Choose privacy settings' },
        { instruction: 'Click "Create" to finish' }
      ]
    });
  }

  showUploadVideoGuide() {
    this.showSimpleGuide({
      name: 'Upload Video to YouTube',
      description: 'Follow these steps to upload a video:',
      steps: [
        { instruction: 'Click the "Create" button (camera icon) in the top right' },
        { instruction: 'Select "Upload video" from the menu' },
        { instruction: 'Click "SELECT FILES" to choose your video' },
        { instruction: 'Enter a title for your video' },
        { instruction: 'Add a description (optional)' },
        { instruction: 'Set video visibility (public, unlisted, private)' },
        { instruction: 'Click "PUBLISH" to upload' }
      ]
    });
  }

  highlightElement(selector: string) {
    // Remove existing highlights
    document.querySelectorAll('.vibe-highlight').forEach(el => {
      el.classList.remove('vibe-highlight');
    });

    // Add highlight to new element
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('vibe-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remove highlight after 5 seconds
      setTimeout(() => {
        element.classList.remove('vibe-highlight');
      }, 5000);
    }
  }
}

// Initialize content script
const vibelearning = new VibeLearningContent();