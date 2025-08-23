export class AnalyticsService {
  constructor(database) {
    this.db = database;
  }

  async recordCompletion(data) {
    const completion = {
      workflowId: data.workflowId,
      companyId: data.companyId,
      userId: data.userId || 'anonymous',
      duration: data.duration,
      stepsCompleted: data.steps?.length || 0,
      success: data.success !== false
    };

    this.db.saveCompletion(completion);

    await this.recordEvent({
      type: 'workflow_completion',
      data: completion,
      companyId: data.companyId,
      userId: data.userId,
      sessionId: data.sessionId
    });

    return { recorded: true };
  }

  async recordEvent(event) {
    return this.db.recordAnalytics(event);
  }

  async recordFeedback(feedback) {
    this.db.saveFeedback(feedback);

    await this.recordEvent({
      type: 'user_feedback',
      data: feedback,
      companyId: feedback.companyId,
      userId: feedback.userId
    });

    return { recorded: true };
  }

  async getSummary(filters = {}) {
    const completionStats = this.db.getCompletionStats(filters);
    const analyticsEvents = this.db.getAnalyticsSummary(filters);

    const summary = {
      period: {
        start: filters.startDate || 'all-time',
        end: filters.endDate || 'current'
      },
      completions: {
        total: completionStats.total_completions || 0,
        successful: completionStats.successful || 0,
        successRate: completionStats.total_completions > 0
          ? ((completionStats.successful / completionStats.total_completions) * 100).toFixed(2)
          : 0,
        averageDuration: Math.round(completionStats.avg_duration || 0),
        averageSteps: Math.round(completionStats.avg_steps || 0)
      },
      events: analyticsEvents,
      insights: await this.generateInsights(completionStats, analyticsEvents)
    };

    return summary;
  }

  async generateInsights(completionStats, events) {
    const insights = [];

    if (completionStats.total_completions > 0) {
      const successRate = (completionStats.successful / completionStats.total_completions) * 100;
      
      if (successRate < 70) {
        insights.push({
          type: 'warning',
          message: 'Success rate is below 70%. Consider reviewing workflow difficulty.',
          metric: `${successRate.toFixed(1)}%`
        });
      } else if (successRate > 90) {
        insights.push({
          type: 'success',
          message: 'Excellent success rate! Users are completing workflows effectively.',
          metric: `${successRate.toFixed(1)}%`
        });
      }
    }

    if (completionStats.avg_duration > 600000) {
      insights.push({
        type: 'info',
        message: 'Average completion time exceeds 10 minutes. Consider breaking down complex workflows.',
        metric: `${Math.round(completionStats.avg_duration / 60000)} minutes`
      });
    }

    const errorEvents = events.find(e => e.event_type === 'error');
    if (errorEvents && errorEvents.count > 10) {
      insights.push({
        type: 'warning',
        message: 'High error count detected. Review error logs for patterns.',
        metric: `${errorEvents.count} errors`
      });
    }

    return insights;
  }

  async getWorkflowMetrics(workflowId, period = 7) {
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (period * 24 * 60 * 60);

    const dailyMetrics = [];
    
    for (let i = 0; i < period; i++) {
      const dayStart = startDate + (i * 24 * 60 * 60);
      const dayEnd = dayStart + (24 * 60 * 60);
      
      const stats = this.db.getCompletionStats({
        workflowId,
        startDate: dayStart,
        endDate: dayEnd
      });
      
      dailyMetrics.push({
        date: new Date(dayStart * 1000).toISOString().split('T')[0],
        completions: stats.total_completions || 0,
        successRate: stats.total_completions > 0
          ? (stats.successful / stats.total_completions) * 100
          : 0,
        averageDuration: stats.avg_duration || 0
      });
    }

    return {
      workflowId,
      period,
      metrics: dailyMetrics,
      trend: this.calculateTrend(dailyMetrics)
    };
  }

  calculateTrend(metrics) {
    if (metrics.length < 2) return 'insufficient_data';
    
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.completions, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.completions, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.2) return 'increasing';
    if (secondAvg < firstAvg * 0.8) return 'decreasing';
    return 'stable';
  }

  async getUserActivity(userId, limit = 50) {
    const sql = `
      SELECT 
        c.workflow_id,
        c.created_at,
        c.duration,
        c.success,
        w.name as workflow_name,
        w.platform
      FROM completions c
      LEFT JOIN workflows w ON c.workflow_id = w.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT ?
    `;
    
    const stmt = this.db.prepare(sql);
    const activities = stmt.all(userId, limit);
    
    return {
      userId,
      activities,
      stats: await this.getUserStats(userId)
    };
  }

  async getUserStats(userId) {
    const sql = `
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(DISTINCT workflow_id) as unique_workflows,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        AVG(duration) as avg_duration,
        MAX(created_at) as last_activity
      FROM completions
      WHERE user_id = ?
    `;
    
    const stmt = this.db.prepare(sql);
    return stmt.get(userId);
  }

  async getCompanyMetrics(companyId) {
    const users = await this.getActiveUsers(companyId);
    const workflows = await this.getPopularWorkflows(companyId);
    const summary = await this.getSummary({ companyId });
    
    return {
      companyId,
      activeUsers: users.length,
      popularWorkflows: workflows,
      summary,
      adoption: await this.calculateAdoption(companyId)
    };
  }

  async getActiveUsers(companyId, days = 30) {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    
    const sql = `
      SELECT DISTINCT user_id
      FROM completions
      WHERE company_id = ?
      AND created_at > ?
    `;
    
    const stmt = this.db.prepare(sql);
    return stmt.all(companyId, cutoff);
  }

  async getPopularWorkflows(companyId, limit = 10) {
    const sql = `
      SELECT 
        workflow_id,
        COUNT(*) as usage_count,
        AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate
      FROM completions
      WHERE company_id = ?
      GROUP BY workflow_id
      ORDER BY usage_count DESC
      LIMIT ?
    `;
    
    const stmt = this.db.prepare(sql);
    return stmt.all(companyId, limit);
  }

  async calculateAdoption(companyId) {
    const lastMonth = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const previousMonth = lastMonth - (30 * 24 * 60 * 60);
    
    const currentUsers = await this.getActiveUsers(companyId, 30);
    const previousUsers = await this.getActiveUsersInPeriod(companyId, previousMonth, lastMonth);
    
    const growth = currentUsers.length > 0 && previousUsers.length > 0
      ? ((currentUsers.length - previousUsers.length) / previousUsers.length) * 100
      : 0;
    
    return {
      currentMonthUsers: currentUsers.length,
      previousMonthUsers: previousUsers.length,
      growthRate: growth.toFixed(2)
    };
  }

  async getActiveUsersInPeriod(companyId, startDate, endDate) {
    const sql = `
      SELECT DISTINCT user_id
      FROM completions
      WHERE company_id = ?
      AND created_at >= ?
      AND created_at <= ?
    `;
    
    const stmt = this.db.prepare(sql);
    return stmt.all(companyId, startDate, endDate);
  }
}