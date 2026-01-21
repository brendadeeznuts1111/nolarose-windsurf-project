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

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `429` - Rate Limited (too many requests)
- `500` - Internal Server Error

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

- **Default**: 100 requests per minute per IP
- **WebSocket**: 10 connections per minute per IP
- **Batch endpoints**: 10 requests per minute

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

- **Batch processing** is more efficient for multiple assessments
- **WebSocket connections** provide real-time updates with minimal latency
- **Caching** is implemented for frequently accessed data
- **Concurrent processing** handles up to 1000 simultaneous sessions

## Security Notes

- All sensitive data should be transmitted over HTTPS
- Implement proper authentication in production
- Log all fraud detection events for audit purposes
- Regular security audits are recommended

## Support

For API issues and questions:
- GitHub Issues: https://github.com/brendadeeznuts1111/nolarose-windsurf-project/issues
- Documentation: https://github.com/brendadeeznuts1111/nolarose-windsurf-project/docs
