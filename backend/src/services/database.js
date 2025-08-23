import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseService {
  constructor() {
    const dbPath = join(__dirname, '../../database/vibelearning.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async initialize() {
    this.createTables();
    this.createIndexes();
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        platform TEXT NOT NULL,
        version TEXT,
        difficulty TEXT,
        description TEXT,
        steps TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        intent TEXT NOT NULL,
        selector TEXT NOT NULL,
        company_id TEXT,
        url TEXT,
        confidence REAL DEFAULT 1.0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id TEXT NOT NULL,
        company_id TEXT,
        user_id TEXT,
        duration INTEGER,
        steps_completed INTEGER,
        success BOOLEAN,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS element_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT UNIQUE NOT NULL,
        selector TEXT NOT NULL,
        intent TEXT,
        confidence REAL,
        last_verified INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        expires_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id TEXT,
        step_id TEXT,
        type TEXT,
        message TEXT,
        user_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        event_data TEXT,
        company_id TEXT,
        user_id TEXT,
        session_id TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
  }

  createIndexes() {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_patterns_intent ON patterns(intent);
      CREATE INDEX IF NOT EXISTS idx_patterns_company ON patterns(company_id);
      CREATE INDEX IF NOT EXISTS idx_completions_workflow ON completions(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_completions_company ON completions(company_id);
      CREATE INDEX IF NOT EXISTS idx_element_cache_key ON element_cache(cache_key);
      CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics(session_id);
    `);
  }

  prepare(sql) {
    return this.db.prepare(sql);
  }

  transaction(fn) {
    return this.db.transaction(fn);
  }

  close() {
    this.db.close();
  }

  getWorkflow(id) {
    const stmt = this.prepare('SELECT * FROM workflows WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      row.steps = JSON.parse(row.steps);
    }
    return row;
  }

  saveWorkflow(workflow) {
    const stmt = this.prepare(`
      INSERT OR REPLACE INTO workflows 
      (id, name, platform, version, difficulty, description, steps, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `);
    
    return stmt.run(
      workflow.id,
      workflow.name,
      workflow.platform,
      workflow.version,
      workflow.difficulty,
      workflow.description,
      JSON.stringify(workflow.steps)
    );
  }

  listWorkflows(filters = {}) {
    let sql = 'SELECT id, name, platform, difficulty, description FROM workflows WHERE 1=1';
    const params = [];
    
    if (filters.platform) {
      sql += ' AND platform = ?';
      params.push(filters.platform);
    }
    
    if (filters.search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const stmt = this.prepare(sql);
    return stmt.all(...params);
  }

  savePattern(pattern) {
    const stmt = this.prepare(`
      INSERT INTO patterns 
      (intent, selector, company_id, url, confidence)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      pattern.intent,
      pattern.selector,
      pattern.companyId,
      pattern.url,
      pattern.confidence || 1.0
    );
  }

  findPattern(criteria) {
    let sql = 'SELECT * FROM patterns WHERE intent = ?';
    const params = [criteria.intent];
    
    if (criteria.companyId) {
      sql += ' AND company_id = ?';
      params.push(criteria.companyId);
    }
    
    if (criteria.url) {
      sql += ' AND url LIKE ?';
      params.push(`%${new URL(criteria.url).pathname}%`);
    }
    
    sql += ' ORDER BY confidence DESC, success_count DESC LIMIT 1';
    
    const stmt = this.prepare(sql);
    return stmt.get(...params);
  }

  updatePatternSuccess(id, success) {
    const column = success ? 'success_count' : 'failure_count';
    const stmt = this.prepare(`
      UPDATE patterns 
      SET ${column} = ${column} + 1,
          confidence = CAST(success_count AS REAL) / (success_count + failure_count + 1),
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    
    return stmt.run(id);
  }

  saveCompletion(completion) {
    const stmt = this.prepare(`
      INSERT INTO completions 
      (workflow_id, company_id, user_id, duration, steps_completed, success)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      completion.workflowId,
      completion.companyId,
      completion.userId,
      completion.duration,
      completion.stepsCompleted,
      completion.success ? 1 : 0
    );
  }

  getCompletionStats(filters = {}) {
    let sql = `
      SELECT 
        COUNT(*) as total_completions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        AVG(duration) as avg_duration,
        AVG(steps_completed) as avg_steps
      FROM completions
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.workflowId) {
      sql += ' AND workflow_id = ?';
      params.push(filters.workflowId);
    }
    
    if (filters.companyId) {
      sql += ' AND company_id = ?';
      params.push(filters.companyId);
    }
    
    if (filters.startDate) {
      sql += ' AND created_at >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND created_at <= ?';
      params.push(filters.endDate);
    }
    
    const stmt = this.prepare(sql);
    return stmt.get(...params);
  }

  cacheElement(key, selector, intent, confidence, ttl = 3600) {
    const stmt = this.prepare(`
      INSERT OR REPLACE INTO element_cache 
      (cache_key, selector, intent, confidence, last_verified, expires_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'), ?)
    `);
    
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    return stmt.run(key, selector, intent, confidence, expiresAt);
  }

  getCachedElement(key) {
    const stmt = this.prepare(`
      SELECT * FROM element_cache 
      WHERE cache_key = ? 
      AND expires_at > strftime('%s', 'now')
    `);
    
    return stmt.get(key);
  }

  cleanExpiredCache() {
    const stmt = this.prepare(`
      DELETE FROM element_cache 
      WHERE expires_at <= strftime('%s', 'now')
    `);
    
    return stmt.run();
  }

  saveFeedback(feedback) {
    const stmt = this.prepare(`
      INSERT INTO feedback 
      (workflow_id, step_id, type, message, user_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      feedback.workflowId,
      feedback.stepId,
      feedback.type,
      feedback.message,
      feedback.userId
    );
  }

  recordAnalytics(event) {
    const stmt = this.prepare(`
      INSERT INTO analytics 
      (event_type, event_data, company_id, user_id, session_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      event.type,
      JSON.stringify(event.data),
      event.companyId,
      event.userId,
      event.sessionId
    );
  }

  getAnalyticsSummary(filters = {}) {
    const sql = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as sessions
      FROM analytics
      WHERE created_at >= ? AND created_at <= ?
      ${filters.companyId ? 'AND company_id = ?' : ''}
      GROUP BY event_type
      ORDER BY count DESC
    `;
    
    const params = [
      filters.startDate || 0,
      filters.endDate || Math.floor(Date.now() / 1000)
    ];
    
    if (filters.companyId) {
      params.push(filters.companyId);
    }
    
    const stmt = this.prepare(sql);
    return stmt.all(...params);
  }
}