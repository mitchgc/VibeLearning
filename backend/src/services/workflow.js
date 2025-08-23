import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WorkflowService {
  constructor(database) {
    this.db = database;
    this.workflows = new Map();
  }

  async loadDefaultWorkflows() {
    try {
      const workflowPath = join(__dirname, '../../../workflows/workday-expense.json');
      const workflowData = await readFile(workflowPath, 'utf-8');
      const workflow = JSON.parse(workflowData);
      
      await this.createWorkflow(workflow);
      console.log('Loaded default workflow:', workflow.name);
    } catch (error) {
      console.error('Failed to load default workflows:', error);
    }
  }

  async getWorkflow(id) {
    if (this.workflows.has(id)) {
      return this.workflows.get(id);
    }

    const workflow = this.db.getWorkflow(id);
    if (workflow) {
      this.workflows.set(id, workflow);
      return workflow;
    }

    return null;
  }

  async createWorkflow(workflowData) {
    const workflow = {
      ...workflowData,
      id: workflowData.id || this.generateId(workflowData.name),
      version: workflowData.version || '1.0.0',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    this.validateWorkflow(workflow);
    
    this.db.saveWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);
    
    return workflow;
  }

  async updateWorkflow(id, updates) {
    const existing = await this.getWorkflow(id);
    if (!existing) {
      throw new Error('Workflow not found');
    }

    const updated = {
      ...existing,
      ...updates,
      id,
      updated_at: Date.now()
    };

    this.validateWorkflow(updated);
    
    this.db.saveWorkflow(updated);
    this.workflows.set(id, updated);
    
    return updated;
  }

  async listWorkflows(filters = {}) {
    return this.db.listWorkflows(filters);
  }

  async cloneWorkflow(id, modifications = {}) {
    const original = await this.getWorkflow(id);
    if (!original) {
      throw new Error('Original workflow not found');
    }

    const cloned = {
      ...original,
      ...modifications,
      id: this.generateId(modifications.name || `${original.name} (Copy)`),
      version: '1.0.0',
      parent_id: id,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    return this.createWorkflow(cloned);
  }

  validateWorkflow(workflow) {
    const required = ['id', 'name', 'platform', 'steps'];
    
    for (const field of required) {
      if (!workflow[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    for (const step of workflow.steps) {
      this.validateStep(step);
    }

    return true;
  }

  validateStep(step) {
    const required = ['id', 'intent', 'instruction'];
    
    for (const field of required) {
      if (!step[field]) {
        throw new Error(`Step missing required field: ${field}`);
      }
    }

    if (step.selectors && !Array.isArray(step.selectors)) {
      throw new Error('Step selectors must be an array');
    }

    if (step.validation && !['element_exists', 'element_contains_text', 'url_matches', 'custom'].includes(step.validation.type)) {
      throw new Error('Invalid validation type');
    }

    return true;
  }

  generateId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async exportWorkflow(id, format = 'json') {
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (format === 'json') {
      return JSON.stringify(workflow, null, 2);
    }

    if (format === 'yaml') {
      return this.toYAML(workflow);
    }

    throw new Error('Unsupported export format');
  }

  async importWorkflow(data, format = 'json') {
    let workflow;
    
    if (format === 'json') {
      workflow = typeof data === 'string' ? JSON.parse(data) : data;
    } else if (format === 'yaml') {
      workflow = this.fromYAML(data);
    } else {
      throw new Error('Unsupported import format');
    }

    return this.createWorkflow(workflow);
  }

  toYAML(obj) {
    return JSON.stringify(obj, null, 2);
  }

  fromYAML(yaml) {
    return JSON.parse(yaml);
  }

  async getWorkflowStats(id) {
    const stats = this.db.getCompletionStats({ workflowId: id });
    
    return {
      totalRuns: stats.total_completions || 0,
      successRate: stats.total_completions > 0 
        ? (stats.successful / stats.total_completions) * 100 
        : 0,
      averageDuration: stats.avg_duration || 0,
      averageSteps: stats.avg_steps || 0
    };
  }

  async optimizeWorkflow(id) {
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const stats = await this.getWorkflowStats(id);
    const optimizations = [];

    if (stats.successRate < 80) {
      optimizations.push({
        type: 'low_success_rate',
        message: 'Consider adding more robust selectors or validation steps'
      });
    }

    if (stats.averageDuration > 600000) {
      optimizations.push({
        type: 'slow_completion',
        message: 'Workflow takes too long, consider breaking into smaller workflows'
      });
    }

    for (const step of workflow.steps) {
      if (!step.selectors || step.selectors.length < 2) {
        optimizations.push({
          type: 'insufficient_selectors',
          stepId: step.id,
          message: `Step "${step.id}" should have multiple selector fallbacks`
        });
      }
    }

    return optimizations;
  }
}