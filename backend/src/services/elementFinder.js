import crypto from 'crypto';

export class ElementFinderService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
    this.useOllama = true;
    
    this.strategies = [
      this.directMatch.bind(this),
      this.fuzzyMatch.bind(this),
      this.aiMatch.bind(this)
    ];
  }

  async findElement({ intent, context, url, companyId }) {
    const cacheKey = this.generateCacheKey(intent, url, companyId);
    
    for (const strategy of this.strategies) {
      try {
        const result = await strategy({ intent, context, url, companyId });
        if (result && result.selector) {
          result.cacheKey = cacheKey;
          return result;
        }
      } catch (error) {
        console.error('Strategy failed:', error);
      }
    }
    
    return { selector: null, confidence: 0, source: 'not_found' };
  }

  generateCacheKey(intent, url, companyId) {
    const data = `${intent}_${url}_${companyId || 'default'}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  async directMatch({ intent, context }) {
    const directMappings = {
      'open_expense_module': [
        '[data-automation-id="expenses"]',
        '[aria-label*="Expenses"]',
        'button[title*="Expenses"]'
      ],
      'create_new_expense': [
        '[data-automation-id="createExpenseReport"]',
        'button[aria-label="Create Expense Report"]'
      ],
      'submit': [
        'button[type="submit"]',
        '[data-automation-id="submit"]'
      ]
    };

    const selectors = directMappings[intent];
    if (selectors && selectors.length > 0) {
      return {
        selector: selectors[0],
        alternates: selectors.slice(1),
        confidence: 0.9,
        source: 'direct_match'
      };
    }

    return null;
  }

  async fuzzyMatch({ intent, context }) {
    const keywords = this.extractKeywords(intent);
    
    const patterns = [
      `[aria-label*="${keywords[0]}"]`,
      `button:contains("${keywords[0]}")`,
      `[data-automation-id*="${keywords[0]}"]`,
      `a[href*="${keywords[0]}"]`
    ];

    if (patterns.length > 0) {
      return {
        selector: patterns[0],
        alternates: patterns.slice(1),
        confidence: 0.7,
        source: 'fuzzy_match',
        keywords
      };
    }

    return null;
  }

  async aiMatch({ intent, context, url }) {
    if (!this.useOllama) {
      console.log('Ollama not configured, skipping AI match');
      return null;
    }

    try {
      const prompt = this.buildAIPrompt(intent, context, url);
      
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: `System: You are an expert at finding UI elements in web applications. Return only valid CSS selectors.\n\nUser: ${prompt}`,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 150
          }
        })
      });

      const data = await response.json();
      const aiResponse = data.response;
      const selector = this.extractSelector(aiResponse);

      if (selector) {
        return {
          selector,
          confidence: 0.6,
          source: 'ai_match_ollama'
        };
      }
    } catch (error) {
      console.error('AI match failed:', error);
    }

    return null;
  }

  buildAIPrompt(intent, context, url) {
    return `
      Task: Find CSS selector for "${intent}"
      URL: ${url}
      Context: ${JSON.stringify(context?.pageContext || {})}
      
      Provide the most likely CSS selector for this element.
      Consider common patterns in enterprise applications like Workday, Salesforce, etc.
      Return only the selector, no explanation.
    `;
  }

  extractSelector(response) {
    // Try to find CSS selectors in various formats
    const patterns = [
      /button\[type="submit"\]/i,
      /input\[type="submit"\]/i,
      /[\[\]\.#][^\s,"\)]+/g,
      /[a-zA-Z]+\[[^\]]+\]/g,
      /\.[a-zA-Z\-_][a-zA-Z0-9\-_]*/g,
      /#[a-zA-Z\-_][a-zA-Z0-9\-_]*/g
    ];
    
    for (const pattern of patterns) {
      const matches = response.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    
    return null;
  }

  extractKeywords(intent) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    
    return intent
      .toLowerCase()
      .split(/[\s_]+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  async validateSelector(selector, expectedBehavior) {
    const validationRules = {
      clickable: ['button', 'a', '[role="button"]', '[onclick]'],
      input: ['input', 'textarea', 'select'],
      visible: [':visible', ':not([hidden])']
    };

    const rules = validationRules[expectedBehavior] || [];
    
    for (const rule of rules) {
      if (selector.includes(rule) || selector.startsWith(rule)) {
        return true;
      }
    }

    return false;
  }

  combineSelectors(selectors) {
    return selectors.filter(Boolean).join(', ');
  }

  async learnFromFeedback(intent, selector, success, context) {
    const feedback = {
      intent,
      selector,
      success,
      context,
      timestamp: Date.now()
    };

    console.log('Learning from feedback:', feedback);
    
    return { learned: true };
  }
}