import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { DatabaseService } from './services/database.js';
import { ElementFinderService } from './services/elementFinder.js';
import { WorkflowService } from './services/workflow.js';
import { PatternService } from './services/pattern.js';
import { AnalyticsService } from './services/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const db = new DatabaseService();
const elementFinder = new ElementFinderService();
const workflowService = new WorkflowService(db);
const patternService = new PatternService(db);
const analyticsService = new AnalyticsService(db);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

app.get('/api/workflows/:id', async (req, res) => {
  try {
    const workflow = await workflowService.getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/workflows', async (req, res) => {
  try {
    const { platform, search } = req.query;
    const workflows = await workflowService.listWorkflows({ platform, search });
    res.json(workflows);
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/workflows', async (req, res) => {
  try {
    const workflow = await workflowService.createWorkflow(req.body);
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/element-finder', async (req, res) => {
  try {
    const { intent, context, url, companyId } = req.body;
    
    const cachedPattern = await patternService.findPattern({
      intent,
      companyId,
      url
    });
    
    if (cachedPattern) {
      return res.json({ 
        selector: cachedPattern.selector,
        confidence: cachedPattern.confidence,
        source: 'cache'
      });
    }
    
    const result = await elementFinder.findElement({
      intent,
      context,
      url,
      companyId
    });
    
    if (result.selector) {
      await patternService.savePattern({
        intent,
        selector: result.selector,
        companyId,
        url,
        confidence: result.confidence
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error finding element:', error);
    res.status(500).json({ error: 'Element finder error' });
  }
});

app.post('/api/patterns', async (req, res) => {
  try {
    const pattern = await patternService.savePattern(req.body);
    res.status(201).json(pattern);
  } catch (error) {
    console.error('Error saving pattern:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/patterns', async (req, res) => {
  try {
    const { intent, companyId } = req.query;
    const patterns = await patternService.getPatterns({ intent, companyId });
    res.json(patterns);
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/completions', async (req, res) => {
  try {
    const completion = await analyticsService.recordCompletion(req.body);
    res.status(201).json(completion);
  } catch (error) {
    console.error('Error recording completion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/analytics/summary', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;
    const summary = await analyticsService.getSummary({
      companyId,
      startDate,
      endDate
    });
    res.json(summary);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const feedback = await analyticsService.recordFeedback(req.body);
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function initialize() {
  try {
    await db.initialize();
    console.log('Database initialized');
    
    await workflowService.loadDefaultWorkflows();
    console.log('Default workflows loaded');
    
    app.listen(PORT, () => {
      console.log(`VibeLearning backend running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

initialize();