# Configuration Directory Structure

This directory contains all configuration files for the windsurf project.

## Directory Structure

```
config/
├── README.md                    # This file
├── core/                        # Core configuration files
│   ├── config-loader.js         # Main configuration loader
│   ├── config.toml             # Main configuration
│   ├── features.toml           # Feature flags
│   └── package.modular.json    # Modular package configuration
├── dashboard/                   # Dashboard configurations
│   └── citadel-config.json     # Citadel dashboard settings
├── environments/                # Environment-specific configs
│   ├── development.toml        # Development environment settings
│   ├── production.toml         # Production environment settings
│   ├── testing.toml            # Testing environment settings
│   └── environment-manager.ts  # Environment management logic
├── deployment/                  # Deployment configurations
│   ├── deployment-manager.ts
│   ├── production.json
│   └── staging.json
├── network/                     # Network and proxy configurations
│   ├── active-proxy.txt
│   ├── proxies.list
│   └── cross-family-networks.json
├── ports/                       # Port management
│   ├── registry.md
│   ├── registry.ts
│   └── service-manager.ts
├── ui/                          # UI and theming
│   ├── ui-themes.toml
│   └── image-manifest.toml
├── behavior/                    # Application behavior
│   └── warming-behavior.toml
├── api/                         # API configurations
│   └── feature-status-api.ts
├── vault/                       # Security and secrets
│   └── totp-seeds.json
├── local/                       # Local development
│   ├── local.toml
│   └── local.toml.template
└── docs/                        # Documentation
    └── unified-config.md
```

## Configuration Categories

### Core Configuration
- **config-loader.js**: Main configuration loading logic
- **config.toml**: Primary configuration file
- **features.toml**: Feature flag definitions
- **package.modular.json**: Modular package management

### Dashboard Configuration
- **citadel-config.json**: Citadel dashboard system settings
- Dashboard ports, hosts, and API endpoints
- WebSocket configuration and timing settings

### Environment Configuration
- Environment-specific settings for development, testing, and production
- Managed by environment-manager.ts

### Deployment Configuration
- Deployment settings for different environments
- Production and staging configurations

### Network Configuration
- Proxy settings and network configurations
- Cross-family network settings

### Port Management
- Service port registry and management
- Service port allocation and tracking

### UI Configuration
- Theme configurations
- Image manifest and UI assets

### Behavior Configuration
- Application behavior settings
- Performance and warming configurations

### API Configuration
- API-specific configurations
- Feature status API settings

### Security Configuration
- Sensitive data and secrets
- TOTP seeds and authentication

### Local Development
- Local development overrides
- Template files for new setups

## Usage

Configuration files are loaded by the config-loader.js in the following order:
1. Default configuration (config.toml)
2. Environment-specific overrides
3. Local development overrides (if present)
4. Feature flags (features.toml)

## Security

- The vault/ directory contains sensitive data and should be secured
- Local configuration files should not be committed to version control
- API keys and secrets should use environment variables or vault storage
