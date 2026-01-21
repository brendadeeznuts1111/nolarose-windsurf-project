# Windsurf Project

A comprehensive fraud detection and risk analysis system built with Bun.

## 🚀 Features

- **Anomaly Detection**: Advanced pattern recognition and anomaly prediction
- **Risk Scoring**: Real-time risk assessment and scoring algorithms
- **Privacy Protection**: Ghost shield for privacy handling and proxy detection
- **Dashboard**: Interactive risk heatmap and visualization tools
- **CLI Tool**: Command-line interface for risk hunting and analysis

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

- `bun run build` - Build the CLI tool
- `bun test` - Run test suite
- `bun run type-check` - TypeScript type checking
- `bun run lint` - Code linting with Biome
- `bun run format` - Code formatting with Biome
- `bun run release` - Create a new release and publish

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
