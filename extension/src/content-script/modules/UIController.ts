/**
 * UI Controller Module - Handles element highlighting, overlays, and visual feedback
 * Uses modern DOM APIs and optimized selectors
 */

export default class UIController {
  private highlightedElements = new Set<Element>()
  private overlay: HTMLElement | null = null

  async init() {
    console.log('UIController initialized')
  }

  async destroy() {
    await this.clearHighlights()
    this.removeOverlay()
    console.log('UIController destroyed')
  }

  /**
   * Highlight element with modern selector strategies
   */
  async highlightElement(selector: string): Promise<boolean> {
    try {
      // Clear previous highlights
      await this.clearHighlights()

      // Try multiple selector strategies
      const element = this.findElementWithStrategies(selector)
      
      if (!element) {
        console.warn(`Element not found: ${selector}`)
        return false
      }

      // Check if element is visible and interactable
      if (!this.isElementInteractable(element)) {
        console.warn(`Element not interactable: ${selector}`)
        return false
      }

      // Apply highlight
      element.classList.add('vibe-highlight')
      this.highlightedElements.add(element)

      // Smooth scroll to element
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      })

      // Show overlay for better focus
      this.showOverlay(element)

      console.log(`✓ Highlighted element: ${selector}`)
      return true

    } catch (error) {
      console.error('Error highlighting element:', error)
      return false
    }
  }

  /**
   * Advanced element finding with multiple strategies
   */
  private findElementWithStrategies(selector: string): Element | null {
    // Strategy 1: Direct selector
    let element = document.querySelector(selector)
    if (element && this.isElementVisible(element)) {
      return element
    }

    // Strategy 2: CSS escaping for complex selectors
    try {
      const escapedSelector = CSS.escape(selector)
      element = document.querySelector(`[id="${escapedSelector}"]`)
      if (element && this.isElementVisible(element)) {
        return element
      }
    } catch (e) {
      // CSS.escape failed, continue
    }

    // Strategy 3: Attribute-based search
    element = document.querySelector(`[data-testid="${selector}"]`)
    if (element && this.isElementVisible(element)) {
      return element
    }

    // Strategy 4: Text content search (last resort)
    const textElements = document.querySelectorAll('button, a, [role="button"], [role="link"]')
    for (const el of textElements) {
      if (el.textContent?.trim().toLowerCase().includes(selector.toLowerCase()) && 
          this.isElementVisible(el)) {
        return el
      }
    }

    return null
  }

  /**
   * Check if element is visible using modern APIs
   */
  private isElementVisible(element: Element): boolean {
    // Use Intersection Observer API for accurate visibility detection
    const rect = element.getBoundingClientRect()
    
    // Basic visibility checks
    if (rect.width === 0 || rect.height === 0) return false
    if (rect.bottom < 0 || rect.top > window.innerHeight) return false
    if (rect.right < 0 || rect.left > window.innerWidth) return false

    // Check CSS visibility
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || 
        style.visibility === 'hidden' || 
        style.opacity === '0') {
      return false
    }

    return true
  }

  /**
   * Check if element can be interacted with
   */
  private isElementInteractable(element: Element): boolean {
    if (!this.isElementVisible(element)) return false

    const style = window.getComputedStyle(element)
    return style.pointerEvents !== 'none' && 
           !element.hasAttribute('disabled') &&
           !element.getAttribute('aria-disabled')
  }

  /**
   * Show overlay to focus attention
   */
  private showOverlay(targetElement: Element) {
    this.removeOverlay()

    this.overlay = document.createElement('div')
    this.overlay.className = 'vibe-overlay'
    
    // Create cutout for the target element
    const rect = targetElement.getBoundingClientRect()
    this.overlay.style.clipPath = `polygon(
      0% 0%, 
      0% 100%, 
      ${rect.left - 10}px 100%, 
      ${rect.left - 10}px ${rect.top - 10}px, 
      ${rect.right + 10}px ${rect.top - 10}px, 
      ${rect.right + 10}px ${rect.bottom + 10}px, 
      ${rect.left - 10}px ${rect.bottom + 10}px, 
      ${rect.left - 10}px 100%, 
      100% 100%, 
      100% 0%
    )`
    
    document.body.appendChild(this.overlay)
    
    // Animate in
    requestAnimationFrame(() => {
      this.overlay?.classList.add('visible')
    })

    // Auto-remove after 3 seconds
    setTimeout(() => {
      this.removeOverlay()
    }, 3000)
  }

  /**
   * Remove overlay
   */
  private removeOverlay() {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  /**
   * Clear all highlights
   */
  async clearHighlights() {
    for (const element of this.highlightedElements) {
      element.classList.remove('vibe-highlight')
    }
    this.highlightedElements.clear()
    this.removeOverlay()
  }

  /**
   * Get highlighted elements (for debugging)
   */
  getHighlightedElements(): Element[] {
    return Array.from(this.highlightedElements)
  }
}