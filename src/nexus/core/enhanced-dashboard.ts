#!/usr/bin/env bun
// 🏛️ Enhanced Citadel Dashboard CLI
// Interactive features and streamlined workflow

import { join } from "path";
import { createInterface } from "readline";
import { AdvancedMetricsCollector } from "./advanced-metrics";

export interface CitadelMetrics {
  totalDevices: number;
  activeDevices: number;
  highRiskDevices: number;
  securityIncidents: number;
  lastIncident?: string;
  uptime: number;
  performanceScore: number;
  packageRegistryHealth?: number;
  typeScriptCoverage?: number;
  securityPosture?: number;
}

export interface AuditEntry {
  timestamp: number;
  deviceId: string;
  event: string;
  details: string;
  severity: string;
}

export interface CLIOptions {
  watch?: boolean;
  interval?: number;
  interactive?: boolean;
  export?: string;
  device?: string;
  severity?: string;
  limit?: number;
  search?: string;
  metrics?: boolean;
  advancedMetrics?: boolean;
  packageMetrics?: boolean;
  typescriptMetrics?: boolean;
  securityMetrics?: boolean;
  help?: boolean;
}

export class EnhancedCitadelDashboard {
  private auditDirectory: string;
  private watchInterval?: NodeJS.Timeout;
  private metricsCollector: AdvancedMetricsCollector;

  constructor(auditDirectory: string = './audit') {
    this.auditDirectory = auditDirectory;
    this.metricsCollector = new AdvancedMetricsCollector();
  }

  private isWatching: boolean = false;

  /**
   * 🎮 Start interactive CLI mode
   */
  async startInteractiveMode(): Promise<void> {
    console.log(`\n🎮 ENHANCED CITADEL INTERACTIVE MODE`);
    console.log(`Type 'help' for commands or 'exit' to quit\n`);

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const dashboard = new EnhancedCitadelDashboard();

    const handleCommand = async (input: string) => {
      const command = input.trim().toLowerCase();
      
      switch (command) {
        case 'help':
          this.showHelp();
          break;
        case 'status':
          await this.printCitadelMatrix();
          break;
        case 'metrics':
          await this.showDetailedMetrics();
          break;
        case 'advanced':
          await this.showAdvancedMetrics();
          break;
        case 'packages':
          await this.showPackageRegistryMetrics();
          break;
        case 'typescript':
          await this.showTypeScriptMetrics();
          break;
        case 'security':
          await this.showSecurityMetrics();
          break;
        case 'watch':
          await this.startWatch();
          break;
        case 'stop':
          this.stopWatch();
          break;
        case 'clear':
          console.clear();
          break;
        case 'export':
          await this.exportData();
          break;
        case 'exit':
        case 'quit':
          this.stopWatch();
          console.log('\n👋 Goodbye!');
          process.exit(0);
          break;
        default:
          if (command.startsWith('search ')) {
            const query = command.substring(7);
            await this.searchAuditLogs(query);
          } else if (command.startsWith('device ')) {
            const deviceId = command.substring(7);
            await this.showDeviceStatus(deviceId);
          } else if (command !== '') {
            console.log(`❌ Unknown command: ${command}`);
            console.log(`Type 'help' for available commands`);
          }
      }
      
      rl.prompt();
    };

    rl.on('line', handleCommand);
    rl.on('close', () => {
      this.stopWatch();
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });

    rl.prompt();
  }

  /**
   * 📊 Show help menu
   */
  showHelp(): void {
    console.log(`\n📋 AVAILABLE COMMANDS:`);
    console.log(`  status         - Show current dashboard status`);
    console.log(`  metrics        - Display detailed metrics`);
    console.log(`  search <query> - Search audit logs`);
    console.log(`  device <id>    - Show specific device status`);
    console.log(`  watch          - Start auto-refresh mode`);
    console.log(`  stop           - Stop auto-refresh`);
    console.log(`  export         - Export data to JSON`);
    console.log(`  clear          - Clear screen`);
    console.log(`  help           - Show this help`);
    console.log(`  exit/quit      - Exit interactive mode`);
  }

  /**
   * ⏰ Start watch mode with auto-refresh
   */
  async startWatch(interval: number = 5000): Promise<void> {
    if (this.isWatching) {
      console.log(`⏰ Already watching dashboard`);
      return;
    }

    this.isWatching = true;
    console.log(`⏰ Starting auto-refresh (every ${interval/1000}s)`);
    console.log(`Type 'stop' to disable watch mode\n`);

    this.watchInterval = setInterval(() => {
      this.printCitadelMatrix();
    }, interval);
  }

  /**
   * 🛑 Stop watch mode
   */
  stopWatch(): void {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
    }
    console.log(`🛑 Auto-refresh stopped`);
  }

  /**
   * 📱 Show specific device status
   */
  async showDeviceStatus(deviceId: string): Promise<void> {
    console.log(`\n📱 DEVICE STATUS: ${deviceId}`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    const incidents = await this.loadAuditEntries()
      .then(incidents => incidents.filter(incident => incident.deviceId.includes(deviceId)));

    if (incidents.length === 0) {
      console.log(`No activity found for device ${deviceId}`);
      return;
    }

    console.log(`Recent Activity (${incidents.length} incidents):\n`);
    
    incidents.slice(0, 10).forEach((incident: AuditEntry, index: number) => {
      console.log(`${index + 1}. ${incident.event.toUpperCase()}`);
      console.log(`   When: ${new Date(incident.timestamp).toLocaleString()}`);
      console.log(`   Details: ${incident.details}\n`);
    });
  }

  /**
   * 💾 Export dashboard data
   */
  async exportData(format: string = 'json'): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `citadel-export-${timestamp}.${format}`;
    
    const data = {
      timestamp: new Date().toISOString(),
      metrics: await this.gatherMetrics(),
      incidents: await this.loadAuditEntries()
    };

    if (format === 'json') {
      await Bun.write(filename, JSON.stringify(data, null, 2));
    }

    console.log(`💾 Data exported to ${filename}`);
  }

  /**
   * 📊 Show comprehensive advanced metrics
   */
  async showAdvancedMetrics(): Promise<void> {
    console.log(`\n📊 COMPREHENSIVE ADVANCED METRICS:`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    try {
      const report = await this.metricsCollector.generateComprehensiveReport();
      console.log(report);
    } catch (error) {
      console.error(`❌ Failed to generate advanced metrics: ${(error as Error).message}`);
    }
  }

  /**
   * 📦 Show package registry metrics
   */
  async showPackageRegistryMetrics(): Promise<void> {
    console.log(`\n📦 PACKAGE REGISTRY METRICS:`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    try {
      const registryMetrics = await this.metricsCollector.collectPackageRegistryMetrics();
      
      console.log(`\n📈 REGISTRY OVERVIEW:`);
      console.log(`   Total Packages:        ${registryMetrics.packages.length}`);
      console.log(`   Total Downloads:       ${registryMetrics.totalDownloads.toLocaleString()}`);
      console.log(`   Active Maintainers:     ${registryMetrics.activeMaintainers}`);
      console.log(`   Avg Security Score:     ${registryMetrics.avgSecurityScore.toFixed(1)}/100`);
      console.log(`   Registry Health:        ${registryMetrics.registryHealth.toFixed(1)}/100`);
      
      console.log(`\n🏆 TOP PACKAGES:`);
      registryMetrics.packages
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 5)
        .forEach((pkg, index) => {
          const riskIcon = pkg.riskLevel === 'critical' ? '🚨' : 
                          pkg.riskLevel === 'high' ? '⚠️' : 
                          pkg.riskLevel === 'medium' ? '🟡' : '✅';
          console.log(`   ${index + 1}. ${pkg.name}: ${pkg.downloads.toLocaleString()} downloads ${riskIcon}`);
        });
      
      console.log(`\n🔒 SECURITY DISTRIBUTION:`);
      const riskDist = registryMetrics.packages.reduce((acc, pkg) => {
        acc[pkg.riskLevel] = (acc[pkg.riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(riskDist).forEach(([risk, count]) => {
        const icon = risk === 'critical' ? '🚨' : 
                     risk === 'high' ? '⚠️' : 
                     risk === 'medium' ? '🟡' : '✅';
        console.log(`   ${icon} ${risk.toUpperCase()}: ${count} packages`);
      });
      
    } catch (error) {
      console.error(`❌ Failed to collect package registry metrics: ${(error as Error).message}`);
    }
  }

  /**
   * 📘 Show TypeScript analysis metrics
   */
  async showTypeScriptMetrics(): Promise<void> {
    console.log(`\n📘 TYPESCRIPT ANALYSIS METRICS:`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    try {
      const tsMetrics = await this.metricsCollector.collectTypeScriptMetrics();
      
      console.log(`\n📊 CODE QUALITY:`);
      console.log(`   Files:                  ${tsMetrics.files}`);
      console.log(`   Lines of Code:          ${tsMetrics.linesOfCode.toLocaleString()}`);
      console.log(`   Type Coverage:          ${tsMetrics.typeCoverage.toFixed(1)}%`);
      console.log(`   Strict Mode:            ${tsMetrics.strictMode ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Maintainability Index:  ${tsMetrics.maintainabilityIndex.toFixed(1)}/100`);
      
      console.log(`\n⚡ PERFORMANCE:`);
      console.log(`   Compile Time:           ${tsMetrics.compileTime}ms`);
      console.log(`   Bundle Size:            ${(tsMetrics.bundleSize / 1024).toFixed(1)}KB`);
      console.log(`   Complexity Score:       ${tsMetrics.complexity}`);
      console.log(`   Lint Errors:            ${tsMetrics.lintErrors}`);
      
      console.log(`\n🔍 TYPE SAFETY ANALYSIS:`);
      console.log(`   'any' Types:            ${tsMetrics.anyTypes} instances`);
      console.log(`   Type Safety Score:      ${tsMetrics.typeCoverage.toFixed(1)}%`);
      const quality = tsMetrics.maintainabilityIndex > 80 ? '🟢 Excellent' : 
                     tsMetrics.maintainabilityIndex > 60 ? '🟡 Good' : '🔴 Needs Improvement';
      console.log(`   Code Quality:           ${quality}`);
      
      console.log(`\n🎯 RECOMMENDATIONS:`);
      if (tsMetrics.typeCoverage < 80) {
        console.log(`   📚 Improve TypeScript type coverage (current: ${tsMetrics.typeCoverage.toFixed(1)}%)`);
      }
      if (!tsMetrics.strictMode) {
        console.log(`   🔧 Enable strict TypeScript mode for better type safety`);
      }
      if (tsMetrics.anyTypes > 10) {
        console.log(`   🛠️  Replace ${tsMetrics.anyTypes} 'any' types with proper types`);
      }
      if (tsMetrics.lintErrors > 0) {
        console.log(`   🧹 Fix ${tsMetrics.lintErrors} lint errors`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to analyze TypeScript metrics: ${(error as Error).message}`);
    }
  }

  /**
   * 🔒 Show security analysis metrics
   */
  async showSecurityMetrics(): Promise<void> {
    console.log(`\n🔒 SECURITY ANALYSIS METRICS:`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    try {
      const securityMetrics = await this.metricsCollector.collectSecurityMetrics();
      
      console.log(`\n🌐 URL PATTERN ANALYSIS:`);
      console.log(`   Total Patterns:         ${securityMetrics.urlPatterns.total}`);
      console.log(`   🚨 Critical Risk:        ${securityMetrics.urlPatterns.critical}`);
      console.log(`   ⚠️  High Risk:            ${securityMetrics.urlPatterns.high}`);
      console.log(`   🟡 Medium Risk:          ${securityMetrics.urlPatterns.medium}`);
      console.log(`   ✅ Low Risk:             ${securityMetrics.urlPatterns.low}`);
      
      if (securityMetrics.urlPatterns.critical > 0) {
        console.log(`\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:`);
        console.log(`   - ${securityMetrics.urlPatterns.critical} critical URL pattern risks detected`);
        console.log(`   - These patterns may lead to SSRF attacks`);
        console.log(`   - Review and fix immediately before deployment`);
      }
      
      console.log(`\n📦 DEPENDENCY SECURITY:`);
      console.log(`   Total Dependencies:      ${securityMetrics.dependencies.total}`);
      console.log(`   🚨 Vulnerabilities:      ${securityMetrics.dependencies.vulnerabilities}`);
      console.log(`   📅 Outdated Packages:    ${securityMetrics.dependencies.outdated}`);
      console.log(`   🔧 Dev Dependencies:     ${securityMetrics.dependencies.devDependencies}`);
      
      console.log(`\n💻 CODE SECURITY ANALYSIS:`);
      console.log(`   SQL Injection Risks:    ${securityMetrics.codeSecurity.sqliRisks}`);
      console.log(`   XSS Risks:              ${securityMetrics.codeSecurity.xssRisks}`);
      console.log(`   SSRF Risks:             ${securityMetrics.codeSecurity.ssrfRisks}`);
      console.log(`   Path Traversal Risks:   ${securityMetrics.codeSecurity.pathTraversalRisks}`);
      
      const securityScore = Math.max(0, 100 - (
        securityMetrics.urlPatterns.critical * 20 + 
        securityMetrics.urlPatterns.high * 10 + 
        securityMetrics.dependencies.vulnerabilities * 15
      ));
      
      console.log(`\n🛡️ SECURITY POSTURE SCORE: ${securityScore.toFixed(1)}/100`);
      const posture = securityScore > 80 ? '🟢 Excellent' : 
                     securityScore > 60 ? '🟡 Good' : '🔴 Needs Attention';
      console.log(`   Overall Posture:        ${posture}`);
      
      console.log(`\n🎯 SECURITY RECOMMENDATIONS:`);
      if (securityMetrics.urlPatterns.critical > 0) {
        console.log(`   🚨 Fix ${securityMetrics.urlPatterns.critical} critical URL pattern risks`);
      }
      if (securityMetrics.urlPatterns.high > 0) {
        console.log(`   ⚠️  Review ${securityMetrics.urlPatterns.high} high-risk URL patterns`);
      }
      if (securityMetrics.dependencies.vulnerabilities > 0) {
        console.log(`   🔐 Address ${securityMetrics.dependencies.vulnerabilities} security vulnerabilities`);
      }
      if (securityMetrics.dependencies.outdated > 0) {
        console.log(`   📦 Update ${securityMetrics.dependencies.outdated} outdated dependencies`);
      }
      if (securityMetrics.codeSecurity.xssRisks > 0 || securityMetrics.codeSecurity.ssrfRisks > 0) {
        console.log(`   🔍 Review code for ${securityMetrics.codeSecurity.xssRisks + securityMetrics.codeSecurity.ssrfRisks} security risks`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to analyze security metrics: ${(error as Error).message}`);
    }
  }

  /**
   * 🏛️ Print the Citadel Identity Matrix
   */
  async printCitadelMatrix(): Promise<void> {
    const metrics = await this.gatherMetrics();
    const recentIncidents = await this.loadAuditEntries();
    
    console.clear();
    
    // Header
    console.log(`┌─────────────── 🏛️ ENHANCED CITADEL MATRIX ───────────────┐`);
    console.log(`│  Android 13 Nexus Burner Identity Operations           │`);
    console.log(`└─────────────────────────────────────────────────────────┘`);
    
    // Status Overview
    console.log(`\n📊 OVERVIEW:`);
    console.log(`   Active Silos: ${metrics.activeDevices} / ${metrics.totalDevices}`);
    console.log(`   High-Risk:    ${metrics.highRiskDevices} devices`);
    console.log(`   Incidents:    ${metrics.securityIncidents} logged`);
    console.log(`   Performance:  ${metrics.performanceScore}% efficiency`);
    console.log(`   Uptime:       ${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`);
    
    // Device Status
    console.log(`\n📱 DEVICE STATUS:`);
    console.log(`   ┌─────────────────────────────────────────────────┐`);
    console.log(`   │ Device    │ Status │ Cycles │ Risk │ Last Activity │`);
    console.log(`   ├─────────────────────────────────────────────────┤`);
    console.log(`   │ cloud_vm_01 │ 🟢 ACTIVE │ 3      │ LOW  │ 2m ago       │`);
    console.log(`   │ cloud_vm_02 │ 🟡 WARN  │ 7      │ MED  │ 5m ago       │`);
    console.log(`   │ cloud_vm_03 │ 🟢 ACTIVE │ 2      │ LOW  │ 1m ago       │`);
    console.log(`   │ cloud_vm_04 │ 🔴 CRITICAL │ 12     │ HIGH │ 0m ago       │`);
    console.log(`   │ cloud_vm_05 │ 🟢 ACTIVE │ 1      │ LOW  │ 3m ago       │`);
    console.log(`   └─────────────────────────────────────────────────┘`);
    
    // Recent Incidents
    console.log(`\n🚨 RECENT INCIDENTS:`);
    recentIncidents.forEach((incident, index) => {
      console.log(`   ${index + 1}. [${incident.deviceId}] ${incident.event.toUpperCase()}`);
      console.log(`      ${new Date(incident.timestamp).toLocaleString()}`);
      console.log(`      ${incident.details}`);
    });
    
    // Quick Actions
    console.log(`\n⚡ QUICK ACTIONS:`);
    console.log(`   📊 View detailed metrics:     bun run src/nexus/core/enhanced-dashboard.ts --metrics`);
    console.log(`   🔍 Search audit logs:        bun run src/nexus/core/enhanced-dashboard.ts --search <query>`);
    console.log(`   📱 Device status check:      bun run src/nexus/core/enhanced-dashboard.ts --device <device_id>`);
    console.log(`   🔄 Refresh dashboard:        bun run src/nexus/core/enhanced-dashboard.ts`);
    console.log(`   🎮 Interactive mode:         bun run src/nexus/core/enhanced-dashboard.ts --interactive`);
    
    // Status
    const securityStatus = metrics.highRiskDevices > 0 ? '⚠️ ATTENTION REQUIRED' : '✅ ALL SYSTEMS OPERATIONAL';
    console.log(`\n🛡️ SECURITY STATUS: ${securityStatus}`);
    if (metrics.highRiskDevices > 0) {
      console.log(`   ⚠️  ${metrics.highRiskDevices} devices require immediate attention`);
    }
    
    console.log(`\nLast updated: ${new Date().toLocaleString()} | Auto-refresh: 30s`);
  }

  /**
   * 📊 Show detailed metrics
   */
  async showDetailedMetrics(): Promise<void> {
    console.log(`\n📊 DETAILED METRICS:`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    const metrics = await this.gatherMetrics();
    
    console.log(`\nDEVICE PERFORMANCE:`);
    console.log(`   Total Devices:        ${metrics.totalDevices}`);
    console.log(`   Active Devices:       ${metrics.activeDevices}`);
    console.log(`   High-Risk Devices:    ${metrics.highRiskDevices}`);
    console.log(`   Average Response:     45ms`);
    console.log(`   Success Rate:         98.2%`);
    
    console.log(`\nSECURITY OPERATIONS:`);
    console.log(`   Total Incidents:      ${metrics.securityIncidents}`);
    console.log(`   Critical Incidents:   ${Math.floor(metrics.securityIncidents * 0.1)}`);
    console.log(`   Resolved Today:       ${Math.floor(metrics.securityIncidents * 0.3)}`);
    console.log(`   Average Resolution:   2.3h`);
    
    console.log(`\nSYSTEM PERFORMANCE:`);
    console.log(`   Uptime:               ${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`);
    console.log(`   Performance Score:    ${metrics.performanceScore}%`);
    console.log(`   Memory Usage:         67%`);
    console.log(`   CPU Usage:            23%`);
    console.log(`   Network Latency:      12ms`);
    
    console.log(`\nFINANCIAL OPERATIONS:`);
    console.log(`   Active Burners:       12`);
    console.log(`   Daily Transaction Vol: $45,000`);
    console.log(`   Success Rate:         94.7%`);
  }

  /**
   * 🔍 Search audit logs
   */
  async searchAuditLogs(query: string): Promise<void> {
    console.log(`\n🔍 SEARCH RESULTS FOR: "${query}"`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    const incidents = await this.loadAuditEntries();
    const filtered = incidents.filter(incident => 
      incident.deviceId.toLowerCase().includes(query.toLowerCase()) ||
      incident.event.toLowerCase().includes(query.toLowerCase()) ||
      incident.details.toLowerCase().includes(query.toLowerCase())
    );
    
    filtered.slice(0, 20).forEach((incident: AuditEntry, index: number) => {
      console.log(`${index + 1}. ${incident.event.toUpperCase()} (${incident.severity.toUpperCase()})`);
      console.log(`   Device: ${incident.deviceId}`);
      console.log(`   When: ${new Date(incident.timestamp).toLocaleString()}`);
      console.log(`   Details: ${incident.details}`);
    });
    
    console.log(`\nFound ${filtered.length} incidents matching "${query}"`);
  }

  /**
   * 📈 Gather system metrics
   */
  private async gatherMetrics(): Promise<CitadelMetrics> {
    const incidents = await this.loadAuditEntries();
    const criticalIncidents = incidents.filter((i: AuditEntry) => i.severity === 'critical').length;
    
    // Collect advanced metrics
    let packageRegistryHealth = 85;
    let typeScriptCoverage = 90;
    let securityPosture = 75;
    
    try {
      const [registryMetrics, tsMetrics, securityMetrics] = await Promise.all([
        this.metricsCollector.collectPackageRegistryMetrics(),
        this.metricsCollector.collectTypeScriptMetrics(),
        this.metricsCollector.collectSecurityMetrics()
      ]);
      
      packageRegistryHealth = registryMetrics.registryHealth;
      typeScriptCoverage = tsMetrics.typeCoverage;
      
      securityPosture = Math.max(0, 100 - (
        securityMetrics.urlPatterns.critical * 20 + 
        securityMetrics.urlPatterns.high * 10 + 
        securityMetrics.dependencies.vulnerabilities * 15
      ));
    } catch (error) {
      // Use defaults if advanced metrics fail
    }
    
    return {
      totalDevices: 5,
      activeDevices: 4,
      highRiskDevices: criticalIncidents > 0 ? 1 : 0,
      securityIncidents: incidents.length,
      lastIncident: incidents.length > 0 ? new Date(incidents[0].timestamp).toISOString() : undefined,
      uptime: 24 * 3600, // 24 hours in seconds
      performanceScore: Math.max(0, 100 - (criticalIncidents * 10)),
      packageRegistryHealth,
      typeScriptCoverage,
      securityPosture
    };
  }

  /**
   * 📋 Get recent incidents
   */
  private async loadAuditEntries(): Promise<AuditEntry[]> {
    try {
      const glob = new Bun.Glob('*.feedback.json');
      const files = await Array.fromAsync(glob.scan({ cwd: this.auditDirectory }));
      const entries: AuditEntry[] = [];

      for (const file of files) {
        try {
          const fileContent = await Bun.file(join(this.auditDirectory, file as string)).text();
          const entry = JSON.parse(fileContent) as AuditEntry;
          entries.push(entry);
        } catch (error) {
          // Skip invalid files
        }
      }
      
      return entries;
    } catch (error) {
      // Return empty array on error
      return [];
    }
  }
}

/**
 * 🎯 Parse CLI arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--watch':
      case '-w':
        options.watch = true;
        options.interval = parseInt(args[i + 1]) || 5000;
        i++;
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--export':
      case '-e':
        options.export = args[i + 1] || 'json';
        i++;
        break;
      case '--device':
      case '-d':
        options.device = args[i + 1];
        i++;
        break;
      case '--severity':
        options.severity = args[i + 1];
        i++;
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[i + 1]) || 10;
        i++;
        break;
      case '--search':
        options.search = args[i + 1];
        i++;
        break;
      case '--metrics':
      case '-m':
        options.metrics = true;
        break;
      case '--advanced-metrics':
        options.advancedMetrics = true;
        break;
      case '--package-metrics':
        options.packageMetrics = true;
        break;
      case '--typescript-metrics':
        options.typescriptMetrics = true;
        break;
      case '--security-metrics':
        options.securityMetrics = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * 📖 Show comprehensive CLI help
 */
function showHelp(): void {
  console.log(`🏛️ ENHANCED CITADEL DASHBOARD CLI`);
  console.log(`═══════════════════════════════════════════════════════`);

  console.log(`\nUSAGE:`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts [options]`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --search <query>`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --metrics`);

  console.log(`\nOPTIONS:`);
  console.log(`  -i, --interactive           Start interactive mode`);
  console.log(`  -w, --watch [sec]            Auto-refresh every N seconds (default: 5)`);
  console.log(`  --search <query>             Search audit logs`);
  console.log(`  --metrics                    Show detailed metrics`);
  console.log(`  --advanced-metrics           Show comprehensive advanced metrics`);
  console.log(`  --package-metrics            Show package registry analysis`);
  console.log(`  --typescript-metrics         Show TypeScript analysis`);
  console.log(`  --security-metrics           Show security analysis`);
  console.log(`  -d, --device <id>            Show specific device status`);
  console.log(`  --severity <level>           Filter by severity (low/medium/high/critical)`);
  console.log(`  -l, --limit <num>            Limit results (default: 10)`);
  console.log(`  -e, --export [format]        Export data (json/csv)`);
  console.log(`  -h, --help                   Show this help`);

  console.log(`\nEXAMPLES:`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts -i`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --watch 10`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --search "performance"`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --device test_vm_01`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --export csv`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --advanced-metrics`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --package-metrics`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --typescript-metrics`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --security-metrics`);

  console.log(`\nINTERACTIVE COMMANDS:`);
  console.log(`  status, metrics, search <query>, device <id>`);
  console.log(`  watch, stop, export, clear, help, exit`);
  console.log(`  advanced, packages, typescript, security`);

  console.log(`\n📊 ADVANCED METRICS FEATURES:`);
  console.log(`  📦 Package Registry Analysis - Downloads, security scores, maintainers`);
  console.log(`  📘 TypeScript Analysis - Type coverage, complexity, maintainability`);
  console.log(`  🔒 Security Analysis - URL patterns, dependencies, code security`);
  console.log(`  📈 Comprehensive Reports - Full system health assessment`);
}

// 🎯 Execute dashboard if run directly
async function main() {
  const options = parseArgs();
  const dashboard = new EnhancedCitadelDashboard();

  // Show help and exit
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Interactive mode
  if (options.interactive) {
    await dashboard.startInteractiveMode();
    return;
  }

  // Watch mode
  if (options.watch) {
    await dashboard.startWatch(options.interval || 5000);
    return;
  }

  // Advanced metrics modes
  if (options.advancedMetrics) {
    await dashboard.showAdvancedMetrics();
    return;
  }

  if (options.packageMetrics) {
    await dashboard.showPackageRegistryMetrics();
    return;
  }

  if (options.typescriptMetrics) {
    await dashboard.showTypeScriptMetrics();
    return;
  }

  if (options.securityMetrics) {
    await dashboard.showSecurityMetrics();
    return;
  }

  // Export mode
  if (options.export) {
    await dashboard.exportData(options.export);
    return;
  }

  // Device status
  if (options.device) {
    await dashboard.showDeviceStatus(options.device);
    return;
  }

  // Original CLI compatibility
  if (process.argv.includes('--metrics')) {
    await dashboard.showDetailedMetrics();
  } else if (process.argv.includes('--search')) {
    const searchIndex = process.argv.indexOf('--search');
    const query = process.argv.slice(searchIndex + 1).join(' ');
    if (!query) {
      console.error('❌ Please provide a search query');
      process.exit(1);
    }
    await dashboard.searchAuditLogs(query);
  } else {
    await dashboard.printCitadelMatrix();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
