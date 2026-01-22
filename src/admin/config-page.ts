// src/admin/config-page.ts - Configuration Status Page
// Web interface for viewing all environment variables and their status

import { config } from "../config/config";
import { existsSync } from "fs";
import { configFreeze } from "./config-freeze";

interface ConfigStatus {
  name: string;
  value: string;
  status: 'valid' | 'warning' | 'error';
  description: string;
  category: string;
  required: boolean;
}

export class ConfigPage {
  private config = config.getConfig();

  /**
   * Generate HTML configuration page
   */
  public generateConfigPage(): string {
    const statuses = this.getAllConfigStatuses();
    const summary = this.getSummary(statuses);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuoPlus Configuration Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-card h3 {
            font-size: 2rem;
            margin-bottom: 5px;
        }
        
        .summary-card.valid { color: #22c55e; }
        .summary-card.warning { color: #f59e0b; }
        .summary-card.error { color: #ef4444; }
        
        .categories {
            padding: 30px;
        }
        
        .category {
            margin-bottom: 40px;
        }
        
        .category h2 {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        
        .config-grid {
            display: grid;
            gap: 15px;
        }
        
        .config-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            display: grid;
            grid-template-columns: 250px 1fr auto;
            align-items: center;
            gap: 20px;
            transition: all 0.2s ease;
        }
        
        .config-item:hover {
            background: #f3f4f6;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .config-name {
            font-weight: 600;
            color: #374151;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
        }
        
        .config-details {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .config-value {
            font-family: 'Monaco', 'Menlo', monospace;
            background: white;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #d1d5db;
            font-size: 0.9rem;
            word-break: break-all;
        }
        
        .config-description {
            color: #6b7280;
            font-size: 0.85rem;
        }
        
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-badge.valid {
            background: #dcfce7;
            color: #166534;
        }
        
        .status-badge.warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-badge.error {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .required {
            color: #ef4444;
            font-weight: 600;
        }
        
        .freeze-status {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .freeze-status.frozen {
            border-color: #ef4444;
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }
        
        .freeze-status.unfrozen {
            border-color: #22c55e;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }
        
        .freeze-indicator {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .freeze-status.frozen .freeze-indicator {
            color: #dc2626;
        }
        
        .freeze-status.unfrozen .freeze-indicator {
            color: #16a34a;
        }
        
        .freeze-description {
            color: #6b7280;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        
        .freeze-btn, .unfreeze-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
        }
        
        .freeze-btn {
            background: #ef4444;
            color: white;
        }
        
        .freeze-btn:hover {
            background: #dc2626;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        
        .unfreeze-btn {
            background: #22c55e;
            color: white;
        }
        
        .unfreeze-btn:hover {
            background: #16a34a;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }
        
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 50px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transition: all 0.2s ease;
        }
        
        .refresh-btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }
        
        .environment-info {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .environment-info strong {
            color: #1e40af;
        }
        
        @media (max-width: 768px) {
            .config-item {
                grid-template-columns: 1fr;
                gap: 10px;
            }
            
            .summary {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚙️ DuoPlus Configuration</h1>
            <p>Environment Variables and System Status</p>
        </div>
        
        <div class="environment-info">
            <strong>Environment:</strong> ${this.config.duoplus.environment} | 
            <strong>Debug Mode:</strong> ${this.config.duoplus.debug ? 'Enabled' : 'Disabled'} | 
            <strong>Metrics:</strong> ${this.config.duoplus.metricsEnabled ? 'Enabled' : 'Disabled'}
        </div>
        
        ${configFreeze.generateFreezeStatusHTML()}
        
        <div class="summary">
            <div class="summary-card valid">
                <h3>${summary.valid}</h3>
                <p>Valid Configs</p>
            </div>
            <div class="summary-card warning">
                <h3>${summary.warnings}</h3>
                <p>Warnings</p>
            </div>
            <div class="summary-card error">
                <h3>${summary.errors}</h3>
                <p>Errors</p>
            </div>
            <div class="summary-card">
                <h3>${summary.total}</h3>
                <p>Total Variables</p>
            </div>
        </div>
        
        <div class="categories">
            ${this.generateCategoryHTML(statuses)}
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">
        🔄 Refresh
    </button>
    
    <script>
        // Auto-refresh every 30 seconds (disabled when frozen)
        let autoRefreshEnabled = true;
        let refreshInterval;
        
        function startAutoRefresh() {
            if (autoRefreshEnabled) {
                refreshInterval = setTimeout(() => {
                    location.reload();
                }, 30000);
            }
        }
        
        function stopAutoRefresh() {
            if (refreshInterval) {
                clearTimeout(refreshInterval);
            }
        }
        
        // Freeze configuration
        async function freezeConfig() {
            const reason = prompt("Enter reason for freezing configuration (optional):");
            
            try {
                const response = await fetch('/api/config/freeze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ reason: reason || 'Manual freeze via web interface' }),
                });
                
                if (response.ok) {
                    alert('✅ Configuration frozen successfully!');
                    location.reload();
                } else {
                    alert('❌ Failed to freeze configuration');
                }
            } catch (error) {
                alert('❌ Error freezing configuration: ' + error.message);
            }
        }
        
        // Unfreeze configuration
        async function unfreezeConfig() {
            if (!confirm('Are you sure you want to unfreeze the configuration? This will re-enable hot reloading.')) {
                return;
            }
            
            try {
                const response = await fetch('/api/config/unfreeze', {
                    method: 'POST',
                });
                
                if (response.ok) {
                    alert('✅ Configuration unfrozen successfully!');
                    location.reload();
                } else {
                    alert('❌ Failed to unfreeze configuration');
                }
            } catch (error) {
                alert('❌ Error unfreezing configuration: ' + error.message);
            }
        }
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && e.ctrlKey) {
                e.preventDefault();
                location.reload();
            }
            if (e.key === 'f' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                freezeConfig();
            }
            if (e.key === 'u' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                unfreezeConfig();
            }
        });
        
        // Start auto-refresh
        startAutoRefresh();
    </script>
</body>
</html>`;
  }

  /**
   * Get all configuration statuses
   */
  private getAllConfigStatuses(): ConfigStatus[] {
    const statuses: ConfigStatus[] = [];
    const env = process.env;
    const duoplus = this.config.duoplus;

    // Server Configuration
    statuses.push(
      {
        name: 'DUOPLUS_ADMIN_PORT',
        value: duoplus.port.toString(),
        status: this.validatePort(duoplus.port),
        description: 'Admin API server port',
        category: 'Server Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_API_HOST',
        value: duoplus.host,
        status: duoplus.host ? 'valid' : 'error',
        description: 'API server host address',
        category: 'Server Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_DB_PATH',
        value: duoplus.dbPath,
        status: this.validateFileExists(duoplus.dbPath, true),
        description: 'SQLite database file path',
        category: 'Server Configuration',
        required: true
      }
    );

    // Security Configuration
    statuses.push(
      {
        name: 'DUOPLUS_JWT_SECRET',
        value: this.maskSecret(duoplus.security.jwtSecret),
        status: this.validateJWTSecret(duoplus.security.jwtSecret),
        description: 'JWT signing secret (32+ chars required)',
        category: 'Security Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_JWT_EXPIRY',
        value: `${duoplus.security.jwtExpiry}s`,
        status: duoplus.security.jwtExpiry > 0 ? 'valid' : 'error',
        description: 'JWT token expiry time',
        category: 'Security Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_ADMIN_SESSION_TIMEOUT',
        value: `${duoplus.security.sessionTimeout}s`,
        status: duoplus.security.sessionTimeout > 0 ? 'valid' : 'warning',
        description: 'Admin session timeout',
        category: 'Security Configuration',
        required: true
      }
    );

    // KYC Configuration
    statuses.push(
      {
        name: 'DUOPLUS_KYC_PROVIDER',
        value: duoplus.kyc.provider,
        status: duoplus.kyc.provider ? 'valid' : 'error',
        description: 'KYC verification provider',
        category: 'KYC Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_KYC_API_KEY',
        value: this.maskSecret(duoplus.kyc.apiKey),
        status: this.validateAPIKey(duoplus.kyc.apiKey, duoplus.environment),
        description: 'KYC provider API key',
        category: 'KYC Configuration',
        required: true
      }
    );

    // Lightning Network Configuration
    statuses.push(
      {
        name: 'DUOPLUS_LIGHTNING_ENDPOINT',
        value: duoplus.lightning.endpoint,
        status: duoplus.lightning.endpoint ? 'valid' : 'warning',
        description: 'Lightning Network API endpoint',
        category: 'Lightning Network',
        required: false
      },
      {
        name: 'DUOPLUS_LIGHTNING_MACAROON',
        value: this.maskSecret(duoplus.lightning.macaroon),
        status: duoplus.lightning.macaroon ? 'valid' : 'warning',
        description: 'Lightning Network macaroon',
        category: 'Lightning Network',
        required: false
      },
      {
        name: 'DUOPLUS_LIGHTNING_CERT_PATH',
        value: duoplus.lightning.certPath,
        status: this.validateFileExists(duoplus.lightning.certPath, false),
        description: 'Lightning Network certificate path',
        category: 'Lightning Network',
        required: false
      }
    );

    // S3 Configuration
    statuses.push(
      {
        name: 'DUOPLUS_S3_BUCKET',
        value: duoplus.s3.bucket,
        status: duoplus.s3.bucket ? 'valid' : 'warning',
        description: 'S3 bucket for caching',
        category: 'S3 Configuration',
        required: false
      },
      {
        name: 'DUOPLUS_S3_REGION',
        value: duoplus.s3.region,
        status: duoplus.s3.region ? 'valid' : 'warning',
        description: 'AWS S3 region',
        category: 'S3 Configuration',
        required: false
      },
      {
        name: 'DUOPLUS_S3_ACCESS_KEY',
        value: this.maskSecret(duoplus.s3.accessKey),
        status: this.validateAPIKey(duoplus.s3.accessKey, duoplus.environment),
        description: 'AWS S3 access key',
        category: 'S3 Configuration',
        required: false
      }
    );

    // Performance Configuration
    statuses.push(
      {
        name: 'DUOPLUS_CACHE_TTL',
        value: `${duoplus.performance.cacheTTL}s`,
        status: duoplus.performance.cacheTTL >= 30 ? 'valid' : 'warning',
        description: 'Cache time-to-live',
        category: 'Performance Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_MAX_CONCURRENT_REBALANCING',
        value: duoplus.performance.maxConcurrentRebalancing.toString(),
        status: duoplus.performance.maxConcurrentRebalancing <= 20 ? 'valid' : 'warning',
        description: 'Maximum concurrent rebalancing operations',
        category: 'Performance Configuration',
        required: true
      },
      {
        name: 'DUOPLUS_APY_REFRESH_INTERVAL',
        value: `${duoplus.performance.apyRefreshInterval}s`,
        status: duoplus.performance.apyRefreshInterval >= 10 ? 'valid' : 'warning',
        description: 'APY data refresh interval',
        category: 'Performance Configuration',
        required: true
      }
    );

    // Feature Flags
    statuses.push(
      {
        name: 'DUOPLUS_ENABLE_AI_RISK_PREDICTION',
        value: duoplus.features.aiRiskPrediction.toString(),
        status: 'valid',
        description: 'Enable AI-powered risk prediction',
        category: 'Feature Flags',
        required: false
      },
      {
        name: 'DUOPLUS_ENABLE_FAMILY_CONTROLS',
        value: duoplus.features.familyControls.toString(),
        status: 'valid',
        description: 'Enable family sponsorship controls',
        category: 'Feature Flags',
        required: false
      },
      {
        name: 'DUOPLUS_ENABLE_CASH_APP_PRIORITY',
        value: duoplus.features.cashAppPriority.toString(),
        status: 'valid',
        description: 'Enable Cash App priority processing',
        category: 'Feature Flags',
        required: false
      }
    );

    // Bun Configuration
    statuses.push(
      {
        name: 'BUN_CONFIG_VERBOSE_FETCH',
        value: this.config.bun.verboseFetch ? '1' : '0',
        status: 'valid',
        description: 'Enable verbose fetch logging',
        category: 'Bun Configuration',
        required: false
      },
      {
        name: 'BUN_RUNTIME_TRANSPILER_CACHE_PATH',
        value: this.config.bun.cachePath,
        status: this.validateFileExists(this.config.bun.cachePath, true),
        description: 'Bun transpiler cache path',
        category: 'Bun Configuration',
        required: false
      },
      {
        name: 'DO_NOT_TRACK',
        value: this.config.bun.doNotTrack ? '1' : '0',
        status: 'valid',
        description: 'Disable Bun telemetry',
        category: 'Bun Configuration',
        required: false
      }
    );

    return statuses;
  }

  /**
   * Generate HTML for each category
   */
  private generateCategoryHTML(statuses: ConfigStatus[]): string {
    const categories = Array.from(new Set(statuses.map(s => s.category)));
    
    return categories.map(category => {
      const categoryStatuses = statuses.filter(s => s.category === category);
      
      return `
        <div class="category">
            <h2>${category}</h2>
            <div class="config-grid">
                ${categoryStatuses.map(status => `
                    <div class="config-item">
                        <div class="config-name">
                            ${status.name}
                            ${status.required ? '<span class="required">*</span>' : ''}
                        </div>
                        <div class="config-details">
                            <div class="config-value">${status.value}</div>
                            <div class="config-description">${status.description}</div>
                        </div>
                        <div class="status-badge ${status.status}">
                            ${status.status}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get summary statistics
   */
  private getSummary(statuses: ConfigStatus[]) {
    return {
      valid: statuses.filter(s => s.status === 'valid').length,
      warnings: statuses.filter(s => s.status === 'warning').length,
      errors: statuses.filter(s => s.status === 'error').length,
      total: statuses.length
    };
  }

  /**
   * Validation helpers
   */
  private validatePort(port: number): 'valid' | 'warning' | 'error' {
    if (port < 1024 || port > 65535) return 'error';
    if (port < 3000) return 'warning';
    return 'valid';
  }

  private validateFileExists(path: string, required: boolean): 'valid' | 'warning' | 'error' {
    if (!path) return required ? 'error' : 'warning';
    if (existsSync(path)) return 'valid';
    return required ? 'error' : 'warning';
  }

  private validateJWTSecret(secret: string): 'valid' | 'warning' | 'error' {
    if (!secret) return 'error';
    if (secret === 'default-secret-change-in-production') {
      return this.config.duoplus.environment === 'production' ? 'error' : 'warning';
    }
    if (secret.length < 32) return 'error';
    return 'valid';
  }

  private validateAPIKey(key: string, environment: string): 'valid' | 'warning' | 'error' {
    if (!key) return environment === 'production' ? 'error' : 'warning';
    if (key.length < 10) return 'warning';
    return 'valid';
  }

  private maskSecret(secret: string): string {
    if (!secret) return 'Not Set';
    if (secret.length <= 8) return '***';
    return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
  }
}
