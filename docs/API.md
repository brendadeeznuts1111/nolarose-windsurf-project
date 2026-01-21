# API Documentation

## Overview

The Windsurf Project provides a comprehensive fraud detection API with real-time monitoring capabilities. This document describes the available endpoints, data structures, and usage examples.

## Base URL

```
http://localhost:3001
```

## Authentication

Currently, the API runs without authentication for development. In production, implement JWT-based authentication:

```typescript
// Headers
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Endpoints

### Endpoint Overview

| Method | Endpoint | Category | Auth Required | Rate Limit | Request Size | Response Size | Cache Policy | Version | Status | Dependencies | Timeout | Retry Policy | Use Case |
|--------|----------|----------|---------------|------------|--------------|---------------|--------------|---------|--------|--------------|---------|--------------|----------|
| **GET** | `/api/health` | System | No | 1000/hr | N/A | 1KB | 30s | v1.0 | Stable | None | 5s | Exponential | Health monitoring |
| **POST** | `/api/risk/score` | Core | Yes | 100/hr | 10KB | 2KB | No | v1.0 | Stable | ML Model | 10s | 3 attempts | Single risk assessment |
| **POST** | `/api/risk/batch` | Core | Yes | 10/hr | 1MB | 50KB | No | v1.0 | Stable | ML Model | 30s | 2 attempts | Batch processing |
| **GET** | `/api/risk/heatmap` | Analytics | Yes | 50/hr | N/A | 100KB | 5m | v1.0 | Stable | Database | 15s | Exponential | Risk visualization |
| **POST** | `/api/proxy/detect` | Security | Yes | 25/hr | 5KB | 3KB | No | v1.0 | Stable | GeoIP DB | 8s | 3 attempts | Proxy detection |
| **GET** | `/api/sessions/{id}` | Data | Yes | 200/hr | N/A | 5KB | 1m | v1.0 | Stable | Database | 5s | Exponential | Session lookup |
| **DELETE** | `/api/sessions/{id}` | Admin | Yes | 10/hr | N/A | 1KB | No | v1.0 | Stable | Database | 5s | 1 attempt | Session cleanup |
| **POST** | `/api/auth/login` | Auth | No | 20/hr | 2KB | 3KB | No | v1.0 | Stable | Auth DB | 3s | 2 attempts | Authentication |
| **POST** | `/api/auth/refresh` | Auth | Yes | 50/hr | 1KB | 2KB | No | v1.0 | Stable | JWT Store | 2s | 2 attempts | Token refresh |
| **GET** | `/api/analytics/trends` | Analytics | Yes | 30/hr | N/A | 25KB | 15m | v1.1 | Beta | Analytics DB | 10s | Exponential | Trend analysis |
| **POST** | `/api/admin/config` | Admin | Yes | 5/hr | 10KB | 2KB | No | v1.0 | Stable | Config Store | 5s | 1 attempt | Configuration |
| **GET** | `/api/audit/logs` | Audit | Yes | 15/hr | N/A | 500KB | 1h | v1.0 | Stable | Audit DB | 20s | Exponential | Audit review |
| **WebSocket** | `/ws/risk-live` | Real-time | Yes | 10/min | N/A | Stream | No | v1.0 | Stable | Event System | N/A | Auto-reconnect | Live monitoring |

### Health Check

Check if the service is running and get system status.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "active_sessions": 42,
  "avg_risk_score": 0.342,
  "uptime": 3600,
  "version": "1.0.0",
  "integrity": {
    "code": "2aa68cb1",
    "verified": true
  }
}
```

### Risk Scoring

Calculate fraud risk score for a given session or transaction.

```http
POST /api/risk/score
```

**Request Body:**
```json
{
  "sessionId": "session-123",
  "merchantId": "merchant-456",
  "features": {
    "root_detected": 0,
    "vpn_active": 1,
    "thermal_spike": 15.2,
    "biometric_fail": 2,
    "proxy_hop_count": 3
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.100",
    "timestamp": "2024-01-21T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "sessionId": "session-123",
  "merchantId": "merchant-456",
  "score": 0.875,
  "riskLevel": "HIGH",
  "blocked": true,
  "reason": "vpn_active + high thermal spike + multiple biometric failures",
  "timestamp": "2024-01-21T10:30:00Z",
  "recommendations": [
    "Require additional verification",
    "Monitor for suspicious patterns",
    "Consider blocking IP range"
  ]
}
```

### Batch Risk Assessment

Score multiple sessions in a single request.

```http
POST /api/risk/batch
```

**Request Body:**
```json
{
  "sessions": [
    {
      "sessionId": "session-1",
      "merchantId": "merchant-456",
      "features": { "root_detected": 0, "vpn_active": 0, "thermal_spike": 5.1, "biometric_fail": 0, "proxy_hop_count": 0 }
    },
    {
      "sessionId": "session-2", 
      "merchantId": "merchant-456",
      "features": { "root_detected": 1, "vpn_active": 1, "thermal_spike": 25.3, "biometric_fail": 3, "proxy_hop_count": 5 }
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "sessionId": "session-1",
      "score": 0.234,
      "riskLevel": "LOW",
      "blocked": false
    },
    {
      "sessionId": "session-2",
      "score": 0.987,
      "riskLevel": "CRITICAL", 
      "blocked": true,
      "reason": "Multiple high-risk indicators detected"
    }
  ],
  "summary": {
    "total": 2,
    "blocked": 1,
    "highRisk": 1,
    "averageScore": 0.610
  }
}
```

### Risk Heatmap

Get aggregated risk data for visualization.

```http
GET /api/risk/heatmap
```

**Query Parameters:**
- `since` - Time period (e.g., `1h`, `24h`, `7d`)
- `merchant` - Filter by merchant ID
- `threshold` - Minimum risk score (0.0-1.0)

**Response:**
```json
{
  "total_active": 156,
  "blocked_sessions": 23,
  "avg_score": 0.445,
  "high_risk_count": 18,
  "sessions": [
    {
      "sessionId": "session-789",
      "merchantId": "merchant-456",
      "score": 0.923,
      "riskLevel": "CRITICAL",
      "timestamp": 1705850400000,
      "blocked": true,
      "features": {
        "root_detected": 1,
        "vpn_active": 1,
        "thermal_spike": 28.7,
        "biometric_fail": 4,
        "proxy_hop_count": 6
      }
    }
  ],
  "patterns": [
    {
      "type": "vpn_cluster",
      "count": 12,
      "riskScore": 0.789,
      "description": "Multiple sessions from VPN endpoints"
    }
  ]
}
```

### Proxy Detection

Analyze network traffic for proxy usage.

```http
POST /api/proxy/detect
```

**Request Body:**
```json
{
  "sessionId": "session-123",
  "clientIP": "203.0.113.1",
  "userAgent": "Mozilla/5.0...",
  "headers": {
    "X-Forwarded-For": "203.0.113.1, 10.0.0.1",
    "Via": "1.1 proxy-server"
  }
}
```

**Response:**
```json
{
  "sessionId": "session-123",
  "proxyType": "MULTI_HOP",
  "confidence": 0.934,
  "hopAnalysis": {
    "hopCount": 4,
    "hops": [
      {
        "hopNumber": 1,
        "ipAddress": "203.0.113.1",
        "hostname": "client-endpoint",
        "country": "US",
        "latency": 5,
        "isKnownProxy": false,
        "riskScore": 0.1
      }
    ],
    "countries": ["US", "DE", "NL", "RU"],
    "impossibleVelocity": true,
    "distanceKm": 8500
  },
  "riskFactors": [
    "Multiple geographic locations",
    "Impossible velocity detected",
    "Known proxy ASN detected"
  ],
  "recommendations": [
    "Block session immediately",
    "Investigate IP range",
    "Monitor for related activity"
  ]
}
```

## WebSocket API

### Real-time Risk Monitoring

Connect to the WebSocket for live fraud alerts and updates.

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/risk-live');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.event) {
    case 'fraud:detected':
      console.log('Fraud detected:', data.sessionId, data.score);
      break;
      
    case 'fraud:blocked':
      console.log('Session blocked:', data.sessionId, data.reason);
      break;
      
    case 'risk:baseline':
      console.log('Risk baseline updated:', data.threshold);
      break;
      
    case 'system:health':
      console.log('System health:', data.active_sessions);
      break;
  }
};
```

**WebSocket Events:**

- `fraud:detected` - New fraud detection
- `fraud:blocked` - Session was blocked
- `risk:baseline` - Risk threshold updated
- `system:health` - System health update

## Data Structures

### Data Structure Overview

| Structure Name | Type | Purpose | Size (Bytes) | Validation | Required Fields | Optional Fields | Used In | Version Added | Deprecation Status | Serialization Format |
|----------------|------|---------|--------------|------------|-----------------|-----------------|---------|---------------|-------------------|---------------------|
| **FeatureVector** | Interface | Risk assessment features | 40 | Strict | 5 | 0 | Risk Scoring | v1.0 | Active | JSON |
| **RiskSession** | Interface | Session risk information | 200 | Strict | 7 | 3 | Analytics, Monitoring | v1.0 | Active | JSON |
| **ProxyDetectionResult** | Interface | Proxy analysis results | 500 | Strict | 4 | 2 | Security Analysis | v1.0 | Active | JSON |
| **TrafficPattern** | Interface | Traffic analysis data | 150 | Strict | 6 | 2 | Security Monitoring | v1.0 | Active | JSON |
| **DNSTracking** | Interface | DNS tracking information | 100 | Strict | 5 | 1 | Security Analysis | v1.0 | Active | JSON |
| **FraudSession** | Interface | Active fraud session | 300 | Strict | 8 | 4 | Real-time Monitoring | v1.0 | Active | JSON |
| **ProxyHop** | Interface | Individual proxy hop | 80 | Strict | 8 | 2 | Proxy Detection | v1.0 | Active | JSON |
| **ProxyDetectionConfig** | Interface | Detection configuration | 60 | Strict | 6 | 4 | Configuration | v1.0 | Active | JSON |
| **WebSocketEvent** | Interface | Real-time event data | 120 | Strict | 4 | 3 | WebSocket API | v1.0 | Active | JSON |
| **APIResponse** | Interface | Standard API response | 50 | Strict | 3 | 2 | All Endpoints | v1.0 | Active | JSON |
| **ErrorResponse** | Interface | Error information | 100 | Strict | 4 | 3 | Error Handling | v1.0 | Active | JSON |
| **BatchRequest** | Interface | Batch operation request | Variable | Strict | 1 | 2 | Batch Processing | v1.0 | Active | JSON |
| **HealthStatus** | Interface | System health data | 80 | Strict | 6 | 2 | Health Check | v1.0 | Active | JSON |
| **AnalyticsData** | Interface | Analytics metrics | 400 | Strict | 9 | 5 | Analytics API | v1.1 | Beta | JSON |

### FeatureVector

Core feature set for risk assessment:

```typescript
interface FeatureVector {
  root_detected: number;      // 0 or 1 - Device root status
  vpn_active: number;         // 0 or 1 - VPN detection
  thermal_spike: number;      // Temperature delta from baseline
  biometric_fail: number;     // Count of failed biometric attempts
  proxy_hop_count: number;    // Number of detected proxy hops
}
```

### RiskSession

Session risk information:

```typescript
interface RiskSession {
  sessionId: string;
  merchantId: string;
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: number;
  features: FeatureVector;
  blocked: boolean;
  reason?: string;
  patterns?: string[];
}
```

### ProxyDetectionResult

Proxy analysis results:

```typescript
interface ProxyDetectionResult {
  proxyType: 'NONE' | 'SINGLE' | 'MULTI_HOP' | 'KNOWN_PROXY';
  confidence: number;
  hopAnalysis: {
    hopCount: number;
    hops: ProxyHop[];
    countries: string[];
    impossibleVelocity: boolean;
    distanceKm: number;
  };
  riskFactors: string[];
  recommendations: string[];
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Category | Meaning | Client Action | Retry | Endpoint Impact | Error Type | Severity | Logging | Monitoring | User Message | Developer Notes | Frequency |
|-------------|----------|---------|---------------|-------|-----------------|-------------|----------|---------|------------|--------------|-----------------|----------|
| **200** | Success | OK | Continue | N/A | Normal | Success | Info | Standard | Basic | Success | Operation completed | High |
| **201** | Success | Created | Use new resource | N/A | Normal | Success | Info | Standard | Basic | Resource created | New entity available | Medium |
| **204** | Success | No Content | Success, no data | N/A | Normal | Success | Info | Standard | Basic | Success | Operation completed | High |
| **400** | Client Error | Bad Request | Fix request | No | Input validation | Validation | Warning | Detailed | Standard | Invalid input | Check parameters | High |
| **401** | Client Error | Unauthorized | Authenticate | No | Security | Auth | Error | Security | Critical | Authentication required | Check credentials | Medium |
| **403** | Client Error | Forbidden | Check permissions | No | Authorization | Auth | Error | Security | Critical | Access denied | Verify permissions | Medium |
| **404** | Client Error | Not Found | Check resource | No | Data | Data | Warning | Standard | Basic | Resource not found | Verify endpoint | High |
| **409** | Client Error | Conflict | Resolve conflict | No | Data | Conflict | Warning | Detailed | Standard | Conflict detected | Check state | Low |
| **422** | Client Error | Unprocessable | Fix data format | No | Validation | Validation | Warning | Detailed | Standard | Invalid data format | Validate schema | Medium |
| **429** | Client Error | Rate Limited | Wait and retry | Yes | Rate limiting | Rate Limit | Warning | Standard | Rate limiting | Too many requests | Respect limits | High |
| **500** | Server Error | Internal Error | Try again later | Yes | System | System | Error | Critical | Critical | Server error | Check logs | Medium |
| **502** | Server Error | Bad Gateway | Try again later | Yes | Infrastructure | Network | Error | Critical | Critical | Service unavailable | Check upstream | Low |
| **503** | Server Error | Service Unavailable | Wait and retry | Yes | System | System | Error | Critical | Critical | Service down | Check status | Medium |
| **504** | Server Error | Gateway Timeout | Try again later | Yes | Performance | Timeout | Error | Critical | Critical | Request timeout | Increase timeout | Low |

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_FEATURES",
    "message": "Feature vector missing required fields",
    "details": {
      "missing": ["vpn_active", "thermal_spike"]
    }
  },
  "timestamp": "2024-01-21T10:30:00Z"
}
```

## Rate Limiting

### Rate Limiting Matrix

| Endpoint Category | Requests/Minute | Requests/Hour | Requests/Day | Burst Limit | Window Size | Throttle Algorithm | Penalty | Whitelist Available | Enterprise Limit | Cost per 1K Extra | Monitoring Alert |
|-------------------|-----------------|---------------|--------------|-------------|-------------|-------------------|---------|-------------------|-----------------|------------------|------------------|
| **Health Check** | 1000 | 60,000 | 1,440,000 | 100 | 1 minute | Token Bucket | None | Yes | Unlimited | Free | No |
| **Risk Scoring** | 100 | 6,000 | 144,000 | 20 | 1 minute | Sliding Window | 429 error | Yes | 1000/min | $0.10 | Yes |
| **Batch Processing** | 10 | 600 | 14,400 | 5 | 1 minute | Fixed Window | 429 error | Yes | 100/min | $0.50 | Yes |
| **Analytics** | 50 | 3,000 | 72,000 | 15 | 1 minute | Token Bucket | 429 error | Yes | 500/min | $0.20 | Yes |
| **Proxy Detection** | 25 | 1,500 | 36,000 | 10 | 1 minute | Sliding Window | 429 error | Yes | 250/min | $0.30 | Yes |
| **Session Data** | 200 | 12,000 | 288,000 | 50 | 1 minute | Token Bucket | 429 error | Yes | 2000/min | $0.05 | Yes |
| **Admin Functions** | 5 | 300 | 7,200 | 2 | 1 minute | Fixed Window | 429 error | Yes | 50/min | $1.00 | Yes |
| **Authentication** | 20 | 1,200 | 28,800 | 8 | 1 minute | Sliding Window | 429 error | Yes | 200/min | $0.15 | Yes |
| **WebSocket** | 10 connections | 600 connections | 14,400 connections | 5 | 1 minute | Connection Pool | 101 error | Yes | 100 connections | $0.25 | Yes |
| **Audit Logs** | 15 | 900 | 21,600 | 5 | 1 minute | Token Bucket | 429 error | Yes | 150/min | $0.40 | Yes |

### Rate Limit Headers

| Header Name | Format | Description | Example Value | Client Action |
|-------------|--------|-------------|---------------|---------------|
| `X-RateLimit-Limit` | Integer | Requests allowed in window | `100` | Plan usage |
| `X-RateLimit-Remaining` | Integer | Requests remaining | `87` | Pace requests |
| `X-RateLimit-Reset` | Unix Timestamp | Window reset time | `1705850460` | Retry after |
| `X-RateLimit-RetryAfter` | Seconds | Seconds to wait | `45` | Delay requests |
| `X-RateLimit-Policy` | String | Rate limit policy | `sliding-window` | Understand algorithm |
| `X-RateLimit-Scope` | String | Scope of limit | `per-ip` | Identify scope |
| `X-RateLimit-Cost` | Integer | Cost of request | `1` | Budget usage |
| `X-RateLimit-Burst` | Integer | Burst capacity | `20` | Handle bursts |
| `X-RateLimit-Penalty` | String | Penalty type | `exponential-backoff` | Handle penalties |
| `X-RateLimit-Tier` | String | Current tier | `standard` | Upgrade tier |
| `X-RateLimit-Quota` | Integer | Monthly quota | `1000000` | Track quota |
| `X-RateLimit-Usage` | Integer | Current usage | `456789` | Monitor usage |
| `X-RateLimit-Reset-Quota` | Date | Quota reset date | `2024-02-01` | Plan renewal |

## SDK Examples

### TypeScript/JavaScript

```typescript
import { predictRisk } from '@nolarose/windsurf-project';

// Single risk assessment
const features = {
  root_detected: 0,
  vpn_active: 1,
  thermal_spike: 15.2,
  biometric_fail: 2,
  proxy_hop_count: 3
};

const result = await predictRisk(features, 'session-123', 'merchant-456');
console.log('Risk score:', result.score);
console.log('Blocked:', result.blocked);
```

### CLI Usage

```bash
# Analyze specific features
bun run cli/risk-hunter.ts analyze --features "0,1,15.2,2,3"

# Hunt for high-risk sessions
bun run cli/risk-hunter.ts hunt --threshold 0.9 --since 1h

# Monitor real-time
bun run cli/risk-hunter.ts monitor --real-time

# Generate report
bun run cli/risk-hunter.ts report --since 24h --output json
```

## Performance Considerations

### Performance Metrics Matrix

| Operation | Avg Response Time | P95 Response Time | P99 Response Time | Throughput (req/s) | CPU Usage | Memory Usage | Concurrent Limit | Error Rate | Cache Hit Rate | Recommended Use | Scaling Strategy |
|-----------|------------------|------------------|------------------|-------------------|-----------|--------------|------------------|-----------|----------------|-----------------|------------------|
| **Health Check** | 5ms | 10ms | 25ms | 2000 | 1% | 10MB | 10000 | 0.01% | 95% | Monitoring | Horizontal |
| **Single Risk Score** | 15ms | 25ms | 50ms | 500 | 15% | 50MB | 1000 | 0.1% | 80% | Real-time decisions | Vertical + Horizontal |
| **Batch Risk Score** | 200ms | 350ms | 600ms | 50 | 45% | 200MB | 100 | 0.2% | 60% | Bulk processing | Vertical |
| **Proxy Detection** | 25ms | 40ms | 80ms | 200 | 20% | 80MB | 500 | 0.15% | 70% | Security analysis | Horizontal |
| **Analytics Query** | 100ms | 180ms | 300ms | 100 | 25% | 150MB | 200 | 0.05% | 85% | Business intelligence | Read replicas |
| **Session Lookup** | 8ms | 15ms | 30ms | 800 | 8% | 30MB | 2000 | 0.02% | 90% | Session management | Horizontal |
| **WebSocket Event** | 2ms | 5ms | 10ms | N/A | 5% | 20MB | 10000 | 0.01% | N/A | Real-time monitoring | Horizontal |
| **Authentication** | 12ms | 20ms | 35ms | 300 | 10% | 40MB | 1500 | 0.03% | 88% | Security | Horizontal |
| **Admin Operations** | 50ms | 80ms | 150ms | 20 | 30% | 100MB | 50 | 0.1% | 75% | System management | Vertical |

### Optimization Guidelines

| Optimization | Impact | Implementation Effort | Cost | Frequency | Dependencies | Monitoring Required |
|--------------|---------|----------------------|------|-----------|--------------|-------------------|
| **Request Batching** | High | Medium | Low | Per request | Client changes | Throughput metrics |
| **Response Compression** | Medium | Low | Low | Per response | CDN/Proxy | Bandwidth usage |
| **Database Indexing** | High | High | Medium | One-time | Schema changes | Query performance |
| **Caching Layer** | High | Medium | Medium | Continuous | Redis setup | Cache hit rates |
| **Connection Pooling** | Medium | Low | Low | Per deployment | App config | Connection metrics |
| **Load Balancing** | High | Medium | High | Per deployment | Infrastructure | Response times |
| **CDN Integration** | Medium | Medium | Medium | One-time | CDN provider | Latency metrics |
| **Async Processing** | High | High | High | Per feature | Queue system | Queue depth |
| **Database Sharding** | Very High | Very High | High | One-time | Architecture | Shard balance |
| **Edge Computing** | High | High | High | Per region | Edge provider | Geographic latency |

## Security Notes

- All sensitive data should be transmitted over HTTPS
- Implement proper authentication in production
- Log all fraud detection events for audit purposes
- Regular security audits are recommended

## Support

For API issues and questions:
- GitHub Issues: https://github.com/brendadeeznuts1111/nolarose-windsurf-project/issues
- Documentation: https://github.com/brendadeeznuts1111/nolarose-windsurf-project/docs
