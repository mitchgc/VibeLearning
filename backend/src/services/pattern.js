export class PatternService {
  constructor(database) {
    this.db = database;
    this.cache = new Map();
  }

  async savePattern(pattern) {
    const result = this.db.savePattern(pattern);
    
    this.invalidateCache(pattern.intent, pattern.companyId);
    
    return {
      ...pattern,
      id: result.lastInsertRowid
    };
  }

  async findPattern(criteria) {
    const cacheKey = this.getCacheKey(criteria);
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.expires > Date.now()) {
        return cached.data;
      }
    }

    const pattern = this.db.findPattern(criteria);
    
    if (pattern) {
      this.cache.set(cacheKey, {
        data: pattern,
        expires: Date.now() + 300000
      });
    }
    
    return pattern;
  }

  async getPatterns(filters = {}) {
    let sql = 'SELECT * FROM patterns WHERE 1=1';
    const params = [];
    
    if (filters.intent) {
      sql += ' AND intent = ?';
      params.push(filters.intent);
    }
    
    if (filters.companyId) {
      sql += ' AND company_id = ?';
      params.push(filters.companyId);
    }
    
    sql += ' ORDER BY confidence DESC, success_count DESC LIMIT 50';
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async updatePatternFeedback(patternId, success) {
    this.db.updatePatternSuccess(patternId, success);
    
    this.cache.clear();
    
    return { updated: true };
  }

  async mergePatterns(patterns) {
    const merged = new Map();
    
    for (const pattern of patterns) {
      const key = `${pattern.intent}_${pattern.selector}`;
      
      if (merged.has(key)) {
        const existing = merged.get(key);
        existing.confidence = Math.max(existing.confidence, pattern.confidence);
        existing.success_count += pattern.success_count || 0;
        existing.failure_count += pattern.failure_count || 0;
      } else {
        merged.set(key, { ...pattern });
      }
    }
    
    return Array.from(merged.values());
  }

  async analyzePatternEffectiveness(intent, companyId) {
    const patterns = await this.getPatterns({ intent, companyId });
    
    const analysis = patterns.map(pattern => {
      const total = pattern.success_count + pattern.failure_count;
      const effectiveness = total > 0 ? pattern.success_count / total : 0;
      
      return {
        ...pattern,
        effectiveness,
        total_uses: total,
        recommendation: this.getRecommendation(effectiveness, total)
      };
    });
    
    return analysis.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  getRecommendation(effectiveness, totalUses) {
    if (totalUses < 5) {
      return 'needs_more_data';
    }
    
    if (effectiveness > 0.9) {
      return 'highly_effective';
    } else if (effectiveness > 0.7) {
      return 'effective';
    } else if (effectiveness > 0.5) {
      return 'moderate';
    } else {
      return 'needs_improvement';
    }
  }

  async cleanupPatterns(daysOld = 90) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const stmt = this.db.prepare(`
      DELETE FROM patterns 
      WHERE updated_at < ? 
      AND success_count < 5
    `);
    
    const result = stmt.run(Math.floor(cutoffTime / 1000));
    
    this.cache.clear();
    
    return { deleted: result.changes };
  }

  getCacheKey(criteria) {
    return `${criteria.intent}_${criteria.companyId || 'default'}_${criteria.url || ''}`;
  }

  invalidateCache(intent, companyId) {
    for (const [key, value] of this.cache.entries()) {
      if (key.includes(intent) || (companyId && key.includes(companyId))) {
        this.cache.delete(key);
      }
    }
  }

  async exportPatterns(companyId) {
    const patterns = await this.getPatterns({ companyId });
    
    return {
      companyId,
      exportDate: Date.now(),
      patterns: patterns.map(p => ({
        intent: p.intent,
        selector: p.selector,
        confidence: p.confidence,
        url: p.url
      }))
    };
  }

  async importPatterns(data) {
    const imported = [];
    
    for (const pattern of data.patterns) {
      try {
        const result = await this.savePattern({
          ...pattern,
          companyId: data.companyId
        });
        imported.push(result);
      } catch (error) {
        console.error('Failed to import pattern:', error);
      }
    }
    
    return {
      imported: imported.length,
      total: data.patterns.length
    };
  }
}