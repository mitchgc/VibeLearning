(function(){console.log("VibeLearning content script loaded");class h{constructor(){this.currentTour=null,this.isEnabled=!0,this.currentWorkflow=null,this.currentStep=0,this.init()}async init(){console.log("VibeLearning content script initialized on:",window.location.hostname),this.setupMessageListeners(),this.injectStyles()}injectStyles(){const e=document.createElement("style");e.textContent=`
      .vibe-highlight {
        outline: 3px solid #4CAF50 !important;
        outline-offset: 2px;
        animation: vibe-pulse 2s infinite;
        position: relative;
        z-index: 999998;
      }
      
      @keyframes vibe-pulse {
        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
      }

      .vibe-step-guide {
        position: fixed;
        top: 0;
        right: 0;
        width: 380px;
        height: 100vh;
        background: white;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border-left: 3px solid #4CAF50;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .vibe-sidebar-content {
        padding: 24px;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .vibe-page-resized {
        margin-right: 380px !important;
        transition: margin-right 0.3s ease;
      }

      .vibe-page-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 380px;
        bottom: 0;
        background: rgba(0, 0, 0, 0.05);
        z-index: 999998;
        pointer-events: none;
      }

      .vibe-sidebar-header {
        background: #f8f9fa;
        padding: 20px 24px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .vibe-workflow-title {
        font-weight: 600;
        color: #1a1a1a;
        font-size: 18px;
        margin: 0;
      }

      .vibe-close-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #666;
        padding: 4px;
        border-radius: 4px;
      }

      .vibe-close-btn:hover {
        background: #e0e0e0;
      }

      .vibe-step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }

      .vibe-step-title {
        font-weight: 600;
        color: #1a1a1a;
        font-size: 16px;
      }

      .vibe-step-counter {
        background: #4CAF50;
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
      }

      .vibe-step-instruction {
        font-size: 14px;
        color: #444;
        line-height: 1.5;
        margin-bottom: 24px;
        flex: 1;
      }

      .vibe-step-buttons {
        display: flex;
        gap: 12px;
        margin-top: auto;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
      }

      .vibe-btn {
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .vibe-btn-primary {
        background: #4CAF50;
        color: white;
      }

      .vibe-btn-primary:hover {
        background: #45a049;
      }

      .vibe-btn-secondary {
        background: #f5f5f5;
        color: #666;
      }

      .vibe-btn-secondary:hover {
        background: #e0e0e0;
      }

      .vibe-element-not-found {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 13px;
        color: #856404;
      }
    `,document.head.appendChild(e)}setupMessageListeners(){chrome.runtime.onMessage.addListener((e,t,i)=>(console.log("Content script received message:",e.type,e),this.handleMessage(e,i),!0))}async handleMessage(e,t){switch(e.type){case"INIT_WORKFLOW":console.log("Initializing workflow:",e.workflow),await this.initializeWorkflow(e.workflow),t({success:!0});break;case"START_WORKFLOW":console.log("Starting workflow:",e.workflowId),this.startWorkflowGuide(e.workflowId),t({success:!0});break;case"HIGHLIGHT_ELEMENT":this.highlightElement(e.selector),t({success:!0});break;default:t({error:"Unknown message type"})}}async initializeWorkflow(e){if(console.log("Starting interactive workflow:",e.name),!e||!e.steps){console.error("Invalid workflow:",e);return}this.currentWorkflow=e,this.currentStep=0,this.startInteractiveGuide()}startInteractiveGuide(){this.removeExistingGuide(),this.showCurrentStep()}showCurrentStep(){if(!this.currentWorkflow||this.currentStep>=this.currentWorkflow.steps.length){this.completeWorkflow();return}const e=this.currentWorkflow.steps[this.currentStep];console.log("Showing step:",this.currentStep+1,e);const t=this.findElement(e);this.createStepGuide(e,t),t&&this.highlightElement(t)}findElement(e){if(!e.selector)return null;const t=Array.isArray(e.selector)?e.selector:[e.selector];for(const i of t)try{const n=document.querySelector(i);if(n&&this.isElementVisible(n))return n}catch(n){console.warn("Invalid selector:",i,n)}return window.location.hostname.includes("youtube.com")?this.findYouTubeElement(e):null}findYouTubeElement(e){const i={library_link:['a[href="/feed/library"]','a[href*="library"]','ytd-guide-entry-renderer:has-text("Library")'],create_button:['ytd-topbar-menu-button-renderer button[aria-label*="Create"]','button[aria-label*="Create"]',"#create-icon"],playlists_section:["#playlists",'[id*="playlist"]','ytd-guide-section-renderer:has-text("Playlists")']}[e.target];if(i)for(const n of i)try{const o=document.querySelector(n);if(o&&this.isElementVisible(o))return o}catch{}return null}isElementVisible(e){const t=e.getBoundingClientRect();return t.width>0&&t.height>0&&t.top<window.innerHeight&&t.bottom>0}createStepGuide(e,t){this.resizePageContent();const i=document.createElement("div");i.className="vibe-page-overlay",document.body.appendChild(i);const n=document.createElement("div");n.className="vibe-step-guide";const o=t!==null,r=this.currentStep+1,s=this.currentWorkflow.steps.length;n.innerHTML=`
      <div class="vibe-sidebar-header">
        <h2 class="vibe-workflow-title">${this.currentWorkflow.name}</h2>
        <button class="vibe-close-btn" onclick="window.vibeSkipTour()">✕</button>
      </div>
      
      <div class="vibe-sidebar-content">
        <div class="vibe-step-header">
          <div class="vibe-step-title">${e.title||e.instruction}</div>
          <div class="vibe-step-counter">Step ${r} of ${s}</div>
        </div>
        
        ${o?"":`
          <div class="vibe-element-not-found">
            ⚠️ Element not found automatically. Look for the item described below.
            <div style="margin-top: 12px;">
              <button class="vibe-btn vibe-btn-smart-detect" onclick="window.vibeSmartDetect()" style="background: #2196F3; color: white; padding: 8px 12px; border-radius: 4px; border: none; font-size: 12px; cursor: pointer;">
                🧠 Smart Detection
              </button>
            </div>
          </div>
        `}
        
        <div class="vibe-step-instruction">
          <strong>What to do:</strong><br>
          ${e.instruction}
          
          ${o?"<br><br><strong>👈 Look for the highlighted element</strong><br>The element you need to interact with is highlighted with a green outline.":"<br><br><strong>💡 Tip:</strong><br>Look for the element described above and click on it when you find it."}
          
          <br><br><strong>When ready:</strong><br>
          Click "${r===s?"Finish":"Next Step"}" below to continue.
        </div>
        
        <div class="vibe-step-buttons">
          <button class="vibe-btn vibe-btn-primary" onclick="window.vibeNextStep()" style="flex: 1;">
            ${r===s?"🎉 Finish":"Next Step →"}
          </button>
          <button class="vibe-btn vibe-btn-secondary" onclick="window.vibeSkipTour()">
            Skip
          </button>
        </div>
      </div>
    `,document.body.appendChild(n)}resizePageContent(){[document.body,document.documentElement,document.querySelector("#page-manager"),document.querySelector("ytd-app"),document.querySelector("#content"),document.querySelector(".html5-video-player"),document.querySelector("#primary"),document.querySelector("#secondary")].filter(t=>t!==null).forEach(t=>{t&&!t.classList.contains("vibe-page-resized")&&t.classList.add("vibe-page-resized")}),window.location.hostname.includes("youtube.com")&&this.resizeYouTubeLayout()}resizeYouTubeLayout(){const e=document.querySelector("ytd-app"),t=document.querySelector("#masthead-container"),i=document.querySelector("#page-manager");e&&e.classList.add("vibe-page-resized"),t&&t.classList.add("vibe-page-resized"),i&&i.classList.add("vibe-page-resized")}removeExistingGuide(){const e=document.querySelector(".vibe-step-guide");e&&e.remove();const t=document.querySelector(".vibe-page-overlay");t&&t.remove(),document.querySelectorAll(".vibe-page-resized").forEach(i=>{i.classList.remove("vibe-page-resized")}),document.querySelectorAll(".vibe-highlight").forEach(i=>{i.classList.remove("vibe-highlight")})}nextStep(){this.currentStep++,this.showCurrentStep()}skipTour(){this.removeExistingGuide(),this.currentWorkflow=null,this.currentStep=0}completeWorkflow(){this.removeExistingGuide();const e=document.createElement("div");e.className="vibe-page-overlay",document.body.appendChild(e);const t=document.createElement("div");t.className="vibe-step-guide",t.innerHTML=`
      <div class="vibe-sidebar-header">
        <h2 class="vibe-workflow-title">🎉 Workflow Complete!</h2>
        <button class="vibe-close-btn" onclick="window.vibeSkipTour()">✕</button>
      </div>
      
      <div class="vibe-sidebar-content">
        <div class="vibe-step-instruction">
          <strong>Congratulations!</strong><br><br>
          You've successfully completed the "<strong>${this.currentWorkflow.name}</strong>" workflow. 
          
          <br><br>You now know how to:
          <ul style="margin: 16px 0; padding-left: 20px;">
            ${this.currentWorkflow.steps.map(i=>`<li style="margin: 8px 0;">${i.instruction}</li>`).join("")}
          </ul>
          
          <br><strong>What's next?</strong><br>
          Try exploring other workflows or practice this one again to master it!
        </div>
        
        <div class="vibe-step-buttons">
          <button class="vibe-btn vibe-btn-primary" onclick="window.vibeSkipTour()" style="flex: 1;">
            🎯 Done
          </button>
        </div>
      </div>
    `,document.body.appendChild(t),setTimeout(()=>{t.parentElement&&t.remove(),e.parentElement&&e.remove(),document.querySelectorAll(".vibe-page-resized").forEach(i=>{i.classList.remove("vibe-page-resized")})},8e3),this.currentWorkflow=null,this.currentStep=0}highlightElement(e){document.querySelectorAll(".vibe-highlight").forEach(i=>{i.classList.remove("vibe-highlight")});let t=null;typeof e=="string"?t=document.querySelector(e):t=e,t&&(t.classList.add("vibe-highlight"),t.scrollIntoView({behavior:"smooth",block:"center"}))}async smartDetect(){if(!this.currentWorkflow||this.currentStep>=this.currentWorkflow.steps.length)return;const e=this.currentWorkflow.steps[this.currentStep];console.log("Starting smart detection for step:",e),this.updateSmartDetectButton("🔍 Analyzing...",!0);try{const t=await this.analyzePageAccessibility(e);if(t){console.log("Smart detection found element:",t),this.highlightElement(t),this.updateSmartDetectButton("✅ Found!",!0),setTimeout(()=>{this.updateSmartDetectButton("🧠 Smart Detection",!1)},2e3),this.refreshStepGuide(e,t);return}const i=await this.findElementByTextAnalysis(e);if(i){console.log("Smart detection found element via text analysis:",i),this.highlightElement(i),this.updateSmartDetectButton("✅ Found!",!0),setTimeout(()=>{this.updateSmartDetectButton("🧠 Smart Detection",!1)},2e3),this.refreshStepGuide(e,i);return}console.log("Smart detection could not find element"),this.updateSmartDetectButton("❌ Not found",!0),setTimeout(()=>{this.updateSmartDetectButton("🧠 Smart Detection",!1)},3e3)}catch(t){console.error("Smart detection error:",t),this.updateSmartDetectButton("⚠️ Error",!0),setTimeout(()=>{this.updateSmartDetectButton("🧠 Smart Detection",!1)},3e3)}}updateSmartDetectButton(e,t){const i=document.querySelector(".vibe-btn-smart-detect");i&&(i.textContent=e,i.disabled=t,i.style.opacity=t?"0.7":"1")}async analyzePageAccessibility(e){const t=e.instruction?.toLowerCase()||"",i=e.target||"",n=[],o=document.querySelectorAll("*");for(const r of o){if(!this.isElementVisible(r))continue;const s=r.getAttribute("aria-label")?.toLowerCase()||"",u=r.getAttribute("role")?.toLowerCase()||"",d=r.textContent?.toLowerCase()||"",b=r.tagName.toLowerCase();let l=0;(t.includes("click")||t.includes("select"))&&(["button","a","input"].includes(b)&&(l+=3),(u==="button"||u==="link")&&(l+=3));const p=t.split(/\s+/);for(const a of p)a.length>2&&(d.includes(a)&&(l+=2),s.includes(a)&&(l+=2));i&&d.includes(i.toLowerCase())&&(l+=3),l>0&&(n.push(r),r._smartScore=l)}return n.sort((r,s)=>(s._smartScore||0)-(r._smartScore||0)),n.length>0?n[0]:null}async findElementByTextAnalysis(e){const t=e.instruction?.toLowerCase()||"";if(t.includes("library")||t.includes("your library")){const i=document.querySelectorAll('a[href*="library"]');for(const o of i)if(this.isElementVisible(o))return o;const n=Array.from(document.querySelectorAll("a")).filter(o=>o.textContent?.toLowerCase().includes("library"));for(const o of n)if(this.isElementVisible(o))return o}if(t.includes("create")||t.includes("new")){const i=document.querySelectorAll('button[aria-label*="Create"], [id*="create"]');for(const o of i)if(this.isElementVisible(o))return o;const n=Array.from(document.querySelectorAll("button")).filter(o=>o.textContent?.toLowerCase().includes("create"));for(const o of n)if(this.isElementVisible(o))return o}if(t.includes("playlist")){const i=document.querySelectorAll('[id*="playlist"], a[href*="playlist"]');for(const o of i)if(this.isElementVisible(o))return o;const n=Array.from(document.querySelectorAll("*")).filter(o=>o.textContent?.toLowerCase().includes("playlist")&&["button","a","div"].includes(o.tagName.toLowerCase()));for(const o of n)if(this.isElementVisible(o))return o}return null}refreshStepGuide(e,t){this.removeExistingGuide(),this.createStepGuide(e,t),t&&this.highlightElement(t)}}const c=new h;window.vibeNextStep=()=>c.nextStep();window.vibeSkipTour=()=>c.skipTour();window.vibeSmartDetect=()=>c.smartDetect();
})()
