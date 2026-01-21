# Windsurf Project

A comprehensive fraud detection and risk analysis system built with Bun, featuring enterprise-grade AI/ML capabilities, network optimization, and advanced configuration management.

## 🚀 Features

- **Anomaly Detection**: Advanced pattern recognition and anomaly prediction with ensemble models
- **Risk Scoring**: Real-time risk assessment with external API integration
- **Network Optimization**: Preconnect, connection pooling, and performance monitoring
- **Privacy Protection**: Ghost shield for privacy handling and proxy detection
- **Dashboard**: Interactive risk heatmap and visualization tools
- **CLI Tool**: Enhanced command-line interface with network and external API commands
- **Matrix Configuration**: Enterprise-grade property matrix columns for comprehensive management
- **External Intelligence**: 12+ third-party API integrations for enhanced fraud detection
- **Bun Server Compliance**: Dynamic port and hostname configuration following official Bun documentation

## 🏗️ Architecture

```
📁 Project Structure
├── 🤖 ai/                          # AI/ML Module
│   ├── anomaly-predict.ts          # Core prediction engine v2.0
│   ├── network-optimizer.ts        # Network optimization module
│   ├── model-config-enhanced.json  # Matrix configuration system
│   └── types/                      # Enhanced type definitions
├── 🛡️ fraud-oracle/                # Fraud detection logic
├── 👻 ghost-shield/                 # Privacy protection
├── 📊 dashboard/                    # Risk visualization
├── ⚙️ cli/                         # Enhanced CLI tool
├── 📋 docs/                        # Updated documentation
└── 🔧 feature-weights/             # Configuration management
```

## 📦 Installation

```bash
# Install the package
bun add @nolarose/windsurf-project

# Or install globally for CLI usage
bun add -g @nolarose/windsurf-project
```

## 🛠️ Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build

# Lint code
bun run lint

# Format code
bun run format
```

## 📋 Scripts

- `bun run build` - Build the CLI tool and API server
- `bun test` - Run test suite with coverage
- `bun run type-check` - TypeScript type checking
- `bun run lint` - Code linting with Biome
- `bun run format` - Code formatting with Biome
- `bun run release` - Create a new release and publish

## 🚀 Quick Start

### Start the Enhanced API Server

```bash
# Default configuration (0.0.0.0:3051)
bun run ai/anomaly-predict.ts

# Custom configuration
HOST=localhost PORT=3000 bun run ai/anomaly-predict.ts

# Using Bun's preferred environment variable
BUN_PORT=4002 bun run ai/anomaly-predict.ts
```

### Use the Enhanced CLI

```bash
# Standard risk analysis
bun run cli/risk-hunter.ts analyze --session-id session-123

# Enhanced analysis with external APIs
bun run cli/risk-hunter.ts analyze --session-id session-123 --external

# Network performance metrics
bun run cli/risk-hunter.ts network --metrics

# External API testing
bun run cli/risk-hunter.ts external --test-all

# Real-time monitoring
bun run cli/risk-hunter.ts monitor --real-time
```

## 📊 Enhanced Features

### Matrix Configuration System

The enhanced model configuration features comprehensive property matrix columns:

- **Feature Matrix**: 6 column categories with 25+ properties
- **Ensemble Models**: 4 column groups with deployment specifications  
- **Risk Levels**: 3 matrix categories for business rules
- **Monitoring**: 4 matrix types for metrics and alerts
- **Compliance**: 4 matrix frameworks for regulatory requirements

### Network Optimization

- **Preconnect**: Early DNS, TCP, TLS setup
- **Connection Pooling**: HTTP keep-alive and reuse
- **Batch Processing**: Parallel API calls with retry logic
- **Performance Monitoring**: Real-time metrics and analytics

### External API Integration

- **Device Intelligence**: Device fingerprinting and analysis
- **Geolocation**: IP-based location and velocity detection
- **Threat Intelligence**: Blacklist and reputation checking
- **Identity Verification**: User identity validation
- **Payment Processors**: Transaction risk assessment

### API Endpoints v2.0

- `POST /api/risk/enhanced` - Enhanced scoring with external data
- `GET /api/network/metrics` - Network performance metrics
- `POST /api/external/data` - External API testing
- `GET /api/health` - System health with server properties
- `WebSocket /ws/risk-live` - Real-time risk monitoring

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
HOST=0.0.0.0                    # Server hostname (default: 0.0.0.0)
PORT=3051                       # Server port (default: 3051)
BUN_PORT=3051                   # Bun preferred port variable
NODE_PORT=3051                  # Node.js compatibility

# External API Configuration
ENABLE_EXTERNAL_APIS=true       # Enable external intelligence
NETWORK_OPTIMIZATION=true       # Enable network optimization
API_TIMEOUT=5000               # External API timeout (ms)
MAX_CONCURRENT_REQUESTS=10     # Max concurrent external requests
```

### Matrix Configuration

The `model-config-enhanced.json` provides enterprise-grade configuration:

```json
{
  "feature_matrix": {
    "columns": {
      "basic_properties": ["name", "weight", "threshold", "description", "impact"],
      "data_characteristics": ["data_type", "collection_method", "refresh_rate", "reliability", "cost"],
      "privacy_compliance": ["privacy_level", "retention_days", "gdpr_sensitive", "pci_required", "hipaa_phi"],
      "engineering": ["normalization", "encoding", "validation", "drift_detection"],
      "performance": ["importance_score", "feature_correlation", "stability_index", "latency_ms"],
      "business": ["business_impact", "cost_benefit_ratio", "risk_contribution", "regulatory_flag"]
    }
  }
}
```

## 🏗️ Architecture

- `ai/` - Anomaly detection and prediction engines
- `fraud-oracle/` - Pattern detection and risk scoring
- `ghost-shield/` - Privacy handling and proxy detection
- `dashboard/` - Web dashboard and visualization
- `cli/` - Command-line interface tools
- `bench/` - Performance benchmarks

## 📊 Publishing

This project uses automated publishing via GitHub Actions:

1. **Tag-based publishing**: Push a `v*` tag to trigger publishing to npm
2. **Manual publishing**: Use the "Publish to NPM" workflow in GitHub Actions
3. **Local publishing**: Use `bun publish --tag alpha` for alpha releases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
