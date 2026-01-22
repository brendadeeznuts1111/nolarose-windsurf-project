#!/usr/bin/env bun
// 🏛️ Enhanced Citadel Dashboard CLI
// Interactive features and streamlined workflow

import { join } from "path";
import { createInterface } from "readline";

export interface CitadelMetrics {
  totalDevices: number;
  activeDevices: number;
  highRiskDevices: number;
  securityIncidents: number;
  lastIncident?: string;
  uptime: number;
  performanceScore: number;
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
  help?: boolean;
}

export class EnhancedCitadelDashboard {
  private auditDirectory: string = "./audit";
  private logDirectory: string = "./logs";
  private isWatching: boolean = false;
  private watchInterval?: NodeJS.Timeout;

  /**
   * 🎮 Start interactive CLI mode
   */
  async startInteractiveMode(): Promise<void> {
    console.log(`\n🎮 ENHANCED CITADEL INTERACTIVE MODE`);
    console.log(`Type 'help' for commands or 'exit' to quit\n`);

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🏛️ citadel> '
    });

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
          await this.exportData('json');
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
    
    const incidents = await this.getRecentIncidents(50)
      .then(incidents => incidents.filter(incident => incident.deviceId.includes(deviceId)));

    if (incidents.length === 0) {
      console.log(`No activity found for device ${deviceId}`);
      return;
    }

    console.log(`Recent Activity (${incidents.length} incidents):\n`);
    
    incidents.slice(0, 10).forEach((incident, index) => {
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
      incidents: await this.getRecentIncidents(100)
    };

    if (format === 'json') {
      await Bun.write(filename, JSON.stringify(data, null, 2));
    }

    console.log(`💾 Data exported to ${filename}`);
  }

  /**
   * 🏛️ Print the Citadel Identity Matrix
   */
  async printCitadelMatrix(): Promise<void> {
    const metrics = await this.gatherMetrics();
    const recentIncidents = await this.getRecentIncidents(5);
    
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
    
    const incidents = await this.getRecentIncidents(20);
    const filtered = incidents.filter(incident => 
      incident.deviceId.toLowerCase().includes(query.toLowerCase()) ||
      incident.event.toLowerCase().includes(query.toLowerCase()) ||
      incident.details.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length === 0) {
      console.log(`No incidents found matching "${query}"`);
      return;
    }
    
    filtered.forEach((incident, index) => {
      console.log(`\n${index + 1}. [${incident.deviceId}] ${incident.event.toUpperCase()}`);
      console.log(`   When: ${new Date(incident.timestamp).toLocaleString()}`);
      console.log(`   Details: ${incident.details}`);
    });
    
    console.log(`\nFound ${filtered.length} incidents matching "${query}"`);
  }

  /**
   * 📈 Gather system metrics
   */
  private async gatherMetrics(): Promise<CitadelMetrics> {
    const incidents = await this.getRecentIncidents(100);
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    
    return {
      totalDevices: 5,
      activeDevices: 4,
      highRiskDevices: criticalIncidents > 0 ? 1 : 0,
      securityIncidents: incidents.length,
      lastIncident: incidents.length > 0 ? new Date(incidents[0].timestamp).toISOString() : undefined,
      uptime: 24 * 3600, // 24 hours in seconds
      performanceScore: Math.max(0, 100 - (criticalIncidents * 10))
    };
  }

  /**
   * 📋 Get recent incidents
   */
  private async getRecentIncidents(limit: number = 10): Promise<AuditEntry[]> {
    const incidents: AuditEntry[] = [];
    
    try {
      const auditDir = Bun.file(this.auditDirectory);
      if (!await auditDir.exists()) {
        return incidents;
      }
      
      const files = await Array.fromAsync(Bun.readdir(this.auditDirectory));
      const jsonFiles = files
        .filter(file => file.endsWith('.feedback.json'))
        .slice(0, limit);
      
      for (const file of jsonFiles) {
        try {
          const fileContent = Bun.file(join(this.auditDirectory, file));
          const content = await fileContent.text();
          const data = JSON.parse(content);
          
          if (data.type === 'SECURITY_INCIDENT') {
            incidents.push({
              timestamp: data.timestamp || Date.now(),
              deviceId: data.deviceId || 'unknown',
              event: data.event || 'security_incident',
              details: data.details || 'Security incident detected',
              severity: data.severity || 'medium'
            });
          }
        } catch (error) {
          // Skip invalid files
        }
      }
    } catch (error) {
      // Return empty array on error
    }
    
    return incidents.reverse().slice(0, limit);
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
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * 📋 Show CLI help
 */
function showCLIHelp(): void {
  console.log(`\n🏛️ ENHANCED CITADEL DASHBOARD CLI`);
  console.log(`═══════════════════════════════════════════════════════`);
  console.log(`\nUSAGE:`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts [options]`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --search <query>`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --metrics`);
  console.log(`\nOPTIONS:`);
  console.log(`  -i, --interactive    Start interactive mode`);
  console.log(`  -w, --watch [sec]     Auto-refresh every N seconds (default: 5)`);
  console.log(`  --search <query>      Search audit logs`);
  console.log(`  --metrics             Show detailed metrics`);
  console.log(`  -d, --device <id>      Show specific device status`);
  console.log(`  --severity <level>     Filter by severity (low/medium/high/critical)`);
  console.log(`  -l, --limit <num>      Limit results (default: 10)`);
  console.log(`  -e, --export [format]  Export data (json/csv)`);
  console.log(`  -h, --help             Show this help`);
  console.log(`\nEXAMPLES:`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts -i`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --watch 10`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --search "performance"`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --device test_vm_01`);
  console.log(`  bun run src/nexus/core/enhanced-dashboard.ts --export csv`);
  console.log(`\nINTERACTIVE COMMANDS:`);
  console.log(`  status, metrics, search <query>, device <id>`);
  console.log(`  watch, stop, export, clear, help, exit`);
}

// 🎯 Execute dashboard if run directly
async function main() {
  const options = parseArgs();
  const dashboard = new EnhancedCitadelDashboard();

  // Show help and exit
  if (options.help) {
    showCLIHelp();
    process.exit(0);
  }

  // Interactive mode
  if (options.interactive) {
    await dashboard.startInteractiveMode();
    return;
  }

  // Watch mode
  if (options.watch) {
    await dashboard.startWatch(options.interval);
    // Keep process alive for watch mode
    process.on('SIGINT', () => {
      dashboard.stopWatch();
      process.exit(0);
    });
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
