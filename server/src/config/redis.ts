import Redis from 'ioredis'

// Redis configuration with connection options
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3, // Allow retries but limit them
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 30000, // Increase to 30 seconds to prevent job processing timeouts
  retryConnectOnFailedover: true,
  // Add additional stability options
  keepAlive: 30000,
  family: 4, // Force IPv4
  db: 0, // Use database 0 for main application
}

// Job queue specific Redis configuration
export const jobQueueRedisConfig = {
  ...redisConfig,
  db: 1, // Use database 1 for job queues
  maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
  commandTimeout: 60000, // 60 seconds for job processing operations
}

// Session storage Redis configuration  
export const sessionRedisConfig = {
  ...redisConfig,
  db: 2, // Use database 2 for sessions
}

// Cache Redis configuration
export const cacheRedisConfig = {
  ...redisConfig,
  db: 3, // Use database 3 for caching
}

// Connection validation
export const validateRedisConnection = async (redis: Redis): Promise<boolean> => {
  try {
    const result = await redis.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('Redis connection validation failed:', error)
    return false
  }
}

export default redisConfig