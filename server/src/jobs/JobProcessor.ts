import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq'
import { redisService } from '../services/RedisService'

export interface JobConfig {
  name: string
  concurrency: number
  rateLimit: number
  retryAttempts: number
  retryDelay: number
}

export interface JobData {
  type: string
  data: any
  userId?: number
  priority?: number
  delay?: number
}

export interface JobResult {
  success: boolean
  data?: any
  error?: string
}

export class JobProcessor {
  private queues: Map<string, Queue> = new Map()
  private workers: Map<string, Worker> = new Map()
  private jobHandlers: Map<string, (job: Job) => Promise<JobResult>> = new Map()
  private isInitialized = false

  /**
   * Initialize the job processor with all queue configurations
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️  Job processor already initialized')
      return
    }

    console.log('🔄 Initializing job processor...')

    // Ensure Redis is initialized
    const redisConnection = redisService.getJobQueueRedis()

    // Define job queue configurations
    const jobConfigs: JobConfig[] = [
      {
        name: 'email',
        concurrency: 5,
        rateLimit: 100, // 100 jobs per minute
        retryAttempts: 3,
        retryDelay: 2000
      },
      {
        name: 'pdf-generation',
        concurrency: 2,
        rateLimit: 10, // 10 jobs per minute
        retryAttempts: 2,
        retryDelay: 5000
      },
      {
        name: 'notifications',
        concurrency: 10,
        rateLimit: 200, // 200 jobs per minute
        retryAttempts: 3,
        retryDelay: 1000
      },
      {
        name: 'data-cleanup',
        concurrency: 1,
        rateLimit: 5, // 5 jobs per minute
        retryAttempts: 1,
        retryDelay: 10000
      },
      {
        name: 'scheduled-tasks',
        concurrency: 2,
        rateLimit: 20, // 20 jobs per minute
        retryAttempts: 2,
        retryDelay: 3000
      }
    ]

    // Initialize all queues and workers
    for (const config of jobConfigs) {
      await this.createQueue(config)
    }

    this.isInitialized = true
    console.log('✅ Job processor initialized successfully')
    this.logQueueStatus()
  }

  /**
   * Create a queue and its worker with the given configuration
   */
  private async createQueue(config: JobConfig): Promise<void> {
    const connection = redisService.getJobQueueRedis()

    // Queue options
    const queueOptions: QueueOptions = {
      connection,
      defaultJobOptions: {
        attempts: config.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.retryDelay
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        delay: 0 // Default no delay
      }
    }

    // Worker options
    const workerOptions: WorkerOptions = {
      connection,
      concurrency: config.concurrency,
      limiter: {
        max: config.rateLimit,
        duration: 60000 // Per minute
      },
      // Increase stall interval for SMTP operations which can be slow
      stalledInterval: 120000, // 2 minutes (default is 30 seconds)
      maxStalledCount: 1 // Only retry once if stalled
    }

    // Create queue
    const queue = new Queue(config.name, queueOptions)
    this.queues.set(config.name, queue)

    // Create worker
    const worker = new Worker(
      config.name,
      async (job: Job) => {
        return await this.processJob(config.name, job)
      },
      workerOptions
    )

    // Set up worker event handlers
    this.setupWorkerEvents(worker, config.name)

    this.workers.set(config.name, worker)

    console.log(`✅ Queue '${config.name}' created with ${config.concurrency} workers`)
  }

  /**
   * Set up event handlers for a worker
   */
  private setupWorkerEvents(worker: Worker, queueName: string): void {
    worker.on('completed', (job: Job, result: any) => {
      console.log(`✅ Job ${job.id} in queue '${queueName}' completed:`, result)
    })

    worker.on('failed', async (job: Job | undefined, error: Error) => {
      console.error(`❌ Job ${job?.id} in queue '${queueName}' failed:`, error)
      await this.handleJobFailure(queueName, job, error)
    })

    worker.on('active', (job: Job) => {
      console.log(`🔄 Job ${job.id} in queue '${queueName}' started processing`)
    })

    worker.on('stalled', (jobId: string) => {
      console.warn(`⏰ Job ${jobId} in queue '${queueName}' stalled`)
    })

    worker.on('progress', (job: Job, progress: number | object) => {
      console.log(`📊 Job ${job.id} in queue '${queueName}' progress:`, progress)
    })
  }

  /**
   * Process a job based on queue name and job type
   */
  private async processJob(queueName: string, job: Job): Promise<JobResult> {
    const { type, data, userId } = job.data as JobData

    console.log(`🔄 Processing ${queueName} job: ${type}`, { jobId: job.id, userId })

    try {
      // Get job handler
      const handlerKey = `${queueName}:${type}`
      const handler = this.jobHandlers.get(handlerKey)

      if (!handler) {
        throw new Error(`No handler found for job type: ${handlerKey}`)
      }

      // Process the job
      const result = await handler(job)

      if (result.success) {
        console.log(`✅ Job ${job.id} (${handlerKey}) completed successfully`)
      } else {
        console.error(`❌ Job ${job.id} (${handlerKey}) failed:`, result.error)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Error processing job ${job.id} (${queueName}:${type}):`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Register a job handler for a specific queue and job type
   */
  public registerJobHandler(
    queueName: string, 
    jobType: string, 
    handler: (job: Job) => Promise<JobResult>
  ): void {
    const handlerKey = `${queueName}:${jobType}`
    this.jobHandlers.set(handlerKey, handler)
    console.log(`📝 Registered handler for: ${handlerKey}`)
  }

  /**
   * Add a job to a queue
   */
  public async addJob(
    queueName: string, 
    jobData: JobData,
    options?: {
      priority?: number
      delay?: number
      repeat?: any
    }
  ): Promise<Job> {
    const queue = this.queues.get(queueName)
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`)
    }

    const job = await queue.add(
      jobData.type,
      jobData,
      {
        priority: options?.priority || jobData.priority || 0,
        delay: options?.delay || jobData.delay || 0,
        repeat: options?.repeat
      }
    )

    console.log(`➕ Added job ${job.id} to queue '${queueName}' (type: ${jobData.type})`)
    return job
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(queueName: string): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const queue = this.queues.get(queueName)
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`)
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    }
  }

  /**
   * Get all queue statistics
   */
  public async getAllQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {}

    for (const queueName of this.queues.keys()) {
      try {
        stats[queueName] = await this.getQueueStats(queueName)
      } catch (error) {
        stats[queueName] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    return stats
  }

  /**
   * Handle job failure with additional logging and alerting
   */
  private async handleJobFailure(queueName: string, job: Job | undefined, error: Error): Promise<void> {
    if (!job) return

    const failureData = {
      queueName,
      jobId: job.id,
      jobType: job.data?.type,
      error: error.message,
      attempts: job.attemptsMade,
      maxAttempts: job.opts?.attempts || 0,
      failedAt: new Date().toISOString()
    }

    console.error('💥 Job Failure Details:', failureData)

    // If this was the final attempt, log for monitoring
    if (job.attemptsMade >= (job.opts?.attempts || 0)) {
      console.error(`🚨 Job ${job.id} permanently failed after ${job.attemptsMade} attempts`)
      
      // Here you could add additional alerting (email, Slack, etc.)
      // await this.sendFailureAlert(failureData)
    }
  }

  /**
   * Log the status of all queues
   */
  private logQueueStatus(): void {
    console.log('📊 Active Job Queues:')
    for (const [name, queue] of this.queues) {
      console.log(`   - ${name}: ✅ Ready`)
    }
  }

  /**
   * Health check for all queues and workers
   */
  public async healthCheck(): Promise<{
    healthy: boolean
    queues: Record<string, any>
    workers: Record<string, any>
  }> {
    const queues: Record<string, any> = {}
    const workers: Record<string, any> = {}

    try {
      // Check each queue
      for (const [name, queue] of this.queues) {
        try {
          const stats = await this.getQueueStats(name)
          queues[name] = { status: 'healthy', stats }
        } catch (error) {
          queues[name] = { 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      }

      // Check each worker
      for (const [name, worker] of this.workers) {
        workers[name] = {
          status: worker.isRunning() ? 'running' : 'stopped',
          concurrency: worker.opts.concurrency
        }
      }

      const healthy = Object.values(queues).every(q => q.status === 'healthy') &&
                     Object.values(workers).every(w => w.status === 'running')

      return { healthy, queues, workers }
    } catch (error) {
      return {
        healthy: false,
        queues: {},
        workers: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Gracefully shutdown all workers and close queues
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down job processor...')

    // Close all workers
    const workerPromises = Array.from(this.workers.values()).map(worker => worker.close())
    await Promise.all(workerPromises)

    // Close all queues
    const queuePromises = Array.from(this.queues.values()).map(queue => queue.close())
    await Promise.all(queuePromises)

    this.queues.clear()
    this.workers.clear()
    this.jobHandlers.clear()
    this.isInitialized = false

    console.log('✅ Job processor shutdown complete')
  }
}

// Export singleton instance
export const jobProcessor = new JobProcessor()