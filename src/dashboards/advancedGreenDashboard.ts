// src/admin/advancedGreenDashboard.ts
import { CashAppGreenClient } from "../cashapp/greenDeposit";
import { EnhancedLightningToGreenRouter } from "../finance/enhancedAutoRouter";
import { priceFeed } from "../price/realtimeFeed";
import { setTimeout } from "timers";
import chalk from "chalk";
import type { DashboardStats, PoolPerformance } from "../types";

export class AdvancedGreenYieldDashboard {
  private greenClient: CashAppGreenClient;
  private router: EnhancedLightningToGreenRouter;
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastBtcPrice: number = 0;

  constructor() {
    this.greenClient = new CashAppGreenClient();
    this.router = new EnhancedLightningToGreenRouter();
    this.lastBtcPrice = priceFeed.getCurrentPrice();
  }

  /**
   * Start the interactive dashboard
   */
  async start(): Promise<void> {
    console.clear();
    this.isRunning = true;
    
    // Setup real-time updates
    priceFeed.on("priceUpdate", this.handlePriceUpdate.bind(this));
    
    // Start dashboard loop
    while (this.isRunning) {
      try {
        await this.render();
        await this.waitForInput();
      } catch (error) {
        console.error(chalk.red(`Dashboard error: ${error}`));
        await this.sleep(2000);
      }
    }
  }

  /**
   * Render the main dashboard
   */
  private async render(): Promise<void> {
    const stats = await this.getDashboardStats();
    const topPools = await this.getTopPerformingPools();
    const recentActivity = await this.getRecentActivity();

    console.clear();
    
    // Header
    console.log(chalk.hex("#00D924").bold(`
╔════════════════════════════════════════════════════════════════════════╗
║   🟩 Cash App Green Yield Dashboard - Advanced Edition                ║
║   DuoPlus Family Pool Empire - Real-time Yield Generation             ║
╚════════════════════════════════════════════════════════════════════════╝
`));

    // Main Stats Panel
    this.renderMainStats(stats);
    
    // Performance Panel
    this.renderPerformancePanel(topPools);
    
    // Activity Panel
    this.renderActivityPanel(recentActivity);
    
    // Footer
    this.renderFooter(stats);
  }

  /**
   * Render main statistics panel
   */
  private renderMainStats(stats: DashboardStats): void {
    const priceColor = stats.priceChange24h >= 0 ? chalk.green : chalk.red;
    const priceSymbol = stats.priceChange24h >= 0 ? "📈" : "📉";
    
    console.log(chalk.gray("─".repeat(80)));
    console.log(chalk.bold("💰 Portfolio Overview:"));
    console.log(`  Total Deposited:     ${chalk.cyan("$" + stats.totalDeposited.toLocaleString())}`);
    console.log(`  Total Yield Generated: ${chalk.green("$" + stats.totalYieldGenerated.toLocaleString())}`);
    console.log(`  Active Families:      ${chalk.yellow(stats.activeFamilies.toString())}`);
    console.log(`  Current APY:          ${chalk.hex("#00D924")(stats.currentAPY.toFixed(2) + "%")}`);
    console.log(`  BTC Price:            ${priceColor("$" + stats.btcPrice.toLocaleString() + " " + priceSymbol + " " + (stats.priceChange24h * 100).toFixed(2) + "%")}`);
    console.log(`  Pending Routes:       ${chalk.yellow(stats.pendingRoutes.toString())}`);
    console.log(`  Today's Routing:      ${chalk.cyan("$" + stats.totalRoutedToday.toLocaleString())}`);
    console.log(`  Projected Monthly:    ${chalk.green("$" + stats.projectedMonthlyYield.toLocaleString())}`);
  }

  /**
   * Render performance panel
   */
  private renderPerformancePanel(pools: PoolPerformance[]): void {
    console.log(chalk.gray("\n─".repeat(80)));
    console.log(chalk.bold("🏆 Top Performing Families:"));
    
    if (pools.length === 0) {
      console.log(chalk.gray("  No pool data available"));
    } else {
      console.log(chalk.gray("  Rank  Pool Name                    Balance     Yield     APY    Growth"));
      console.log(chalk.gray("  ───── ────────────────────────── ─────────── ───────── ────── ───────"));
      
      pools.slice(0, 8).forEach((pool, idx) => {
        const medal = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"][idx];
        const growthColor = pool.growthRate >= 0 ? chalk.green : chalk.red;
        const growthSymbol = pool.growthRate >= 0 ? "📈" : "📉";
        
        console.log(
          `  ${medal}  ${pool.poolName.padEnd(25)} ` +
          `${chalk.cyan("$" + pool.balance.toLocaleString()).padEnd(11)} ` +
          `${chalk.green("$" + pool.yieldGenerated.toFixed(0)).padEnd(9)} ` +
          `${chalk.hex("#00D924")(pool.apy.toFixed(2) + "%").padEnd(7)} ` +
          `${growthColor(growthSymbol + " " + (pool.growthRate * 100).toFixed(1) + "%")}`
        );
      });
    }
  }

  /**
   * Render activity panel
   */
  private renderActivityPanel(activity: any[]): void {
    console.log(chalk.gray("\n─".repeat(80)));
    console.log(chalk.bold("⚡ Recent Activity:"));
    
    if (activity.length === 0) {
      console.log(chalk.gray("  No recent activity"));
    } else {
      activity.slice(0, 5).forEach(item => {
        const timeAgo = this.getTimeAgo(item.timestamp);
        const typeColor = item.type === "deposit" ? chalk.green : chalk.blue;
        
        console.log(
          `  ${typeColor("●")} ${item.description.padEnd(40)} ${chalk.gray(timeAgo)}`
        );
      });
    }
  }

  /**
   * Render footer with controls
   */
  private renderFooter(stats: DashboardStats): void {
    console.log(chalk.gray("\n─".repeat(80)));
    console.log(chalk.bold("🎮 Controls:"));
    console.log("  [R]efresh  [D]eposit  [W]ithdraw  [P]ools  [A]nalytics  [T]ransactions  [Q]uit");
    console.log(chalk.gray(`  Last updated: ${new Date().toLocaleString()} | Next update: 30s`));
    
    // Status indicators
    const indicators = [
      stats.pendingRoutes > 0 ? chalk.yellow(`⏳ ${stats.pendingRoutes} pending`) : chalk.green("✅ All routed"),
      stats.priceChange24h > 0.02 ? chalk.red("⚠️ High volatility") : chalk.green("🟢 Stable"),
      chalk.hex("#00D924")("🟩 Green Active")
    ];
    
    console.log(chalk.gray("  Status: " + indicators.join(" | ")));
  }

  /**
   * Get dashboard statistics
   */
  private async getDashboardStats(): Promise<DashboardStats> {
    const routerMetrics = this.router.getMetrics();
    const currentPrice = priceFeed.getCurrentPrice();
    const priceHistory = await priceFeed.get24hHistory();
    
    const priceChange24h = priceHistory.length > 0 
      ? (currentPrice - (priceHistory[0]?.btcUsd || currentPrice)) / (priceHistory[0]?.btcUsd || currentPrice)
      : 0;

    return {
      totalDeposited: await this.getTotalDeposited(),
      totalYieldGenerated: await this.getTotalYieldGenerated(),
      activeFamilies: await this.getActiveFamilyCount(),
      currentAPY: 0.0325,
      btcPrice: currentPrice,
      priceChange24h,
      pendingRoutes: await this.getPendingRouteCount(),
      totalRoutedToday: await this.getTodayRoutedAmount(),
      projectedMonthlyYield: routerMetrics.totalYieldProjected * 12
    };
  }

  /**
   * Get top performing pools
   */
  private async getTopPerformingPools(): Promise<PoolPerformance[]> {
    // This would query your database for pool performance
    return [
      {
        poolId: "pool1",
        poolName: "Johnson Family",
        balance: 15420.50,
        yieldGenerated: 501.17,
        apy: 3.25,
        lastDeposit: new Date(),
        growthRate: 0.05
      },
      {
        poolId: "pool2", 
        poolName: "Smith Family",
        balance: 12350.75,
        yieldGenerated: 401.40,
        apy: 3.25,
        lastDeposit: new Date(),
        growthRate: 0.03
      }
    ];
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(): Promise<any[]> {
    return [
      {
        type: "deposit",
        description: "$250.00 routed to Green - Johnson Family",
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        type: "route",
        description: "Price update: $45,250 (+1.2%)",
        timestamp: new Date(Date.now() - 2 * 60 * 1000)
      }
    ];
  }

  /**
   * Handle price updates
   */
  private handlePriceUpdate(priceData: any): void {
    const priceChange = (priceData.btcUsd - this.lastBtcPrice) / this.lastBtcPrice;
    
    if (Math.abs(priceChange) > 0.01) { // 1% change
      console.log(chalk.yellow(`\n📈 Significant price movement: ${priceChange > 0 ? "+" : ""}${(priceChange * 100).toFixed(2)}%`));
    }
    
    this.lastBtcPrice = priceData.btcUsd;
  }

  /**
   * Wait for user input
   */
  private async waitForInput(): Promise<void> {
    return new Promise((resolve) => {
      const onData = (chunk: Buffer) => {
        process.stdin.off("data", onData);
        const key = chunk.toString().toLowerCase();
        
        switch (key) {
          case 'r': resolve(); break; // Refresh
          case 'd': this.promptDeposit().then(resolve); break;
          case 'w': this.promptWithdraw().then(resolve); break;
          case 'p': this.showPoolDetails().then(resolve); break;
          case 'a': this.showAnalytics().then(resolve); break;
          case 't': this.showTransactions().then(resolve); break;
          case 'q': 
            this.isRunning = false;
            process.exit(0);
            break;
          default: resolve(); break;
        }
      };
      
      process.stdin.on("data", onData);
    });
  }

  /**
   * Helper methods (implementations would go here)
   */
  private async getTotalDeposited(): Promise<number> {
    return 285040.75;
  }

  private async getTotalYieldGenerated(): Promise<number> {
    return 9263.82;
  }

  private async getActiveFamilyCount(): Promise<number> {
    return 156;
  }

  private async getPendingRouteCount(): Promise<number> {
    return 3;
  }

  private async getTodayRoutedAmount(): Promise<number> {
    return 12450.50;
  }

  private getTimeAgo(timestamp: Date): string {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  private async promptDeposit(): Promise<void> {
    // Implementation for manual deposit
    console.log(chalk.yellow("\n💰 Manual deposit feature coming soon..."));
    await this.sleep(2000);
  }

  private async promptWithdraw(): Promise<void> {
    console.log(chalk.yellow("\n💸 Withdrawal feature coming soon..."));
    await this.sleep(2000);
  }

  private async showPoolDetails(): Promise<void> {
    console.log(chalk.yellow("\n👨‍👩‍👧‍👦 Pool details feature coming soon..."));
    await this.sleep(2000);
  }

  private async showAnalytics(): Promise<void> {
    console.log(chalk.yellow("\n📊 Analytics feature coming soon..."));
    await this.sleep(2000);
  }

  private async showTransactions(): Promise<void> {
    console.log(chalk.yellow("\n📜 Transaction history feature coming soon..."));
    await this.sleep(2000);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
