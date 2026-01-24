/**
 * WindSurf Dashboard - Keyboard Shortcuts Integration
 * 
 * Provides keyboard shortcut functionality for WindSurf dashboards.
 * Can be included in any dashboard HTML file.
 */

(function() {
  'use strict';

  // WindSurf keyboard shortcuts configuration
  const shortcuts = {
    'dashboard.refresh': { key: 'r', ctrl: true, description: 'Refresh dashboard' },
    'dashboard.export': { key: 'e', ctrl: true, description: 'Export data' },
    'risk.analyze': { key: 'a', ctrl: true, description: 'Run risk analysis' },
    'admin.config': { key: ',', ctrl: true, description: 'Open config' },
    'financial.process': { key: 'p', ctrl: true, description: 'Process transaction' },
    'kyc.validate': { key: 'k', ctrl: true, description: 'Validate KYC' },
    'fraud.detect': { key: 'f', ctrl: true, description: 'Detect fraud' },
    'pool.rebalance': { key: 'b', ctrl: true, description: 'Rebalance pool' },
    'monitor.start': { key: 'm', ctrl: true, description: 'Start monitoring' },
    'nexus.dashboard': { key: 'd', ctrl: true, description: 'Show Citadel dashboard' },
    'nexus.metrics': { key: 'm', ctrl: true, shift: true, description: 'Show advanced metrics' },
    'nexus.telemetry.start': { key: 't', ctrl: true, shift: true, description: 'Start telemetry' },
    'nexus.vault.profiles': { key: 'v', ctrl: true, shift: true, description: 'Show vault profiles' },
    'nexus.profile.create': { key: 'n', ctrl: true, shift: true, description: 'Create device profile' },
  };

  // Detect platform (Mac vs Windows/Linux)
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'metaKey' : 'ctrlKey';

  /**
   * Get key combination string from event
   */
  function getKeyCombo(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.metaKey) parts.push('Cmd');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.key && event.key.length === 1) {
      parts.push(event.key.toUpperCase());
    } else if (event.key) {
      parts.push(event.key);
    }
    return parts.join('+');
  }

  /**
   * Check if shortcut matches event
   */
  function matchesShortcut(shortcut, event) {
    const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
    const modifierMatch = shortcut.ctrl ? event[modifierKey] : true;
    const shiftMatch = shortcut.shift !== undefined ? (event.shiftKey === shortcut.shift) : true;
    return keyMatch && modifierMatch && shiftMatch && !event.altKey;
  }

  /**
   * Handle keyboard shortcut
   */
  function handleShortcut(shortcutId, event) {
    event.preventDefault();
    event.stopPropagation();

    // Dispatch custom event
    const customEvent = new CustomEvent('shortcut:triggered', {
      detail: {
        shortcutId,
        keyCombo: getKeyCombo(event),
        timestamp: Date.now()
      },
      bubbles: true
    });
    
    document.dispatchEvent(customEvent);

    // Show visual feedback
    showShortcutFeedback(shortcutId);
  }

  /**
   * Show visual feedback for shortcut
   */
  function showShortcutFeedback(shortcutId) {
    const shortcut = shortcuts[shortcutId];
    if (!shortcut) return;

    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'shortcut-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(59, 130, 246, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    const keyCombo = isMac ? `Cmd+${shortcut.key.toUpperCase()}` : `Ctrl+${shortcut.key.toUpperCase()}`;
    toast.textContent = `${shortcut.description} (${keyCombo})`;
    
    document.body.appendChild(toast);

    // Remove after 2 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Add CSS animations
   */
  function addStyles() {
    if (document.getElementById('shortcuts-styles')) return;

    const style = document.createElement('style');
    style.id = 'shortcuts-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .shortcut-help {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        max-width: 300px;
        display: none;
      }
      
      .shortcut-help.show {
        display: block;
      }
      
      .shortcut-help h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: bold;
      }
      
      .shortcut-help .shortcut-item {
        margin: 4px 0;
        display: flex;
        justify-content: space-between;
      }
      
      .shortcut-help .key {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create help overlay
   */
  function createHelpOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'shortcut-help';
    overlay.id = 'shortcut-help-overlay';
    
    let html = '<h3>⌨️ Keyboard Shortcuts</h3>';
    Object.entries(shortcuts).forEach(([id, shortcut]) => {
      const keyCombo = isMac 
        ? `Cmd+${shortcut.key.toUpperCase()}` 
        : `Ctrl+${shortcut.key.toUpperCase()}`;
      html += `
        <div class="shortcut-item">
          <span>${shortcut.description}</span>
          <span class="key">${keyCombo}</span>
        </div>
      `;
    });
    
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
  }

  /**
   * Toggle help overlay
   */
  function toggleHelp() {
    const overlay = document.getElementById('shortcut-help-overlay');
    if (overlay) {
      overlay.classList.toggle('show');
    }
  }

  /**
   * Initialize keyboard shortcuts
   */
  function init() {
    addStyles();
    createHelpOverlay();

    // Listen for keyboard events
    document.addEventListener('keydown', (event) => {
      // Don't trigger if typing in input/textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Check each shortcut
      for (const [shortcutId, shortcut] of Object.entries(shortcuts)) {
        if (matchesShortcut(shortcut, event)) {
          handleShortcut(shortcutId, event);
          break;
        }
      }

      // Show help with ?
      if (event.key === '?' && event[modifierKey]) {
        event.preventDefault();
        toggleHelp();
      }
    });

    // Listen for custom shortcut events
    document.addEventListener('shortcut:triggered', async (event) => {
      const { shortcutId } = event.detail;
      
      // Handle specific shortcuts with API calls
      try {
        switch(shortcutId) {
          case 'dashboard.refresh':
            const refreshResponse = await fetch('/api/actions/dashboard/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              showShortcutFeedback('dashboard.refresh', data);
              // Trigger dashboard update event
              window.dispatchEvent(new CustomEvent('dashboard:updated', { detail: data }));
            } else {
              throw new Error('Refresh failed');
            }
            break;
            
          case 'dashboard.export':
            const exportResponse = await fetch('/api/actions/dashboard/export?format=json', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            if (exportResponse.ok) {
              const blob = await exportResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `dashboard-export-${Date.now()}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              showShortcutFeedback('dashboard.export', { exported: true });
            } else {
              throw new Error('Export failed');
            }
            break;
            
          case 'risk.analyze':
            const riskResponse = await fetch('/api/actions/risk/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            if (riskResponse.ok) {
              const data = await riskResponse.json();
              showShortcutFeedback('risk.analyze', data);
              window.dispatchEvent(new CustomEvent('risk:analyzed', { detail: data }));
            } else {
              throw new Error('Risk analysis failed');
            }
            break;
            
          case 'admin.config':
            const configResponse = await fetch('/api/actions/admin/config', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            if (configResponse.ok) {
              const data = await configResponse.json();
              showShortcutFeedback('admin.config', data);
              // Open config page or show config modal
              window.location.href = '/config';
            } else {
              throw new Error('Config access failed');
            }
            break;
            
          case 'financial.process':
            const financialResponse = await fetch('/api/actions/financial/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            if (financialResponse.ok) {
              const data = await financialResponse.json();
              showShortcutFeedback('financial.process', data);
              window.dispatchEvent(new CustomEvent('financial:processed', { detail: data }));
            } else {
              throw new Error('Financial processing failed');
            }
            break;
            
          case 'kyc.validate':
            const kycResponse = await fetch('/api/actions/compliance/kyc/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: 'current' })
            });
            if (kycResponse.ok) {
              const data = await kycResponse.json();
              showShortcutFeedback('kyc.validate', data);
              window.dispatchEvent(new CustomEvent('kyc:validated', { detail: data }));
            } else {
              throw new Error('KYC validation failed');
            }
            break;
            
          case 'fraud.detect':
            const fraudResponse = await fetch('/api/actions/compliance/fraud/detect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
            if (fraudResponse.ok) {
              const data = await fraudResponse.json();
              showShortcutFeedback('fraud.detect', data);
              window.dispatchEvent(new CustomEvent('fraud:detected', { detail: data }));
            } else {
              throw new Error('Fraud detection failed');
            }
            break;
            
          case 'pool.rebalance':
            const poolResponse = await fetch('/api/actions/pools/rebalance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            if (poolResponse.ok) {
              const data = await poolResponse.json();
              showShortcutFeedback('pool.rebalance', data);
              window.dispatchEvent(new CustomEvent('pool:rebalanced', { detail: data }));
            } else {
              throw new Error('Pool rebalancing failed');
            }
            break;
            
          case 'monitor.start':
            const monitorResponse = await fetch('/api/actions/monitoring/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            if (monitorResponse.ok) {
              const data = await monitorResponse.json();
              showShortcutFeedback('monitor.start', data);
              window.dispatchEvent(new CustomEvent('monitoring:started', { detail: data }));
            } else {
              throw new Error('Monitoring start failed');
            }
            break;

        case 'nexus.dashboard':
            const nexusDashboardResponse = await fetch('/api/nexus/dashboard', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            if (nexusDashboardResponse.ok) {
              const data = await nexusDashboardResponse.json();
              showShortcutFeedback('nexus.dashboard', data);
              window.dispatchEvent(new CustomEvent('nexus:dashboard', { detail: data }));
            } else {
              throw new Error('Nexus dashboard failed');
            }
            break;

        case 'nexus.metrics':
            const nexusMetricsResponse = await fetch('/api/nexus/metrics/advanced', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            if (nexusMetricsResponse.ok) {
              const data = await nexusMetricsResponse.json();
              showShortcutFeedback('nexus.metrics', data);
              window.dispatchEvent(new CustomEvent('nexus:metrics', { detail: data }));
            } else {
              throw new Error('Nexus metrics failed');
            }
            break;

        case 'nexus.telemetry.start':
            const nexusTelemetryResponse = await fetch('/api/nexus/telemetry/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId: 'default-device', outputPath: './logs/telemetry.log' })
            });
            if (nexusTelemetryResponse.ok) {
              const data = await nexusTelemetryResponse.json();
              showShortcutFeedback('nexus.telemetry.start', data);
              window.dispatchEvent(new CustomEvent('nexus:telemetry:started', { detail: data }));
            } else {
              throw new Error('Telemetry start failed');
            }
            break;

        case 'nexus.vault.profiles':
            const nexusVaultResponse = await fetch('/api/nexus/vault/profiles', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            if (nexusVaultResponse.ok) {
              const data = await nexusVaultResponse.json();
              showShortcutFeedback('nexus.vault.profiles', data);
              window.dispatchEvent(new CustomEvent('nexus:vault:profiles', { detail: data }));
            } else {
              throw new Error('Vault profiles failed');
            }
            break;

        case 'nexus.profile.create':
            const nexusProfileResponse = await fetch('/api/nexus/profile/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceId: `device-${Date.now()}`,
                simData: {
                  iccid: '00000000000000000000',
                  number: '+1234567890',
                  carrier: 'default',
                  country: 'US'
                },
                options: {}
              })
            });
            if (nexusProfileResponse.ok) {
              const data = await nexusProfileResponse.json();
              showShortcutFeedback('nexus.profile.create', data);
              window.dispatchEvent(new CustomEvent('nexus:profile:created', { detail: data }));
            } else {
              throw new Error('Profile creation failed');
            }
            break;
        }
      } catch (error) {
        console.error(`Error executing shortcut ${shortcutId}:`, error);
        showShortcutFeedback(shortcutId, { error: error.message });
      }
    });

    console.log('✅ WindSurf keyboard shortcuts initialized');
    console.log('Press Ctrl/Cmd+? to show shortcuts help');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
