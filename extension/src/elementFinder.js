export class UniversalElementFinder {
  constructor() {
    this.strategies = [
      new DirectSelectorStrategy(),
      new FuzzyTextMatchStrategy(),
      new CachedPatternStrategy(),
      new AttributeMatchStrategy(),
      new AIStrategy()
    ];
    this.cache = new Map();
  }

  async find(page, intent, context) {
    const cacheKey = `${intent}_${window.location.pathname}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const element = document.querySelector(cached.selector);
      if (element && await this.verify(element, intent)) {
        return { element, selector: cached.selector, strategy: 'cache' };
      }
    }

    for (const strategy of this.strategies) {
      try {
        const result = await strategy.find(page, intent, context);
        if (result && await this.verify(result.element, intent)) {
          this.recordSuccess(strategy, intent, result);
          return result;
        }
      } catch (error) {
        console.error(`Strategy ${strategy.name} failed:`, error);
      }
    }

    return await this.learnFromUser(intent);
  }

  async verify(element, intent) {
    if (!element) return false;
    
    const isVisible = element.offsetParent !== null;
    const isEnabled = !element.disabled && !element.hasAttribute('disabled');
    const isInteractive = element.tagName.match(/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/i) ||
                         element.hasAttribute('onclick') ||
                         element.style.cursor === 'pointer';

    return isVisible && isEnabled && (isInteractive || intent.includes('view'));
  }

  recordSuccess(strategy, intent, result) {
    const cacheKey = `${intent}_${window.location.pathname}`;
    this.cache.set(cacheKey, {
      selector: result.selector,
      strategy: strategy.name,
      timestamp: Date.now()
    });

    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  async learnFromUser(intent) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'vibe-element-selector-overlay';
      overlay.innerHTML = `
        <div class="vibe-selector-prompt">
          <p>Please click on: "${intent}"</p>
          <button class="vibe-cancel-selector">Cancel</button>
        </div>
      `;
      document.body.appendChild(overlay);

      const handleClick = (event) => {
        if (event.target.closest('.vibe-element-selector-overlay')) {
          cleanup();
          resolve(null);
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const element = event.target;
        const selector = this.generateUniqueSelector(element);
        
        cleanup();
        resolve({ element, selector, strategy: 'user-taught' });
      };

      const cleanup = () => {
        document.removeEventListener('click', handleClick, true);
        overlay.remove();
      };

      document.addEventListener('click', handleClick, true);
    });
  }

  generateUniqueSelector(element) {
    const attributes = ['id', 'data-automation-id', 'data-testid', 'aria-label'];
    
    for (const attr of attributes) {
      const value = element.getAttribute(attr);
      if (value) {
        const selector = `[${attr}="${value}"]`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c && !c.startsWith('vibe-'));
      if (classes.length > 0) {
        const selector = `.${classes.join('.')}`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }

    return this.getPathSelector(element);
  }

  getPathSelector(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }

      const parent = current.parentElement;
      if (parent) {
        const children = Array.from(parent.children);
        const index = children.indexOf(current);
        
        if (children.filter(child => child.tagName === current.tagName).length > 1) {
          selector += `:nth-of-type(${index + 1})`;
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }
}

class DirectSelectorStrategy {
  constructor() {
    this.name = 'DirectSelector';
    this.commonPatterns = {
      'expense_report': [
        '[data-automation-id="expenses"]',
        '[aria-label*="expense"]',
        'button:contains("Expense")',
        'a[href*="expense"]'
      ],
      'create_new': [
        '[data-automation-id="create"]',
        'button:contains("Create")',
        'button:contains("New")',
        '[aria-label*="create"]'
      ],
      'submit': [
        'button[type="submit"]',
        'button:contains("Submit")',
        '[data-automation-id="submit"]',
        'input[type="submit"]'
      ]
    };
  }

  async find(page, intent, context) {
    const patterns = this.commonPatterns[intent] || [];
    
    for (const pattern of patterns) {
      try {
        const element = document.querySelector(pattern) || 
                       this.findByText(pattern);
        
        if (element) {
          return { element, selector: pattern, strategy: this.name };
        }
      } catch (e) {
        continue;
      }
    }
    
    return null;
  }

  findByText(pattern) {
    if (!pattern.includes('contains')) return null;
    
    const match = pattern.match(/:contains\("(.+?)"\)/);
    if (!match) return null;
    
    const text = match[1];
    const tagMatch = pattern.match(/^(\w+)/);
    const tagName = tagMatch ? tagMatch[1].toUpperCase() : '*';
    
    const elements = document.querySelectorAll(tagName);
    return Array.from(elements).find(el => 
      el.textContent.toLowerCase().includes(text.toLowerCase())
    );
  }
}

class FuzzyTextMatchStrategy {
  constructor() {
    this.name = 'FuzzyTextMatch';
  }

  async find(page, intent, context) {
    const keywords = this.extractKeywords(intent);
    const candidates = this.getCandidateElements();
    
    let bestMatch = null;
    let bestScore = 0;

    for (const element of candidates) {
      const score = this.calculateScore(element, keywords);
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = element;
      }
    }

    if (bestMatch) {
      return {
        element: bestMatch,
        selector: this.generateSelector(bestMatch),
        strategy: this.name
      };
    }

    return null;
  }

  extractKeywords(intent) {
    return intent.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with'].includes(word));
  }

  getCandidateElements() {
    const interactiveSelectors = [
      'button', 'a', 'input', 'select', 
      '[role="button"]', '[onclick]', '[tabindex]'
    ];
    
    const elements = [];
    interactiveSelectors.forEach(selector => {
      elements.push(...document.querySelectorAll(selector));
    });
    
    return elements;
  }

  calculateScore(element, keywords) {
    const text = (element.textContent || '').toLowerCase();
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    const title = (element.getAttribute('title') || '').toLowerCase();
    const combinedText = `${text} ${ariaLabel} ${title}`;

    let score = 0;
    let matchedKeywords = 0;

    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        matchedKeywords++;
        score += 1 / keywords.length;
      }
    }

    if (matchedKeywords === keywords.length) {
      score += 0.5;
    }

    return score;
  }

  generateSelector(element) {
    if (element.id) return `#${element.id}`;
    
    const tag = element.tagName.toLowerCase();
    const text = element.textContent.trim().substring(0, 30);
    
    if (text) {
      return `${tag}:contains("${text}")`;
    }
    
    return tag;
  }
}

class CachedPatternStrategy {
  constructor() {
    this.name = 'CachedPattern';
  }

  async find(page, intent, context) {
    const patterns = await this.getStoredPatterns(intent);
    
    for (const pattern of patterns) {
      const element = document.querySelector(pattern.selector);
      if (element) {
        return {
          element,
          selector: pattern.selector,
          strategy: this.name
        };
      }
    }

    return null;
  }

  async getStoredPatterns(intent) {
    try {
      const stored = await chrome.storage.local.get('patterns');
      const patterns = stored.patterns || [];
      
      return patterns
        .filter(p => p.intent === intent || this.isSimilarIntent(p.intent, intent))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
    } catch (error) {
      return [];
    }
  }

  isSimilarIntent(intent1, intent2) {
    const words1 = intent1.toLowerCase().split(/\s+/);
    const words2 = intent2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(w => words2.includes(w));
    const similarity = intersection.length / Math.max(words1.length, words2.length);
    
    return similarity > 0.6;
  }
}

class AttributeMatchStrategy {
  constructor() {
    this.name = 'AttributeMatch';
  }

  async find(page, intent, context) {
    const attributes = this.getRelevantAttributes(intent);
    
    for (const attr of attributes) {
      const elements = document.querySelectorAll(`[${attr.name}*="${attr.value}"]`);
      
      if (elements.length === 1) {
        return {
          element: elements[0],
          selector: `[${attr.name}*="${attr.value}"]`,
          strategy: this.name
        };
      }
      
      if (elements.length > 1) {
        const bestMatch = this.selectBestMatch(elements, intent);
        if (bestMatch) {
          return {
            element: bestMatch,
            selector: this.generateSelector(bestMatch),
            strategy: this.name
          };
        }
      }
    }

    return null;
  }

  getRelevantAttributes(intent) {
    const keywords = intent.toLowerCase().split(/\s+/);
    const attributes = [];

    keywords.forEach(keyword => {
      attributes.push(
        { name: 'data-automation-id', value: keyword },
        { name: 'aria-label', value: keyword },
        { name: 'data-testid', value: keyword },
        { name: 'name', value: keyword },
        { name: 'placeholder', value: keyword }
      );
    });

    return attributes;
  }

  selectBestMatch(elements, intent) {
    const visible = Array.from(elements).filter(el => el.offsetParent !== null);
    
    if (visible.length === 1) return visible[0];
    
    const keywords = intent.toLowerCase().split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;

    visible.forEach(element => {
      let score = 0;
      const text = element.textContent.toLowerCase();
      
      keywords.forEach(keyword => {
        if (text.includes(keyword)) score++;
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = element;
      }
    });

    return bestMatch;
  }

  generateSelector(element) {
    const attrs = ['data-automation-id', 'aria-label', 'data-testid'];
    
    for (const attr of attrs) {
      const value = element.getAttribute(attr);
      if (value) {
        return `[${attr}="${value}"]`;
      }
    }

    return element.tagName.toLowerCase();
  }
}

class AIStrategy {
  constructor() {
    this.name = 'AI';
    this.apiEndpoint = 'http://localhost:3000/api/element-finder';
  }

  async find(page, intent, context) {
    try {
      const pageContext = this.extractPageContext();
      const candidates = this.extractCandidates();

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          pageContext,
          candidates,
          url: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const result = await response.json();
      
      if (result.selector) {
        const element = document.querySelector(result.selector);
        if (element) {
          return {
            element,
            selector: result.selector,
            strategy: this.name
          };
        }
      }
    } catch (error) {
      console.error('AI strategy failed:', error);
    }

    return null;
  }

  extractPageContext() {
    return {
      title: document.title,
      url: window.location.href,
      headings: Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 5)
        .map(h => h.textContent.trim()),
      activeElement: document.activeElement?.tagName
    };
  }

  extractCandidates() {
    const selectors = [
      'button', 'a', 'input', 'select',
      '[role="button"]', '[onclick]'
    ];

    const candidates = [];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      Array.from(elements).slice(0, 10).forEach((el, index) => {
        if (el.offsetParent !== null) {
          candidates.push({
            index: candidates.length,
            tag: el.tagName,
            text: el.textContent?.trim().substring(0, 50),
            attributes: {
              id: el.id,
              class: el.className,
              'aria-label': el.getAttribute('aria-label'),
              'data-automation-id': el.getAttribute('data-automation-id')
            }
          });
        }
      });
    });

    return candidates.slice(0, 50);
  }
}