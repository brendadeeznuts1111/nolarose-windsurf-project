// src/admin/config-freeze.ts - Configuration Freeze/Lock System
// Prevents hot reloading and provides configuration locking mechanism

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

interface FreezeState {
  frozen: boolean;
  timestamp: string;
  reason?: string;
  configHash?: string;
}

export class ConfigFreeze {
  private static readonly FREEZE_FILE = "./.config-freeze.json";
  private static instance: ConfigFreeze;
  private isFrozen: boolean = false;
  private freezeReason?: string;

  private constructor() {
    this.loadFreezeState();
  }

  public static getInstance(): ConfigFreeze {
    if (!ConfigFreeze.instance) {
      ConfigFreeze.instance = new ConfigFreeze();
    }
    return ConfigFreeze.instance;
  }

  /**
   * Load freeze state from file
   */
  private loadFreezeState(): void {
    if (existsSync(ConfigFreeze.FREEZE_FILE)) {
      try {
        const data = readFileSync(ConfigFreeze.FREEZE_FILE, "utf-8");
        const state: FreezeState = JSON.parse(data);
        this.isFrozen = state.frozen;
        this.freezeReason = state.reason;
        
        if (this.isFrozen) {
          console.log(`🔒 Configuration is frozen (since ${state.timestamp})`);
          if (state.reason) {
            console.log(`   Reason: ${state.reason}`);
          }
        }
      } catch (error) {
        console.warn("⚠️ Could not load freeze state:", error);
      }
    }
  }

  /**
   * Save freeze state to file
   */
  private saveFreezeState(reason?: string): void {
    const state: FreezeState = {
      frozen: this.isFrozen,
      timestamp: new Date().toISOString(),
      reason: reason || this.freezeReason,
      configHash: this.getCurrentConfigHash(),
    };

    try {
      writeFileSync(ConfigFreeze.FREEZE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error("❌ Could not save freeze state:", error);
    }
  }

  /**
   * Freeze the configuration (prevent hot reloading)
   */
  public freeze(reason?: string): void {
    if (this.isFrozen) {
      console.log("⚠️ Configuration is already frozen");
      return;
    }

    this.isFrozen = true;
    this.freezeReason = reason || "Manual freeze";
    this.saveFreezeState();
    
    console.log("🔒 Configuration frozen!");
    console.log(`   Reason: ${this.freezeReason}`);
    console.log("   Hot reloading is now disabled");
    console.log("   Use 'config:unfreeze' to re-enable");
  }

  /**
   * Unfreeze the configuration (enable hot reloading)
   */
  public unfreeze(): void {
    if (!this.isFrozen) {
      console.log("ℹ️ Configuration is not frozen");
      return;
    }

    this.isFrozen = false;
    const previousReason = this.freezeReason;
    this.freezeReason = undefined;
    
    // Remove freeze file
    try {
      if (existsSync(ConfigFreeze.FREEZE_FILE)) {
        const fs = require("fs");
        fs.unlinkSync(ConfigFreeze.FREEZE_FILE);
      }
    } catch (error) {
      console.warn("⚠️ Could not remove freeze file:", error);
    }
    
    console.log("🔓 Configuration unfrozen!");
    if (previousReason) {
      console.log(`   Previously frozen for: ${previousReason}`);
    }
    console.log("   Hot reloading is now enabled");
  }

  /**
   * Check if configuration is frozen
   */
  public isConfigurationFrozen(): boolean {
    return this.isFrozen;
  }

  /**
   * Get freeze status
   */
  public getFreezeStatus(): FreezeState | null {
    if (!this.isFrozen) {
      return null;
    }

    return {
      frozen: this.isFrozen,
      timestamp: new Date().toISOString(),
      reason: this.freezeReason,
      configHash: this.getCurrentConfigHash(),
    };
  }

  /**
   * Get current configuration hash
   */
  private getCurrentConfigHash(): string {
    const crypto = require("crypto");
    const envContent = Object.entries(process.env)
      .filter(([key]) => key.startsWith("DUOPLUS_"))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    
    return crypto.createHash("sha256").update(envContent).digest("hex").substring(0, 8);
  }

  /**
   * Validate configuration changes (prevents changes when frozen)
   */
  public validateConfigChange(newConfig: any): { valid: boolean; reason?: string } {
    if (!this.isFrozen) {
      return { valid: true };
    }

    const newHash = this.getConfigHash(newConfig);
    const currentHash = this.getCurrentConfigHash();
    
    if (newHash !== currentHash) {
      return {
        valid: false,
        reason: `Configuration is frozen. Cannot change configuration while frozen. Reason: ${this.freezeReason}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get configuration hash for any config object
   */
  private getConfigHash(config: any): string {
    const crypto = require("crypto");
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash("sha256").update(configString).digest("hex").substring(0, 8);
  }

  /**
   * Generate freeze status HTML for web interface
   */
  public generateFreezeStatusHTML(): string {
    if (!this.isFrozen) {
      return `
        <div class="freeze-status unfrozen">
          <div class="freeze-indicator">🔓 Unfrozen</div>
          <div class="freeze-description">Configuration changes are allowed</div>
          <button class="freeze-btn" onclick="freezeConfig()">
            🔒 Freeze Configuration
          </button>
        </div>
      `;
    }

    return `
      <div class="freeze-status frozen">
        <div class="freeze-indicator">🔒 Frozen</div>
        <div class="freeze-description">
          Configuration is locked (since ${new Date().toLocaleString()})
          ${this.freezeReason ? `<br>Reason: ${this.freezeReason}` : ""}
        </div>
        <button class="unfreeze-btn" onclick="unfreezeConfig()">
          🔓 Unfreeze Configuration
        </button>
      </div>
    `;
  }
}

// Export singleton instance
export const configFreeze = ConfigFreeze.getInstance();
