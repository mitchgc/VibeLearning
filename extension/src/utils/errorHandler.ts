/**
 * Centralized error handling for the extension
 */

export class ErrorHandler {
  static log(context: string, error: any) {
    console.error(`[VibeLearning ${context}]:`, error)
    
    // In production, you could send errors to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to analytics/monitoring service
      // this.sendErrorReport(context, error)
    }
  }

  static wrap<T extends (...args: any[]) => any>(
    fn: T,
    context: string
  ): (...args: Parameters<T>) => ReturnType<T> | Promise<ReturnType<T>> {
    return (...args: Parameters<T>) => {
      try {
        const result = fn(...args)
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.catch(error => {
            this.log(context, error)
            throw error
          })
        }
        
        return result
      } catch (error) {
        this.log(context, error)
        throw error
      }
    }
  }

  static async safeExecute<T>(
    fn: () => T | Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await fn()
    } catch (error) {
      this.log(context, error)
      return fallback
    }
  }
}