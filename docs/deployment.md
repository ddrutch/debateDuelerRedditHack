# Deployment Documentation

This document covers the deployment process for Debate Dueler, including Reddit app publishing, production management, and maintenance procedures.

## Overview

Deploying Debate Dueler involves several key steps:

1. **App Directory Submission**: Get approval from Reddit's App Directory
2. **Production Deployment**: Publish the app for public use
3. **Monitoring**: Set up monitoring and alerting
4. **Maintenance**: Handle updates and issue resolution

## Prerequisites

### Reddit Developer Requirements

- **Reddit Account**: Must be in good standing (no recent suspensions)
- **App Directory Access**: Apply for developer access if not already granted
- **Community Guidelines**: App must comply with Reddit's content policies
- **Technical Requirements**: App must meet Reddit's technical standards

### Technical Prerequisites

```bash
# Verify Devvit CLI installation
npx devvit --version

# Ensure you're logged in
npx devvit whoami

# Check app configuration
cat devvit.yaml
```

## App Directory Submission

### Step 1: Prepare App Metadata

Create comprehensive app metadata:

```yaml
# devvit.yaml
name: debate-dueler
version: 1.0.0
description: Interactive quiz game for Reddit posts
author: Your Name
license: MIT
homepage: https://github.com/your-org/debate-dueler
repository: https://github.com/your-org/debate-dueler
```

### Step 2: App Store Listing

Prepare app store information:

**App Name**: Debate Dueler
**Tagline**: "Test your knowledge, go against the crowd!"
**Description**:
```
Debate Dueler brings interactive trivia to Reddit with unique scoring mechanics.
Choose between Contrarian, Conformist, or Trivia modes to compete with other users.
Features real-time leaderboards, community question creation, and moderator controls.
```

**Screenshots**:
- Welcome screen with scoring mode selection
- Gameplay with question and answers
- Results screen with leaderboard
- Admin panel for moderators

**Categories**: Gaming, Social, Educational

### Step 3: Content Guidelines Compliance

Ensure compliance with Reddit's guidelines:

- ✅ **No prohibited content**: No hate speech, violence, or inappropriate material
- ✅ **User safety**: Proper content moderation and reporting features
- ✅ **Data privacy**: No collection of unnecessary user data
- ✅ **Transparency**: Clear about data usage and app functionality

### Step 4: Technical Review Preparation

**Code Quality**:
```bash
# Run comprehensive tests
npm run test:coverage

# Ensure no linting errors
npm run lint

# Build production bundle
npm run build

# Verify bundle size
ls -lh dist/
```

**Security Audit**:
```bash
# Check for vulnerabilities
npm audit

# Review permissions requested
# Ensure minimal required permissions
```

### Step 5: Submit for Review

```bash
# Submit app for App Directory review
npx devvit apps publish

# Or update existing app
npx devvit apps update
```

**Review Timeline**:
- Initial review: 3-5 business days
- Additional reviews: 1-2 business days
- Total approval time: 1-2 weeks

## Production Deployment

### Environment Configuration

#### Production Settings

```typescript
// src/devvit/config/production.ts
export const PRODUCTION_CONFIG = {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
  logging: {
    level: 'info',
    sentry: {
      dsn: process.env.SENTRY_DSN,
    },
  },
  features: {
    analytics: true,
    errorReporting: true,
    performanceMonitoring: true,
  },
};
```

#### Environment Variables

```bash
# .env.production
REDIS_HOST=redis-production.reddit.com
REDIS_PORT=6379
REDIS_PASSWORD=your-production-redis-password
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ANALYTICS_KEY=your-analytics-key
```

### Deployment Process

#### Automated Deployment

```bash
# Deploy to production
npm run deploy:production

# Monitor deployment status
npx devvit apps logs <app-id> --follow
```

#### Manual Deployment Steps

1. **Build Production Bundle**
```bash
npm run build
```

2. **Run Tests**
```bash
npm run test
npm run test:e2e
```

3. **Deploy to Staging**
```bash
npm run deploy:staging
```

4. **Test in Staging**
- Verify all features work
- Test admin functionality
- Check performance metrics
- Validate error handling

5. **Deploy to Production**
```bash
npm run deploy:production
```

6. **Post-Deployment Verification**
```bash
# Check app status
npx devvit apps list

# Monitor logs
npx devvit apps logs <app-id>

# Verify functionality
# Test in actual Reddit posts
```

## App Management

### Version Management

#### Semantic Versioning

```bash
# Patch version (bug fixes)
npm version patch

# Minor version (new features)
npm version minor

# Major version (breaking changes)
npm version major
```

#### Version Strategy

- **Patch (1.0.1)**: Bug fixes, performance improvements
- **Minor (1.1.0)**: New features, enhancements
- **Major (2.0.0)**: Breaking changes, major rewrites

### Update Strategy

#### Rolling Updates

```bash
# Gradual rollout to percentage of users
npx devvit apps update --rollout 10%  # 10% of users
npx devvit apps update --rollout 25%  # 25% of users
npx devvit apps update --rollout 100% # Full rollout
```

#### Blue-Green Deployment

```bash
# Deploy new version alongside old
npx devvit apps create blue-version
npx devvit apps update blue-version

# Test blue version
# Switch traffic to blue version
npx devvit apps promote blue-version

# Remove old version
npx devvit apps delete green-version
```

### Rollback Procedures

#### Emergency Rollback

```bash
# Quick rollback to previous version
npx devvit apps rollback <app-id>

# Or deploy specific version
npx devvit apps update <app-id> --version 1.0.0
```

#### Gradual Rollback

```bash
# Roll back gradually
npx devvit apps update --rollout 50% --version 1.0.0
npx devvit apps update --rollout 25% --version 1.0.0
npx devvit apps update --rollout 0% --version 1.0.0
```

## Monitoring and Observability

### Application Monitoring

#### Health Checks

```typescript
// src/devvit/health.ts
export const healthCheck = async () => {
  try {
    // Check Redis connectivity
    await redis.ping();

    // Check database operations
    const testKey = 'health_check';
    await redis.set(testKey, 'ok');
    await redis.del(testKey);

    return { status: 'healthy', timestamp: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

#### Performance Metrics

```typescript
// src/devvit/metrics.ts
export const recordMetrics = async (operation: string, duration: number) => {
  // Record operation duration
  await redis.zadd('metrics:response_times', duration, `${operation}:${Date.now()}`);

  // Track error rates
  if (operation.includes('error')) {
    await redis.incr('metrics:errors');
  }

  // Monitor user activity
  await redis.incr('metrics:active_users');
};
```

### Logging Strategy

#### Structured Logging

```typescript
// src/devvit/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
      userId: context.userId,
      postId: context.postId,
    }));
  },

  error: (message: string, error?: Error) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.stack,
      timestamp: new Date().toISOString(),
    }));
  },
};
```

#### Log Aggregation

```bash
# View application logs
npx devvit apps logs <app-id> --follow

# Filter logs by level
npx devvit apps logs <app-id> --level error

# Search logs
npx devvit apps logs <app-id> --grep "INIT_RESPONSE"
```

### Alerting

#### Error Alerting

```typescript
// src/devvit/alerts.ts
export const alertOnError = async (error: Error, context: any) => {
  // Send to monitoring service
  await fetch(process.env.ALERT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `Debate Dueler Error: ${error.message}`,
      context: {
        userId: context.userId,
        postId: context.postId,
        userAgent: context.userAgent,
      },
    }),
  });
};
```

#### Performance Alerting

```typescript
// Alert on high error rates
const errorRate = await redis.get('metrics:errors');
if (parseInt(errorRate) > 100) { // More than 100 errors
  await sendAlert('High error rate detected');
}

// Alert on slow response times
const slowResponses = await redis.zcount('metrics:response_times', 5000, '+inf');
if (slowResponses > 10) { // More than 10 slow responses
  await sendAlert('Performance degradation detected');
}
```

## Scaling and Performance

### Redis Optimization

#### Connection Pooling

```typescript
// src/devvit/redis.ts
export const createRedisClient = () => {
  return {
    // Connection pooling configuration
    maxConnections: 10,
    minConnections: 2,
    connectionTimeout: 5000,
    commandTimeout: 3000,
  };
};
```

#### Data Structure Optimization

```typescript
// Use efficient Redis data structures
const leaderboardKey = `leaderboard:${postId}`;

// Sorted set for leaderboard (O(log n) operations)
await redis.zadd(leaderboardKey, { score: userScore, member: userId });

// Hash for user data (O(1) operations)
await redis.hset(`user:${userId}`, {
  username: userData.username,
  totalScore: userData.totalScore,
});

// Set for active users
await redis.sadd('active_users', userId);
```

### Caching Strategy

#### Multi-Level Caching

```typescript
// src/devvit/cache.ts
export const cache = {
  // Memory cache for frequently accessed data
  memory: new Map(),

  // Redis cache for shared data
  redis: redis,

  async get(key: string) {
    // Check memory cache first
    if (this.memory.has(key)) {
      return this.memory.get(key);
    }

    // Check Redis cache
    const data = await this.redis.get(key);
    if (data) {
      // Populate memory cache
      this.memory.set(key, data);
      return data;
    }

    return null;
  },

  async set(key: string, value: any, ttl = 300) {
    this.memory.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  },
};
```

## Security and Compliance

### Data Protection

#### User Data Handling

```typescript
// src/devvit/privacy.ts
export const handleDataDeletion = async (userId: string) => {
  // Remove all user data
  await redis.del(`game:*:player:${userId}`);
  await redis.zrem(`leaderboard:*`, userId);
  await redis.del(`user:${userId}`);

  // Log deletion for compliance
  await logger.info('User data deleted', { userId });
};
```

#### GDPR Compliance

- **Data Minimization**: Only collect necessary user data
- **Right to Deletion**: Provide data deletion mechanisms
- **Consent Management**: Clear data usage policies
- **Audit Logging**: Track all data access and modifications

### API Security

#### Rate Limiting

```typescript
// src/devvit/rateLimit.ts
export const rateLimiter = {
  async checkLimit(userId: string, action: string, limit = 100) {
    const key = `ratelimit:${userId}:${action}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, 3600); // 1 hour window
    }

    if (current > limit) {
      throw new Error('Rate limit exceeded');
    }

    return current;
  },
};
```

#### Input Validation

```typescript
// src/devvit/validation.ts
export const validateInput = (input: any, schema: any) => {
  // Comprehensive input validation
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input format');
  }

  // Schema validation
  for (const [key, validator] of Object.entries(schema)) {
    if (!validator(input[key])) {
      throw new Error(`Invalid ${key}`);
    }
  }

  return input;
};
```

## Maintenance Procedures

### Regular Maintenance

#### Weekly Tasks

```bash
# Clean up old data
npm run cleanup:old-data

# Update dependencies
npm audit fix

# Rotate logs
npm run rotate-logs

# Backup data
npm run backup
```

#### Monthly Tasks

```bash
# Security audit
npm audit

# Performance review
npm run performance:review

# Update monitoring dashboards
npm run update:monitoring

# Review error logs
npm run review:errors
```

### Emergency Procedures

#### Incident Response

1. **Detection**: Monitor alerts and error rates
2. **Assessment**: Evaluate impact and scope
3. **Communication**: Notify stakeholders
4. **Mitigation**: Implement fixes or rollbacks
5. **Recovery**: Restore normal operations
6. **Review**: Post-mortem analysis

#### Communication Plan

```typescript
// src/devvit/incident.ts
export const reportIncident = async (incident: Incident) => {
  // Notify development team
  await notifySlack(incident);

  // Update status page
  await updateStatusPage(incident);

  // Notify affected users (if major)
  if (incident.severity === 'critical') {
    await notifyUsers(incident);
  }
};
```

## Troubleshooting Production Issues

### Common Issues and Solutions

#### High Latency

```bash
# Check Redis performance
redis-cli --latency

# Monitor connection pool
redis-cli info clients

# Review slow queries
redis-cli slowlog get 10
```

#### Memory Issues

```bash
# Check Redis memory usage
redis-cli info memory

# Monitor application memory
npx devvit apps metrics <app-id>

# Clear unnecessary data
redis-cli keys "*" | xargs redis-cli del
```

#### Connection Issues

```bash
# Test Redis connectivity
redis-cli ping

# Check network latency
redis-cli --latency

# Review connection configuration
redis-cli config get timeout
```

### Debug Tools

#### Remote Debugging

```bash
# Enable debug logging
export DEBUG=devvit:*

# Start with debug mode
npm run dev:debug

# Attach debugger
node --inspect-brk dist/main.js
```

#### Performance Profiling

```bash
# Profile application performance
npx devvit apps profile <app-id>

# Analyze memory usage
npx devvit apps heapdump <app-id>

# Trace slow operations
npx devvit apps trace <app-id>
```

## Cost Optimization

### Resource Management

#### Redis Cost Optimization

```bash
# Monitor Redis usage
redis-cli info keyspace

# Implement data expiration
redis-cli config set maxmemory 1gb
redis-cli config set maxmemory-policy allkeys-lru

# Compress large values
# Use efficient data structures
```

#### Bandwidth Optimization

```typescript
// Compress responses
const compressResponse = (data: any) => {
  return JSON.stringify(data); // Implement compression
};

// Cache static assets
const cacheAssets = async () => {
  // Implement CDN caching
};
```

### Monitoring Costs

```typescript
// Cost-aware logging
const costLogger = {
  log: (level: string, message: string) => {
    // Only log important messages in production
    if (level === 'debug' && process.env.NODE_ENV === 'production') {
      return;
    }
    console.log(`[${level}] ${message}`);
  },
};
```

This deployment guide ensures Debate Dueler can be safely and efficiently deployed to production while maintaining high availability, performance, and user experience.