import Redis from 'ioredis'

// Redis configuration with connection options
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryConnectOnFailedover: true,
  db: 0, // Use database 0 for main application
}

// Job queue specific Redis configuration
export const jobQueueRedisConfig = {
  ...redisConfig,
  db: 1, // Use database 1 for job queues
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