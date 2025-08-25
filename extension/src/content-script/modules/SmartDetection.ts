/**
 * Smart Detection Module - AI-powered element detection
 * Lazy-loaded for performance, uses modern web APIs
 */

interface WorkflowStep {
  id: string
  title: string
  instruction: string
  selector: string
  target: string
}

interface ElementCandidate {
  element: Element
  score: number
  reasons: string[]
}

export default class SmartDetection {
  private isInitialized = false

  async init() {
    console.log('Smart Detection module loaded')
    this.isInitialized = true
  }

  async destroy() {
    this.isInitialized = false
    console.log('Smart Detection module destroyed')
  }

  /**
   * Analyze step and find the best element match
   */
  async analyzeStep(step: WorkflowStep, workflowContext?: any): Promise<Element | null> {
    if (!this.isInitialized) {
      await this.init()
    }

    console.log('🧠 Starting smart detection for:', step.instruction)
    console.log('📋 Step details:', {
      id: step.id,
      title: step.title,
      selector: step.selector,
      target: step.target
    })

    try {
      // Phase 0: Direct selector matching (fastest)
      const directResult = await this.tryDirectSelector(step)
      if (directResult) {
        this.sendSuccessMessage('Element found via direct selector!', directResult)
        this.highlightElement(directResult)
        return directResult
      }

      // Phase 1: Accessibility-based detection
      const accessibilityResult = await this.analyzeAccessibility(step)
      if (accessibilityResult) {
        this.sendSuccessMessage('Element found via accessibility analysis!', accessibilityResult)
        this.highlightElement(accessibilityResult)
        return accessibilityResult
      }

      // Phase 2: Text content analysis
      const textResult = await this.analyzeTextContent(step)
      if (textResult) {
        this.sendSuccessMessage('Element found via text analysis!', textResult)
        this.highlightElement(textResult)
        return textResult
      }

      // Phase 3: LLM analysis (if available)
      console.log('🤖 Starting Phase 3: LLM Analysis (Phases 1 & 2 failed)')
      const llmResult = await this.analyzePage(step, workflowContext)
      if (llmResult) {
        this.sendSuccessMessage('Element found via AI analysis!', llmResult)
        this.highlightElement(llmResult)
        return llmResult
      }

      console.log('❌ Smart detection could not find element')
      this.sendFailureMessage('Element not found after comprehensive analysis')
      return null

    } catch (error) {
      console.error('Smart detection error:', error)
      this.sendFailureMessage('Smart detection encountered an error')
      return null
    }
  }

  /**
   * Phase 0: Direct selector matching
   */
  private async tryDirectSelector(step: WorkflowStep): Promise<Element | null> {
    this.sendProgressMessage('Phase 0: Direct Selector', '⚡ Trying exact selector match...')
    
    await this.delay(300) // Quick delay
    
    if (!step.selector) {
      console.log('❌ No selector defined, skipping Phase 0')
      return null
    }

    // Handle both single selector and array of selectors
    const selectors = Array.isArray(step.selector) ? step.selector : [step.selector]

    for (const selector of selectors) {
      try {
        console.log('🔍 Trying direct selector:', selector)
        const element = document.querySelector(selector)
        
        if (element && this.isElementVisible(element)) {
          console.log('✅ Direct selector match found:', element)
          return element
        } else if (element) {
          console.log('⚠️ Element found but not visible:', element)
        } else {
          console.log('❌ No element found for selector:', selector)
        }
      } catch (error) {
        console.warn('❌ Invalid selector:', selector, error)
      }
    }

    console.log('❌ Phase 0: No direct selector matches found')
    return null
  }

  /**
   * Phase 1: Accessibility-based element detection
   */
  private async analyzeAccessibility(step: WorkflowStep): Promise<Element | null> {
    this.sendProgressMessage('Phase 1: DOM Analysis', '🔍 Analyzing accessibility labels...')
    
    await this.delay(800) // Simulate processing time

    const instruction = step.instruction.toLowerCase()
    const target = step.target?.toLowerCase() || ''
    
    // Get all potentially interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [tabindex]'
    )

    const candidates: ElementCandidate[] = []

    for (const element of interactiveElements) {
      if (!this.isElementVisible(element)) continue

      const score = this.calculateAccessibilityScore(element, instruction, target)
      if (score > 0) {
        candidates.push({
          element,
          score,
          reasons: this.getScoreReasons(element, instruction, target)
        })
      }
    }

    // Sort by score and return best match
    candidates.sort((a, b) => b.score - a.score)
    
    if (candidates.length > 0) {
      candidates.forEach((candidate, index) => {
        console.log(`🎯 Accessibility Candidate #${index + 1}:`, {
          element: candidate.element,
          score: candidate.score,
          reasons: candidate.reasons,
          tagName: candidate.element.tagName,
          textContent: candidate.element.textContent?.substring(0, 50),
          attributes: this.getElementAttributes(candidate.element)
        })
      })
      
      const best = candidates[0]
      
      // Strict threshold: only auto-select if we have a very confident match
      const MIN_CONFIDENCE_SCORE = 12 // Requires exact action match + context or exact phrase
      if (best.score >= MIN_CONFIDENCE_SCORE) {
        console.log('✅ Selected best accessibility match (high confidence):', best.element)
        return best.element
      } else {
        console.log(`❌ Best accessibility candidate score (${best.score}) below confidence threshold (${MIN_CONFIDENCE_SCORE})`)
        return null
      }
    }

    console.log('❌ No accessibility candidates found')
    return null
  }

  /**
   * Phase 2: Text content analysis
   */
  private async analyzeTextContent(step: WorkflowStep): Promise<Element | null> {
    this.sendProgressMessage('Phase 2: Text Analysis', '📝 Matching text patterns...')
    
    await this.delay(800)

    const instruction = step.instruction.toLowerCase()
    
    // Extract key action words
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const actionWords = this.extractActionWords(instruction)
    
    // Search for elements with relevant text
    const allElements = document.querySelectorAll('*')
    const candidates: ElementCandidate[] = []

    for (const element of allElements) {
      if (!this.isElementVisible(element) || !this.isInteractable(element)) continue

      const textContent = element.textContent?.toLowerCase().trim() || ''
      if (textContent.length === 0 || textContent.length > 200) continue

      let score = 0
      const reasons: string[] = []

      // Extract actions from instruction (same logic as accessibility phase)
      const instructionActions = this.extractActionWords(instruction)
      const primaryAction = instructionActions[0]
      
      // Check for primary action word match
      let primaryActionMatched = false
      if (primaryAction && textContent.includes(primaryAction)) {
        score += 6
        reasons.push(`Contains primary action: "${primaryAction}"`)
        primaryActionMatched = true
      }
      
      // Check for secondary action words (lower priority)
      for (let i = 1; i < instructionActions.length; i++) {
        const action = instructionActions[i]
        if (textContent.includes(action)) {
          score += 2
          reasons.push(`Contains secondary action: "${action}"`)
        }
      }
      
      // Heavy penalty for conflicting actions
      if (primaryAction) {
        const conflictingActions = this.getConflictingActions(primaryAction)
        for (const conflict of conflictingActions) {
          if (textContent.includes(conflict)) {
            score -= 10
            reasons.push(`CONFLICT: Contains "${conflict}" but instruction needs "${primaryAction}"`)
          }
        }
      }

      // Check for exact phrases (but only if primary action matched or no primary action needed)
      if (instruction.includes(textContent) || textContent.includes(step.target?.toLowerCase() || '')) {
        if (primaryActionMatched || !primaryAction) {
          score += 5
          reasons.push('Exact text match')
        }
      }

      if (score > 0) {
        candidates.push({ element, score, reasons })
      }
    }

    candidates.sort((a, b) => b.score - a.score)
    
    if (candidates.length > 0) {
      console.log(`📝 Text Analysis found ${candidates.length} candidates:`)
      candidates.slice(0, 3).forEach((candidate, index) => {
        console.log(`📝 Text Candidate #${index + 1}:`, {
          element: candidate.element,
          score: candidate.score,
          reasons: candidate.reasons,
          textContent: candidate.element.textContent?.substring(0, 50)
        })
      })
      
      const best = candidates[0]
      
      // Apply same strict threshold as accessibility phase
      const MIN_TEXT_CONFIDENCE_SCORE = 8 // Requires primary action match + some context
      if (best.score >= MIN_TEXT_CONFIDENCE_SCORE) {
        console.log('✅ Selected best text match (high confidence):', best.element)
        return best.element
      } else {
        console.log(`❌ Best text candidate score (${best.score}) below confidence threshold (${MIN_TEXT_CONFIDENCE_SCORE})`)
        return null
      }
    }
    
    console.log('❌ No text content candidates found')
    return null
  }

  /**
   * Phase 3: LLM-powered analysis
   */
  private async analyzePage(step: WorkflowStep, workflowContext?: any): Promise<Element | null> {
    this.sendProgressMessage('Phase 3: AI Analysis', '🤖 Analyzing page with AI...')
    
    await this.delay(1000)

    try {
      const pageContext = this.extractPageContext()
      const candidates = this.getElementCandidates(step)  // Pass step for relevance scoring
      const prompt = this.buildPrompt(step, pageContext, candidates, workflowContext)

      console.log('=== LLM PROMPT (RAW) ===')
      console.log(prompt)
      console.log('=== END LLM PROMPT ===')

      const response = await this.callLLMAPI(prompt)
      
      console.log('=== LLM RESPONSE (RAW) ===')
      console.log('Response text:', response)
      console.log('=== END LLM RESPONSE ===')

      if (response) {
        const result = this.parseLLMResponse(response, candidates)
        if (result.element) {
          return result.element
        } else if (result.guidance) {
          this.sendGuidanceMessage(result.guidance)
        }
      }

    } catch (error) {
      console.error('LLM analysis failed:', error)
    }

    return null
  }

  /**
   * Calculate accessibility-based score for element
   */
  private calculateAccessibilityScore(element: Element, instruction: string, target: string): number {
    let score = 0

    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''
    const role = element.getAttribute('role')?.toLowerCase() || ''
    const textContent = element.textContent?.toLowerCase() || ''
    const tagName = element.tagName.toLowerCase()
    const combinedText = `${ariaLabel} ${textContent}`.trim()

    // Base score for interactive elements
    if (['button', 'a', 'input'].includes(tagName)) score += 2
    if (['button', 'link', 'menuitem'].includes(role)) score += 2

    // Extract key action and context from instruction
    const actionWords = this.extractActionWords(instruction)
    const contextWords = this.extractContextWords(instruction)
    
    // High priority: exact phrase matching
    if (combinedText.includes(instruction.toLowerCase())) {
      score += 15 // Highest score for exact match
    }
    
    // Medium priority: action word matching (primary action gets priority)
    let actionMatched = false
    for (const action of actionWords) {
      if (combinedText.includes(action)) {
        // Give higher score to primary action (first in list)
        const actionScore = action === actionWords[0] ? 8 : 4
        score += actionScore
        actionMatched = true
        break // Only count the first action match
      }
    }
    
    // Strict matching: require action match for any scoring
    if (!actionMatched) {
      return 0 // No score if primary action doesn't match
    }
    
    // Medium priority: context matching (email, compose, etc.)
    for (const context of contextWords) {
      if (combinedText.includes(context)) {
        score += 5
      }
    }
    
    // Target matching (specific UI elements)
    if (target && combinedText.includes(target.toLowerCase())) {
      score += 6
    }
    
    // Heavy penalty for conflicting actions (create vs compose, etc.)
    const conflictingActions = this.getConflictingActions(actionWords[0])
    for (const conflict of conflictingActions) {
      if (combinedText.includes(conflict)) {
        score -= 15 // Very heavy penalty for wrong action
      }
    }

    return Math.max(0, score) // Never return negative scores
  }

  /**
   * Get actions that conflict with the primary action
   */
  private getConflictingActions(primaryAction: string): string[] {
    const conflicts: Record<string, string[]> = {
      'type': ['click', 'compose', 'send'], // typing conflicts with clicking buttons
      'write': ['click', 'compose', 'send'], // writing conflicts with clicking buttons
      'enter': ['click', 'compose', 'send'], // entering text conflicts with clicking buttons
      'compose': ['create', 'add', 'new label', 'delete', 'remove', 'type'], // compose button conflicts with typing
      'click': ['type', 'write', 'enter', 'hover', 'scroll', 'drag'], // clicking conflicts with typing
      'select': ['deselect', 'unselect', 'clear'],
      'open': ['close', 'minimize', 'hide'],
      'create': ['delete', 'remove', 'compose'], // create and compose are different
      'send': ['save', 'draft', 'cancel', 'type', 'write'] // sending conflicts with typing
    }
    
    return conflicts[primaryAction] || []
  }

  /**
   * Extract context words (nouns, objects) from instruction
   */
  private extractContextWords(instruction: string): string[] {
    const contexts = ['email', 'message', 'label', 'playlist', 'video', 'photo', 'document', 'file', 'folder', 'expense', 'report']
    const instrLower = instruction.toLowerCase()
    return contexts.filter(context => instrLower.includes(context))
  }

  /**
   * Get reasons for scoring
   */
  private getScoreReasons(element: Element, _instruction: string, _target: string): string[] {
    const reasons: string[] = []
    
    const tagName = element.tagName.toLowerCase()
    const textContent = element.textContent?.toLowerCase() || ''
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''

    if (['button', 'a', 'input'].includes(tagName)) {
      reasons.push(`Interactive element: ${tagName}`)
    }

    if (textContent.length > 0) {
      reasons.push(`Has text: "${textContent.substring(0, 50)}"`)
    }

    if (ariaLabel) {
      reasons.push(`Has aria-label: "${ariaLabel}"`)
    }

    return reasons
  }

  /**
   * Extract action words from instruction
   */
  private extractActionWords(instruction: string): string[] {
    const commonActions = [
      'type', 'enter', 'write', 'compose', // Text input actions
      'click', 'select', 'choose', 'tap', // Click actions  
      'open', 'close', 'expand', 'collapse', // Navigation actions
      'submit', 'send', 'save', 'delete', // Form actions
      'edit', 'create', 'add', 'remove', 'update' // CRUD actions
    ]
    
    const instrLower = instruction.toLowerCase()
    const foundActions = commonActions.filter(action => instrLower.includes(action))
    
    // Prioritize by order of appearance in instruction (first action is primary)
    return foundActions.sort((a, b) => instrLower.indexOf(a) - instrLower.indexOf(b))
  }

  /**
   * Build LLM prompt
   */
  private buildPrompt(step: WorkflowStep, pageContext: string, candidates: any[], workflowContext?: any): string {
    // Include relevance scores to guide LLM
    const candidatesText = candidates.map(c => {
      const scoreInfo = c.relevanceScore > 0 ? ` [relevance: ${c.relevanceScore.toFixed(1)}]` : ''
      return `${c.id}${scoreInfo}: <${c.tag} ${c.attributes}>${c.text}</${c.tag}>`
    }).join('\n')

    // Build workflow context if available
    let workflowSection = ''
    if (workflowContext) {
      const { previousSteps, currentStepIndex, nextStep } = workflowContext
      if (previousSteps && previousSteps.length > 0) {
        const prevStepsText = previousSteps.map((s: any, i: number) => 
          `${i + 1}. ${s.instruction} ✓`
        ).join('\n')
        
        workflowSection = `
Workflow context:
Previous steps completed:
${prevStepsText}

Current step:
${currentStepIndex}. ${step.instruction} ← YOU ARE HERE

${nextStep ? `Next step:\n${currentStepIndex + 1}. ${nextStep.instruction}` : ''}
`
      }
    }

    return `You are helping a user navigate a web page. The user wants to: "${step.instruction}"
${workflowSection}

${pageContext}

Available interactive elements (sorted by relevance score):
${candidatesText}

Note: Elements are pre-sorted by relevance to the task. Higher relevance scores indicate stronger matches based on element type, attributes, and text content.

IMPORTANT: Be concise in your analysis. Focus on the most relevant element and provide a direct JSON response.

Please analyze and respond with JSON in this format:
{
  "candidateId": "candidate_X" (if you found a specific element to interact with),
  "confidence": 0.0-1.0,
  "reasoning": "why you chose this element",
  "guidance": "helpful message to user about what to look for or do next"
}`
  }

  /**
   * Call LLM API via background script (to avoid CORS issues)
   */
  private async callLLMAPI(prompt: string): Promise<string | null> {
    try {
      console.log('🔄 Calling LLM API via background script...')
      
      const response = await chrome.runtime.sendMessage({
        type: 'LLM_REQUEST',
        payload: {
          model: 'qwen2.5-coder:7b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2,     // Slightly higher for better JSON generation
            num_predict: 400,     // Reduced since no reasoning overhead
            top_p: 0.9,          // Good balance for structured outputs
            repeat_penalty: 1.1   // Prevent repetition in JSON responses
          }
        }
      })

      console.log('📨 Background script response:', response)

      if (response?.success && response?.data) {
        console.log('🔍 Raw LLM response structure:', response.data)
        console.log('🔍 Response keys:', Object.keys(response.data))
        console.log('🔍 Response.response content:', response.data.response)
        console.log('🔍 Response type:', typeof response.data.response)
        
        return response.data.response
      }
      
      return null
    } catch (error) {
      console.error('LLM API call via background script failed:', error)
      return null
    }
  }

  /**
   * Parse LLM response
   */
  private parseLLMResponse(response: string, candidates: any[]): { element?: Element, guidance?: string } {
    try {
      let cleanedResponse = response.trim()
      
      // Extract JSON from markdown code blocks if present
      let jsonText = cleanedResponse
      if (cleanedResponse.includes('```json')) {
        const match = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/)
        if (match) {
          jsonText = match[1].trim()
        }
      } else if (cleanedResponse.includes('```')) {
        // Fallback: try to extract from any code block
        const match = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/)
        if (match) {
          jsonText = match[1].trim()
        }
      }
      
      // Clean up common JSON issues from LLM responses
      jsonText = jsonText
        .replace(/\n/g, ' ')  // Replace newlines with spaces
        .replace(/\r/g, ' ')  // Replace carriage returns
        .replace(/\t/g, ' ')  // Replace tabs
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      
      console.log('🔧 Cleaned JSON text:', jsonText)
      const parsed = JSON.parse(jsonText)
      console.log('🤖 Smart Detection Guidance:', parsed)
      
      if (parsed.candidateId) {
        console.log(`🔍 Looking for element with candidateId: ${parsed.candidateId}`)
        console.log(`🔍 Available candidates:`, candidates.map(c => c.id))
        
        // Try to find by data attribute first
        let element = document.querySelector(`[data-candidate-id="${parsed.candidateId}"]`)
        console.log(`🔍 Found by data attribute:`, element ? 'YES' : 'NO')
        
        // If not found, try candidates array
        if (!element) {
          const candidate = candidates.find(c => c.id === parsed.candidateId)
          console.log(`🔍 Found in candidates array:`, candidate ? 'YES' : 'NO')
          element = candidate?.element
        }
        
        if (element) {
          console.log('✅ Element found for highlighting:', element)
          return { element }
        } else {
          console.log('❌ Element not found despite valid candidateId')
        }
      }
      
      return { guidance: parsed.guidance || "AI couldn't locate a specific element." }
    } catch (error) {
      console.log('❌ Failed to parse LLM response:', error)
      return { guidance: response.length > 0 ? response.substring(0, 200) : "AI analysis was unclear." }
    }
  }

  /**
   * Utility methods
   */
  private extractPageContext(): string {
    const url = window.location.href
    
    return `URL: ${url}`
  }

  private getElementCandidates(step?: WorkflowStep) {
    const candidates: any[] = []
    const seenSignatures = new Set<string>()
    
    // Much more inclusive selector - get everything that might be interactive
    // Added textarea and contenteditable to catch all input types
    const allSelectors = 'button, a, input, select, textarea, div[contenteditable], div[role="textbox"], span, [role], [tabindex], [onclick], [aria-label]'
    
    console.log('🔍 Starting candidate collection...')
    
    // Collect ALL candidates first
    document.querySelectorAll(allSelectors).forEach((element) => {
      if (!this.isElementVisible(element)) return
      
      const candidate = {
        id: '',  // Will be set after sorting
        element,
        tag: element.tagName.toLowerCase(),
        text: element.textContent?.substring(0, 100) || '',
        attributes: this.getElementAttributes(element),
        relevanceScore: 0
      }
      
      // Calculate relevance score if step context is provided
      if (step) {
        candidate.relevanceScore = this.calculateCandidateRelevance(element, step)
      }
      
      candidates.push(candidate)
    })
    
    // Sort by relevance score (highest first)
    candidates.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    // Deduplicate candidates with similar signatures
    const uniqueCandidates: any[] = []
    
    candidates.forEach(candidate => {
      // Create a signature based on tag, text content, and key attributes
      const signature = this.getCandidateSignature(candidate)
      
      // Skip if we've seen a very similar element
      if (!seenSignatures.has(signature)) {
        seenSignatures.add(signature)
        uniqueCandidates.push(candidate)
      }
    })
    
    // Assign IDs after deduplication
    uniqueCandidates.forEach((candidate, index) => {
      candidate.id = `candidate_${index}`
    })
    
    console.log(`🔍 Total candidates collected: ${candidates.length}`)
    console.log(`🔍 After deduplication: ${uniqueCandidates.length}`)
    console.log(`🎯 Top 5 candidates by relevance:`)
    uniqueCandidates.slice(0, 5).forEach(c => {
      console.log(`  - ${c.id}: score=${c.relevanceScore.toFixed(2)}, tag=${c.tag}, ${c.attributes}`)
    })
    
    return uniqueCandidates.slice(0, 30) // Return top 30 most relevant unique candidates
  }
  
  /**
   * Create a signature for deduplication
   */
  private getCandidateSignature(candidate: any): string {
    const element = candidate.element
    
    // For inputs/buttons with unique IDs or aria-labels, use those
    const ariaLabel = element.getAttribute('aria-label') || ''
    const id = element.id || ''
    const name = element.getAttribute('name') || ''
    
    // If element has unique identifiers, use them
    if (ariaLabel || id || name) {
      return `${candidate.tag}|${ariaLabel}|${id}|${name}`
    }
    
    // For generic divs/spans, use tag + truncated text
    const textSnippet = candidate.text.substring(0, 30).trim()
    return `${candidate.tag}|${textSnippet}`
  }
  
  /**
   * Calculate relevance score for a candidate element based on the step context
   */
  private calculateCandidateRelevance(element: Element, step: WorkflowStep): number {
    let score = 0
    
    const instruction = step.instruction.toLowerCase()
    const target = step.target?.toLowerCase() || ''
    
    // Get element properties
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || ''
    const placeholder = element.getAttribute('placeholder')?.toLowerCase() || ''
    const name = element.getAttribute('name')?.toLowerCase() || ''
    const id = element.id?.toLowerCase() || ''
    const textContent = element.textContent?.toLowerCase()?.trim() || ''
    const tagName = element.tagName.toLowerCase()
    const role = element.getAttribute('role')?.toLowerCase() || ''
    
    // Combine all text for matching
    const elementText = `${ariaLabel} ${placeholder} ${name} ${id} ${textContent}`.toLowerCase()
    
    // Extract key terms from instruction
    const actionWords = this.extractActionWords(instruction)
    const primaryAction = actionWords[0]
    
    // Score based on action-element compatibility
    if (primaryAction) {
      if (primaryAction === 'type' || primaryAction === 'enter' || primaryAction === 'write') {
        // Boost input elements for typing actions
        if (tagName === 'input' || tagName === 'textarea') score += 10
        if (element.hasAttribute('contenteditable')) score += 10
        if (role === 'textbox') score += 10
      } else if (primaryAction === 'click' || primaryAction === 'select') {
        // Boost clickable elements for click actions
        if (tagName === 'button' || tagName === 'a') score += 10
        if (role === 'button') score += 8
      }
    }
    
    // Score based on text matching (extract important words from instruction)
    const importantWords = instruction.split(' ')
      .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'your', 'area'].includes(word))
    
    importantWords.forEach(word => {
      if (elementText.includes(word)) {
        score += 5
        
        // Bonus for exact attribute matches
        if (ariaLabel.includes(word) || placeholder.includes(word) || name.includes(word)) {
          score += 10
        }
      }
    })
    
    // Boost for aria-label that contains multiple instruction words
    const ariaLabelWords = ariaLabel.split(' ')
    let ariaMatchCount = 0
    importantWords.forEach(word => {
      if (ariaLabel.includes(word.toLowerCase())) {
        ariaMatchCount++
      }
    })
    if (ariaMatchCount >= 2) {
      score += ariaMatchCount * 5 // More matches = higher score
    }
    
    // Strong boost for target match
    if (target && elementText.includes(target)) {
      score += 15
    }
    
    // Penalty for hidden or disabled elements
    if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
      score -= 20
    }
    
    return Math.max(0, score)
  }

  private getElementAttributes(element: Element): string {
    const attrs = []
    if (element.id) attrs.push(`id="${element.id}"`)
    if (element.className) attrs.push(`class="${element.className}"`)
    if (element.getAttribute('aria-label')) attrs.push(`aria-label="${element.getAttribute('aria-label')}"`)
    if (element.getAttribute('href')) attrs.push(`href="${element.getAttribute('href')}"`)
    return attrs.join(' ')
  }

  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0
  }

  private isInteractable(element: Element): boolean {
    const tagName = element.tagName.toLowerCase()
    const role = element.getAttribute('role')
    const hasClickHandler = !!(element.getAttribute('onclick') || element.hasAttribute('tabindex'))
    
    return ['button', 'a', 'input', 'select', 'textarea'].includes(tagName) ||
           ['button', 'link', 'menuitem'].includes(role || '') ||
           hasClickHandler
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Highlight found element with VibeLearning styling
   */
  private highlightElement(element: Element) {
    // Clear previous highlights
    document.querySelectorAll('.vibe-smart-highlight').forEach(el => {
      el.classList.remove('vibe-smart-highlight')
    })
    
    // Add highlight to found element
    element.classList.add('vibe-smart-highlight')
    
    // Add CSS if not already present
    if (!document.querySelector('#vibe-smart-detection-styles')) {
      const style = document.createElement('style')
      style.id = 'vibe-smart-detection-styles'
      style.textContent = `
        .vibe-smart-highlight {
          outline: 3px solid #4CAF50 !important;
          outline-offset: 2px !important;
          background-color: rgba(76, 175, 80, 0.1) !important;
          box-shadow: 0 0 10px rgba(76, 175, 80, 0.5) !important;
          animation: vibe-pulse 2s infinite !important;
        }
        
        @keyframes vibe-pulse {
          0% { box-shadow: 0 0 10px rgba(76, 175, 80, 0.5); }
          50% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.8); }
          100% { box-shadow: 0 0 10px rgba(76, 175, 80, 0.5); }
        }
      `
      document.head.appendChild(style)
    }
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /**
   * Communication with sidepanel
   */
  private sendProgressMessage(phase: string, message: string) {
    console.log(`🔍 Smart Detection: ${phase} - ${message}`)
    chrome.runtime.sendMessage({
      type: 'SMART_DETECT_PROGRESS',
      phase,
      message
    })
  }

  private sendSuccessMessage(message: string, element: Element) {
    const elementInfo = {
      tagName: element.tagName,
      className: element.className,
      textContent: element.textContent?.substring(0, 100) || '',
      id: element.id || '',
      attributes: this.getElementAttributes(element)
    }
    
    console.log(`✅ Smart Detection Success: ${message}`, elementInfo)
    chrome.runtime.sendMessage({
      type: 'SMART_DETECT_SUCCESS',
      message,
      elementInfo
    })
  }

  private sendFailureMessage(message: string) {
    console.log(`❌ Smart Detection Failed: ${message}`)
    chrome.runtime.sendMessage({
      type: 'SMART_DETECT_FAILURE',
      message
    })
  }

  private sendGuidanceMessage(guidance: string) {
    console.log(`🤖 Smart Detection Guidance: ${guidance}`)
    chrome.runtime.sendMessage({
      type: 'SMART_DETECT_GUIDANCE',
      guidance
    })
  }
}