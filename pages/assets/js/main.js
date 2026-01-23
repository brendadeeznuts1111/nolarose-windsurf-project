// Import and initialize dashboard components
import { createRiskHeatmap, RiskHeatmap } from '../risk-heatmap.js';

// ============================================
// === PERFMASTER PABLO: ELEMENT CACHING ===
// ============================================
// Alias Hoisting: Cache all DOM elements to prevent repeated queries
const $ = {
    // Metrics
    activeSessions: null,
    blockedSessions: null,
    avgRiskScore: null,
    detectionRate: null,
    
    // Performance metrics
    inferenceLatency: null,
    wsLatency: null,
    sessionsPerSec: null,
    memoryUsage: null,
    
    // Charts & visualization
    riskChart: null,
    featureChart: null,
    heatmapPoints: null,
    chartUpdateTime: null,
    
    // Alerts & timeline
    alertsContainer: null,
    timelineContainer: null,
    alertStats: null,
    
    // Geographic
    geoTotal: null,
    geoHighRisk: null,
    geoList: null,
    geoRiskList: null,
    
    // Transaction analytics
    totalVolume: null,
    avgTransaction: null,
    blockedAmount: null,
    savingsRate: null,
    
    // Status & modals
    connectionStatus: null,
    lastUpdate: null,
    lastUpdateTime: null,
    fraudAlertModal: null,
    fraudAlertContent: null,
    
    // Demo controls
    demoPhase: null,
    demoPauseBtn: null,
    demoSpeedBtn: null
};

// ============================================
// === PERFMASTER PABLO: COALESCED UPDATES ===
// ============================================
let needsUpdate = !0; // Binary state: true
let pendingMetrics = {};
let updateScheduled = !1; // Binary state: false

// Coalesced metric updates using requestAnimationFrame
function scheduleMetricUpdate(data) {
    Object.assign(pendingMetrics, data);
    if (!updateScheduled) {
        updateScheduled = !0;
        requestAnimationFrame(() => {
            flushMetricUpdates();
            updateScheduled = !1;
        });
    }
}

function flushMetricUpdates() {
    // PERFMASTER PABLO: Batch DOM updates in single frame
    // Update metrics from cached elements (using binary state checks)
    if (pendingMetrics.activeSessions !== undefined && $.activeSessions) {
        $.activeSessions.textContent = pendingMetrics.activeSessions;
    }
    if (pendingMetrics.blockedSessions !== undefined && $.blockedSessions) {
        $.blockedSessions.textContent = pendingMetrics.blockedSessions;
    }
    if (pendingMetrics.avgRiskScore !== undefined && $.avgRiskScore) {
        $.avgRiskScore.textContent = typeof pendingMetrics.avgRiskScore === 'string' 
            ? pendingMetrics.avgRiskScore 
            : pendingMetrics.avgRiskScore.toFixed(3);
    }
    if (pendingMetrics.detectionRate !== undefined && $.detectionRate) {
        $.detectionRate.textContent = pendingMetrics.detectionRate + '%';
    }
    if (pendingMetrics.inferenceLatency !== undefined && $.inferenceLatency) {
        $.inferenceLatency.textContent = pendingMetrics.inferenceLatency;
    }
    if (pendingMetrics.wsLatency !== undefined && $.wsLatency) {
        $.wsLatency.textContent = pendingMetrics.wsLatency;
    }
    if (pendingMetrics.sessionsPerSec !== undefined && $.sessionsPerSec) {
        $.sessionsPerSec.textContent = pendingMetrics.sessionsPerSec;
    }
    if (pendingMetrics.memoryUsage !== undefined && $.memoryUsage) {
        $.memoryUsage.textContent = pendingMetrics.memoryUsage;
    }
    if (pendingMetrics.heatmapPoints !== undefined && $.heatmapPoints) {
        $.heatmapPoints.textContent = pendingMetrics.heatmapPoints;
    }
    if (pendingMetrics.chartUpdateTime !== undefined && $.chartUpdateTime) {
        $.chartUpdateTime.textContent = pendingMetrics.chartUpdateTime;
    }
    // Transaction analytics
    if (pendingMetrics.totalVolume !== undefined && $.totalVolume) {
        $.totalVolume.textContent = pendingMetrics.totalVolume;
    }
    if (pendingMetrics.avgTransaction !== undefined && $.avgTransaction) {
        $.avgTransaction.textContent = pendingMetrics.avgTransaction;
    }
    if (pendingMetrics.blockedAmount !== undefined && $.blockedAmount) {
        $.blockedAmount.textContent = pendingMetrics.blockedAmount;
    }
    if (pendingMetrics.savingsRate !== undefined && $.savingsRate) {
        $.savingsRate.textContent = pendingMetrics.savingsRate;
    }
    
    pendingMetrics = {};
}

// ============================================
// === PERFMASTER PABLO: ARIA-LIVE THROTTLE ===
// ============================================
// Throttle aria-live updates to prevent screen reader stuttering
let ariaLiveThrottle = 0;
const ARIA_LIVE_INTERVAL = 2000; // 2 seconds minimum between updates

function updateAriaLive(element, value) {
    const now = Date.now();
    if (now - ariaLiveThrottle < ARIA_LIVE_INTERVAL) {
        // Queue for later update
        setTimeout(() => {
            if (element) element.textContent = value;
        }, ARIA_LIVE_INTERVAL - (now - ariaLiveThrottle));
        return;
    }
    ariaLiveThrottle = now;
    if (element) element.textContent = value;
}

// ============================================
// === PERFMASTER PABLO: ELEMENT POOL ===
// ============================================
// Reusable alert elements to prevent DOM thrashing
const alertPool = [];
const ALERT_POOL_SIZE = 50;
const MAX_ALERTS = 50;

function createAlertElement() {
    const alert = document.createElement('div');
    alert.className = 'p-3 rounded-lg border-l-4 mb-2 transition-all duration-300';
    return alert;
}

function getPooledAlert() {
    return alertPool.pop() || createAlertElement();
}

function returnAlertToPool(alert) {
    if (alertPool.length < ALERT_POOL_SIZE) {
        alert.innerHTML = '';
        alert.className = 'p-3 rounded-lg border-l-4 mb-2 transition-all duration-300';
        alert.style.opacity = '0';
        alert.style.transform = '';
        alertPool.push(alert);
    }
}

        
        // Global state
        let websocket = null;
        let riskHeatmap = null;
        let riskChart = null;
        let featureChart = null;
        let alertCount = 0;
        let demoMode = false;
        let demoInterval = null;
        let demoPaused = false;
        let demoSpeed = 1500; // milliseconds between events
        let demoPhase = 'startup'; // startup, normal, surge, recovery
        let demoPhaseStartTime = Date.now();
        let demoEventCount = 0;
        let merchantRiskProfiles = new Map(); // Track merchant risk patterns
        let riskHistory = []; // Track risk over time for trends
        let activityTimeline = []; // Activity feed
        let geographicData = new Map(); // Geographic distribution
        let transactionData = {
            totalVolume: 0,
            totalTransactions: 0,
            blockedAmount: 0,
            blockedTransactions: 0
        };
        let merchantNames = [
            'TechCorp Payments', 'Global Retail Hub', 'Digital Marketplace', 'SecurePay Solutions',
            'E-Commerce Pro', 'Payment Gateway Plus', 'Merchant Services Inc', 'Transaction Hub',
            'Digital Storefront', 'Online Payment Co', 'Retail Network', 'Commerce Platform',
            'Payment Systems', 'Digital Commerce', 'E-Pay Solutions', 'Transaction Services',
            'Merchant Gateway', 'Payment Network', 'Commerce Hub', 'Digital Payments',
            'Retail Payments', 'Online Merchant', 'Payment Portal', 'Transaction Gateway',
            'E-Commerce Hub', 'Digital Retail', 'Payment Platform', 'Commerce Solutions',
            'Merchant Portal', 'Payment Services', 'Digital Gateway', 'Transaction Platform',
            'E-Payment Hub', 'Commerce Gateway', 'Payment Hub', 'Digital Commerce Pro',
            'Retail Gateway', 'Online Payments', 'Payment Center', 'Transaction Hub Pro',
            'E-Commerce Gateway', 'Digital Payment Hub', 'Merchant Center', 'Payment Pro',
            'Commerce Portal', 'Transaction Center', 'Digital Merchant', 'Payment Gateway Pro'
        ];
        let countries = [
            { code: 'US', name: 'United States', risk: 0.1 },
            { code: 'GB', name: 'United Kingdom', risk: 0.12 },
            { code: 'CA', name: 'Canada', risk: 0.08 },
            { code: 'DE', name: 'Germany', risk: 0.15 },
            { code: 'FR', name: 'France', risk: 0.13 },
            { code: 'IT', name: 'Italy', risk: 0.18 },
            { code: 'ES', name: 'Spain', risk: 0.16 },
            { code: 'NL', name: 'Netherlands', risk: 0.11 },
            { code: 'BR', name: 'Brazil', risk: 0.25 },
            { code: 'MX', name: 'Mexico', risk: 0.22 },
            { code: 'IN', name: 'India', risk: 0.20 },
            { code: 'CN', name: 'China', risk: 0.19 },
            { code: 'JP', name: 'Japan', risk: 0.09 },
            { code: 'AU', name: 'Australia', risk: 0.10 },
            { code: 'RU', name: 'Russia', risk: 0.30 },
            { code: 'TR', name: 'Turkey', risk: 0.24 },
            { code: 'PL', name: 'Poland', risk: 0.14 },
            { code: 'SE', name: 'Sweden', risk: 0.07 }
        ];
        
        // Check for demo mode
        function checkDemoMode() {
            const urlParams = new URLSearchParams(window.location.search);
            const demo = urlParams.get('demo');
            return demo === 'ai-risk-analysis';
        }
        
        // Initialize badges with colors (using Bun.color() compatible values)
        function initializeBadges() {
            // Badge colors - using Bun.color() compatible hex values
            // These match the colors from badge-colors.ts
            const badgeColors = {
                version: '#3b82f6',  // Blue-500 (from Bun.color("#3b82f6", "css"))
                cookie: '#eab308',   // Yellow-500 (from Bun.color("#eab308", "css"))
            };
            
            // Set version badge text from CONFIG
            const versionText = document.getElementById('versionText');
            if (versionText && typeof CONFIG !== 'undefined' && CONFIG.VERSION) {
                versionText.textContent = CONFIG.VERSION;
            }
            
            // Set version badge background color
            const versionBadge = document.getElementById('versionBadge');
            if (versionBadge) {
                versionBadge.style.backgroundColor = badgeColors.version;
            }
            
            // Cookie badge click handler
            const cookieBadge = document.getElementById('cookieBadge');
            if (cookieBadge) {
                // Set cookie badge background color
                cookieBadge.style.backgroundColor = badgeColors.cookie;
                
                cookieBadge.addEventListener('click', () => {
                    // Simple cookie consent handler
                    const consent = confirm('This dashboard uses cookies for analytics and session management.\n\nDo you accept cookies?');
                    if (consent) {
                        localStorage.setItem('cookieConsent', 'accepted');
                        cookieBadge.style.opacity = '0.6';
                        cookieBadge.title = 'Cookie Consent: Accepted';
                    } else {
                        localStorage.setItem('cookieConsent', 'declined');
                        cookieBadge.style.opacity = '0.4';
                        cookieBadge.title = 'Cookie Consent: Declined';
                    }
                });
                
                // Check existing consent
                const consent = localStorage.getItem('cookieConsent');
                if (consent === 'accepted') {
                    cookieBadge.style.opacity = '0.6';
                    cookieBadge.title = 'Cookie Consent: Accepted';
                } else if (consent === 'declined') {
                    cookieBadge.style.opacity = '0.4';
                    cookieBadge.title = 'Cookie Consent: Declined';
                }
            }
        }
        
            // Initialize dashboard
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize badge colors and version
            initializeBadges();
            
            // ============================================
            // === PERFMASTER PABLO: INITIALIZE CACHE ===
            // ============================================
            $.activeSessions = document.getElementById('activeSessions');
            $.blockedSessions = document.getElementById('blockedSessions');
            $.avgRiskScore = document.getElementById('avgRiskScore');
            $.detectionRate = document.getElementById('detectionRate');
            $.inferenceLatency = document.getElementById('inferenceLatency');
            $.wsLatency = document.getElementById('wsLatency');
            $.sessionsPerSec = document.getElementById('sessionsPerSec');
            $.memoryUsage = document.getElementById('memoryUsage');
            $.heatmapPoints = document.getElementById('heatmapPoints');
            $.chartUpdateTime = document.getElementById('chartUpdateTime');
            $.alertsContainer = document.getElementById('alertsContainer');
            $.timelineContainer = document.getElementById('timelineContainer');
            $.alertStats = document.getElementById('alertStats');
            $.geoTotal = document.getElementById('geoTotal');
            $.geoHighRisk = document.getElementById('geoHighRisk');
            $.geoList = document.getElementById('geoList');
            $.geoRiskList = document.getElementById('geoRiskList');
            $.totalVolume = document.getElementById('totalVolume');
            $.avgTransaction = document.getElementById('avgTransaction');
            $.blockedAmount = document.getElementById('blockedAmount');
            $.savingsRate = document.getElementById('savingsRate');
            $.connectionStatus = document.getElementById('connectionStatus');
            $.lastUpdate = document.getElementById('lastUpdate');
            $.lastUpdateTime = document.getElementById('lastUpdateTime');
            $.fraudAlertModal = document.getElementById('fraudAlertModal');
            $.fraudAlertContent = document.getElementById('fraudAlertContent');
            
            // Initialize last update time immediately
            console.log('🕐 Initializing last update time...', {
                lastUpdate: $.lastUpdate,
                lastUpdateTime: $.lastUpdateTime,
                timeElementExists: !!$.lastUpdateTime
            });
            updateLastUpdateTime();
            console.log('✅ Last update time initialized:', $.lastUpdateTime?.textContent);
            
            demoMode = checkDemoMode();
            
            if (demoMode) {
                // Show demo mode indicator with controls
                const header = document.querySelector('header');
                const demoContainer = document.createElement('div');
                demoContainer.className = 'flex items-center space-x-3';
                demoContainer.style.marginLeft = '1rem';
                
                const demoBadge = document.createElement('div');
                demoBadge.className = 'px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold';
                demoBadge.textContent = '🎭 DEMO MODE';
                
                const phaseIndicator = document.createElement('div');
                phaseIndicator.id = 'demoPhase';
                phaseIndicator.className = 'px-2 py-1 bg-blue-600 text-white rounded text-xs';
                phaseIndicator.textContent = 'Initializing...';
                $.demoPhase = phaseIndicator;
                
                const pauseBtn = document.createElement('button');
                pauseBtn.id = 'demoPauseBtn';
                pauseBtn.className = 'px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors';
                pauseBtn.textContent = '⏸ Pause';
                pauseBtn.setAttribute('data-action', 'toggle-pause');
                $.demoPauseBtn = pauseBtn;
                
                const speedBtn = document.createElement('button');
                speedBtn.id = 'demoSpeedBtn';
                speedBtn.className = 'px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors';
                speedBtn.textContent = '⚡ 1x';
                speedBtn.setAttribute('data-action', 'toggle-speed');
                $.demoSpeedBtn = speedBtn;
                
                demoContainer.appendChild(demoBadge);
                demoContainer.appendChild(phaseIndicator);
                demoContainer.appendChild(pauseBtn);
                demoContainer.appendChild(speedBtn);
                header.querySelector('.flex.items-center.space-x-4').appendChild(demoContainer);
                
                // Initialize merchant risk profiles
                initializeMerchantProfiles();
            }
            
            initializeHeatmap();
            initializeCharts();
            
            if (demoMode) {
                startDemoMode();
            } else {
                connectWebSocket();
            }
            
            startMetricsUpdate();
        });
        
        // Initialize risk heatmap
        function initializeHeatmap() {
            try {
                riskHeatmap = createRiskHeatmap('riskHeatmap', {
                    width: 400,
                    height: 300,
                    cellSize: 15,
                    colorScheme: 'viridis',
                    showGrid: true,
                    showLabels: true,
                    animationSpeed: 2000
                });
                console.log('🗺️ Risk heatmap initialized');
            } catch (error) {
                console.error('Failed to initialize heatmap:', error);
            }
        }
        
        // Initialize charts
        function initializeCharts() {
            // Risk distribution pie chart
            const riskCtx = document.getElementById('riskChart').getContext('2d');
            riskChart = new Chart(riskCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Critical', 'High', 'Medium', 'Low'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            '#ef4444',
                            '#f59e0b', 
                            '#eab308',
                            '#22c55e'
                        ],
                        borderWidth: 2,
                        borderColor: '#1f2937'
                    }]
                },
                options: {
                    responsive: !0, // Binary state: true
                    maintainAspectRatio: !1, // Binary state: false
                    parsing: !1, // PERFMASTER PABLO: Disable parsing for performance
                    normalized: !0, // PERFMASTER PABLO: Use normalized data
                    animation: {
                        duration: 0 // Disable animations for real-time updates
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#e5e7eb',
                                padding: 10
                            }
                        }
                    }
                }
            });
            
            // Feature contributions bar chart
            const featureCtx = document.getElementById('featureChart').getContext('2d');
            featureChart = new Chart(featureCtx, {
                type: 'bar',
                data: {
                    labels: ['Root', 'VPN', 'Thermal', 'Bio', 'Proxy'],
                    datasets: [{
                        label: 'Contribution',
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: '#3b82f6',
                        borderColor: '#1d4ed8',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: !0, // Binary state: true
                    maintainAspectRatio: !1, // Binary state: false
                    parsing: !1, // PERFMASTER PABLO: Disable parsing for performance
                    normalized: !0, // PERFMASTER PABLO: Use normalized data
                    animation: {
                        duration: 0 // Disable animations for real-time updates
                    },
                    scales: {
                        y: {
                            beginAtZero: !0, // Binary state: true
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#e5e7eb'
                            }
                        },
                        x: {
                            grid: {
                                display: !1 // Binary state: false
                            },
                            ticks: {
                                color: '#e5e7eb'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: !1 // Binary state: false
                        }
                    }
                }
            });
        }
        
        // ============================================
        // === PERFMASTER PABLO: WEBSOCKET CONTROLLER ===
        // ============================================
        // Optimized WebSocket handler with binary state and message batching
        let wsReconnectTimeout = null;
        let wsMessageQueue = [];
        let wsBatchScheduled = !1; // Binary state: false
        
        function connectWebSocket() {
            const wsUrl = WS_URL;
            
            try {
                websocket = new WebSocket(wsUrl);
                
                websocket.onopen = () => {
                    console.log('🔗 Connected to fraud detection WebSocket');
                    updateConnectionStatus(!0); // Binary state: true
                    wsMessageQueue = []; // Clear queue on reconnect
                };
                
                websocket.onmessage = (event) => {
                    // PERFMASTER PABLO: Batch message processing
                    try {
                        const data = JSON.parse(event.data);
                        wsMessageQueue.push(data);
                        
                        // Batch process messages using requestAnimationFrame
                        if (!wsBatchScheduled) {
                            wsBatchScheduled = !0;
                            requestAnimationFrame(() => {
                                wsMessageQueue.forEach(msg => handleWebSocketMessage(msg));
                                wsMessageQueue = [];
                                wsBatchScheduled = !1;
                            });
                        }
                    } catch (err) {
                        console.error('Failed to parse WebSocket message:', err);
                    }
                };
                
                websocket.onclose = () => {
                    console.log('❌ WebSocket connection closed');
                    updateConnectionStatus(!1); // Binary state: false
                    // Attempt to reconnect after 5 seconds (clear previous timeout)
                    if (wsReconnectTimeout) clearTimeout(wsReconnectTimeout);
                    wsReconnectTimeout = setTimeout(connectWebSocket, 5000);
                };
                
                websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    updateConnectionStatus(!1); // Binary state: false
                };
                
            } catch (error) {
                console.error('Failed to connect to WebSocket:', error);
                updateConnectionStatus(!1); // Binary state: false
            }
        }
        
        // Handle WebSocket messages
        function handleWebSocketMessage(data) {
            switch (data.event) {
                case 'risk:baseline':
                    console.log('📊 Risk baseline received:', data);
                    break;
                    
                case 'risk:score':
                    updateRiskScore(data);
                    break;
                    
                case 'fraud:detected':
                    handleFraudDetected(data);
                    break;
                    
                case 'fraud:blocked':
                    handleFraudBlocked(data);
                    break;
                    
                default:
                    console.log('Unknown WebSocket event:', data);
            }
            
            updateLastUpdateTime();
        }
        
        // Update risk score display
        function updateRiskScore(data) {
            // Update heatmap (only if not already added in demo mode)
            if (riskHeatmap && !demoMode) {
                riskHeatmap.addDataPoint({
                    sessionId: data.sessionId,
                    merchantId: data.merchantId || 'unknown',
                    score: data.score,
                    riskLevel: data.riskLevel,
                    blocked: data.blocked || false,
                    timestamp: data.timestamp || Date.now(),
                    features: data.features || {}
                });
            }
            
            // Update metrics
            updateMetrics();
        }
        
        // Handle fraud detection
        function handleFraudDetected(data) {
            const merchantInfo = merchantRiskProfiles.get(data.merchantId);
            const merchantName = merchantInfo?.name || data.merchantId;
            const context = merchantInfo ? `${merchantName} (${merchantInfo.volume} transactions)` : merchantName;
            
            addAlert({
                type: 'warning',
                message: `Fraud detected: ${data.sessionId.substring(0, 12)}... (Score: ${data.score.toFixed(3)})`,
                details: `${context} | Risk Level: ${data.riskLevel.toUpperCase()}`,
                timestamp: new Date().toLocaleTimeString(),
                sessionId: data.sessionId,
                score: data.score
            });
        }
        
        // Handle fraud block
        function handleFraudBlocked(data) {
            const merchantInfo = merchantRiskProfiles.get(data.merchantId);
            const features = data.features || {};
            const featureDetails = [];
            
            if (features.root_detected) featureDetails.push('Root detected');
            if (features.vpn_active) featureDetails.push('VPN active');
            if (features.thermal_spike > 5) featureDetails.push(`Thermal spike: +${features.thermal_spike.toFixed(1)}°C`);
            if (features.biometric_fail > 0) featureDetails.push(`${features.biometric_fail} biometric failures`);
            if (features.proxy_hop_count > 2) featureDetails.push(`${features.proxy_hop_count} proxy hops`);
            
            const merchantName = merchantInfo?.name || data.merchantId;
            const context = merchantInfo ? `${merchantName} (Risk: ${(merchantInfo.fraudRate * 100).toFixed(1)}%)` : merchantName;
            
            addAlert({
                type: 'critical',
                message: `🚨 BLOCKED: ${data.sessionId.substring(0, 12)}... (Score: ${data.score.toFixed(3)})`,
                details: `${context} | ${data.reason || 'Multiple risk factors'} | Features: ${featureDetails.join(', ') || 'Standard checks'}`,
                timestamp: new Date().toLocaleTimeString(),
                sessionId: data.sessionId,
                score: data.score,
                reason: data.reason
            });
            
            // Show modal for critical alerts
            if (data.score > 0.95 || data.riskLevel === 'critical') {
                showFraudAlert(data);
            }
        }
        
        // Add alert to the alerts container
        // PERFMASTER PABLO: Using element pooling to prevent DOM thrashing
        function addAlert(alert) {
            const container = $.alertsContainer;
            if (!container) return;
            
            // Remove placeholder if present
            const placeholder = container.querySelector('.text-gray-400');
            if (placeholder) {
                placeholder.remove();
            }
            
            // Get pooled element or create new
            const alertElement = getPooledAlert();
            alertElement.className = `p-3 rounded-lg border-l-4 mb-2 transition-all duration-300 ${
                alert.type === 'critical' ? 'bg-red-900 bg-opacity-20 border-red-500 fraud-alert' :
                alert.type === 'warning' ? 'bg-yellow-900 bg-opacity-20 border-yellow-500' :
                'bg-blue-900 bg-opacity-20 border-blue-500'
            }`;
            
            // Add slide-in animation
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateX(-20px)';
            
            const scoreColor = alert.score > 0.9 ? 'text-red-400' : alert.score > 0.7 ? 'text-yellow-400' : 'text-blue-400';
            
            alertElement.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center mb-1">
                            <span class="mr-2 text-lg">${alert.type === 'critical' ? '🚨' : '⚠️'}</span>
                            <span class="text-sm font-semibold">${alert.message}</span>
                            ${alert.score ? `<span class="ml-2 text-xs ${scoreColor} font-mono">(${alert.score.toFixed(3)})</span>` : ''}
                        </div>
                        ${alert.details ? `<div class="text-xs text-gray-400 ml-7 mt-1">${alert.details}</div>` : ''}
                    </div>
                    <span class="text-xs text-gray-400 ml-4 whitespace-nowrap">${alert.timestamp}</span>
                </div>
            `;
            
            container.insertBefore(alertElement, container.firstChild);
            
            // Animate in with slide effect
            setTimeout(() => {
                alertElement.style.transition = 'all 0.3s ease-out';
                alertElement.style.opacity = '1';
                alertElement.style.transform = 'translateX(0)';
                alertElement.classList.add('demo-alert-new');
            }, 10);
            
            // Keep only last MAX_ALERTS alerts, return excess to pool
            while (container.children.length > MAX_ALERTS) {
                const lastChild = container.lastChild;
                lastChild.style.opacity = '0';
                lastChild.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    returnAlertToPool(lastChild);
                    if (lastChild.parentNode) {
                        lastChild.remove();
                    }
                }, 300);
            }
            
            alertCount++;
            updateAlertStats();
            
            // Add click handler to show details
            alertElement.addEventListener('click', () => {
                if (alert.sessionId && alert.score) {
                    showFraudAlert({
                        sessionId: alert.sessionId,
                        score: alert.score,
                        reason: alert.reason || 'Multiple risk factors detected',
                        merchantId: alert.merchantId || 'Unknown'
                    });
                }
            });
            alertElement.style.cursor = alert.sessionId ? 'pointer' : 'default';
        }
        
        // Show fraud alert modal
        function showFraudAlert(data) {
            const modal = $.fraudAlertModal;
            const content = $.fraudAlertContent;
            if (!modal || !content) return;
            
            const features = data.features || {};
            const merchantInfo = merchantRiskProfiles.get(data.merchantId);
            const riskPercentage = (data.score * 100).toFixed(1);
            
            let riskColor = 'text-green-400';
            if (data.score > 0.9) riskColor = 'text-red-400';
            else if (data.score > 0.7) riskColor = 'text-yellow-400';
            else if (data.score > 0.5) riskColor = 'text-orange-400';
            
            content.innerHTML = `
                <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-gray-400 text-sm">Session ID</p>
                            <p class="font-mono text-sm">${data.sessionId}</p>
                        </div>
                        <div>
                            <p class="text-gray-400 text-sm">Merchant</p>
                            <p class="font-semibold">${merchantInfo?.name || data.merchantId}</p>
                            ${merchantInfo ? `<p class="text-xs text-gray-500">${merchantInfo.volume} transactions | ${(merchantInfo.fraudRate * 100).toFixed(1)}% fraud rate</p>` : ''}
                            ${data.countryName ? `<p class="text-xs text-gray-500">🌍 ${data.countryName}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-700 pt-3">
                        <p class="text-gray-400 text-sm mb-2">Risk Assessment</p>
                        <div class="flex items-center space-x-4">
                            <div>
                                <p class="text-xs text-gray-500">Risk Score</p>
                                <p class="${riskColor} font-bold text-2xl">${data.score.toFixed(3)}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Risk Level</p>
                                <p class="text-red-400 font-bold">${(data.riskLevel || 'HIGH').toUpperCase()}</p>
                            </div>
                            <div class="flex-1">
                                <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                                    <div class="bg-red-500 h-2 rounded-full transition-all duration-500" style="width: ${riskPercentage}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-700 pt-3">
                        <p class="text-gray-400 text-sm mb-2">Detection Details</p>
                        <p class="text-sm">${data.reason || 'Multiple risk factors detected'}</p>
                    </div>
                    
                    ${data.transactionAmount ? `
                    <div class="border-t border-gray-700 pt-3">
                        <p class="text-gray-400 text-sm mb-1">Transaction Amount</p>
                        <p class="text-lg font-bold ${data.blocked ? 'text-red-400' : 'text-green-400'}">$${data.transactionAmount.toLocaleString()}</p>
                        ${data.blocked ? '<p class="text-xs text-gray-500 mt-1">Blocked - Fraud prevented</p>' : ''}
                    </div>
                    ` : ''}
                    
                    ${Object.keys(features).length > 0 ? `
                    <div class="border-t border-gray-700 pt-3">
                        <p class="text-gray-400 text-sm mb-2">Feature Flags</p>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            ${features.root_detected ? '<div class="flex items-center"><span class="text-red-400 mr-2">●</span> Root Detected</div>' : ''}
                            ${features.vpn_active ? '<div class="flex items-center"><span class="text-yellow-400 mr-2">●</span> VPN Active</div>' : ''}
                            ${features.thermal_spike > 5 ? `<div class="flex items-center"><span class="text-orange-400 mr-2">●</span> Thermal Spike: +${features.thermal_spike.toFixed(1)}°C</div>` : ''}
                            ${features.biometric_fail > 0 ? `<div class="flex items-center"><span class="text-red-400 mr-2">●</span> ${features.biometric_fail} Biometric Failures</div>` : ''}
                            ${features.proxy_hop_count > 2 ? `<div class="flex items-center"><span class="text-yellow-400 mr-2">●</span> ${features.proxy_hop_count} Proxy Hops</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="border-t border-gray-700 pt-3">
                        <p class="text-xs text-gray-500">Detected at ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            `;
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            // Add entrance animation
            setTimeout(() => {
                const modalContent = modal.querySelector('.bg-gray-800');
                if (modalContent) {
                    modalContent.style.animation = 'slideInRight 0.3s ease-out';
                }
            }, 10);
        }
        
        // Close fraud alert modal
        window.closeFraudAlert = () => {
            if ($.fraudAlertModal) {
                $.fraudAlertModal.classList.add('hidden');
                $.fraudAlertModal.classList.remove('flex');
            }
        };
        
        // Update connection status
        function updateConnectionStatus(connected) {
            if (!$.connectionStatus) return;
            if (connected) {
                $.connectionStatus.className = 'px-3 py-1 bg-green-600 text-white rounded-full text-sm';
                updateAriaLive($.connectionStatus.querySelector('span'), 'Connected'); // Throttled
            } else {
                $.connectionStatus.className = 'px-3 py-1 bg-red-600 text-white rounded-full text-sm';
                updateAriaLive($.connectionStatus.querySelector('span'), 'Disconnected'); // Throttled
            }
        }
        
        // Update last update time
        function updateLastUpdateTime() {
            const time = new Date().toLocaleTimeString();
            const isoTime = new Date().toISOString();
            
            // Try multiple strategies to find and update the time element
            let timeElement = $.lastUpdateTime || document.getElementById('lastUpdateTime');
            
            // Cache element if found via getElementById
            if (!$.lastUpdateTime && timeElement) {
                $.lastUpdateTime = timeElement;
            }
            
            if (!timeElement) {
                // Fallback: find via parent
                const parentSpan = document.getElementById('lastUpdate');
                if (parentSpan) {
                    timeElement = parentSpan.querySelector('time');
                    if (timeElement) {
                        // Cache it for next time
                        $.lastUpdateTime = timeElement;
                    }
                }
            }
            
            if (timeElement) {
                // Update the time element directly - try multiple methods
                const oldValue = timeElement.textContent;
                timeElement.textContent = time;
                timeElement.innerText = time; // Fallback
                timeElement.setAttribute('datetime', isoTime);
                
                // Verify the update worked
                if (timeElement.textContent === '--' || timeElement.textContent === '' || timeElement.textContent === oldValue) {
                    console.warn('⚠️ Time update may have failed:', {
                        oldValue,
                        newValue: time,
                        currentTextContent: timeElement.textContent,
                        element: timeElement
                    });
                    timeElement.innerHTML = time;
                }
            } else {
                // Last resort: update parent span directly
                const parentSpan = document.getElementById('lastUpdate');
                if (parentSpan) {
                    // Preserve the "Last Update: " label and update the time
                    parentSpan.innerHTML = `Last Update: <time id="lastUpdateTime" datetime="${isoTime}">${time}</time>`;
                    // Cache the newly created element
                    $.lastUpdateTime = document.getElementById('lastUpdateTime');
                    console.log('✅ Created new time element via parent span');
                } else {
                    console.warn('⚠️ Could not find lastUpdate element');
                }
            }
        }
        
        // Update metrics
        async function updateMetrics() {
            if (demoMode) {
                // Calculate metrics from actual data
                let activeSessions = 45;
                let blockedSessions = 0;
                let avgRiskScore = 0.45;
                let totalSessions = 0;
                
                if (riskHeatmap) {
                    const points = riskHeatmap.getDataPoints();
                    totalSessions = points.length;
                    activeSessions = Math.max(45, Math.floor(totalSessions * 0.8) + Math.floor(Math.random() * 20));
                    blockedSessions = points.filter(p => p.riskLevel === 'critical' || (p.riskLevel === 'high' && p.value > 0.85)).length;
                    
                    if (points.length > 0) {
                        avgRiskScore = points.reduce((sum, p) => sum + p.value, 0) / points.length;
                        
                        // Store in history for trends
                        riskHistory.push({
                            time: Date.now(),
                            avgRisk: avgRiskScore,
                            blocked: blockedSessions,
                            total: points.length
                        });
                        
                        // Keep last 100 data points
                        if (riskHistory.length > 100) {
                            riskHistory.shift();
                        }
                    }
                }
                
                // Adjust detection rate based on phase
                let detectionRate = 95;
                if (demoPhase === 'surge') {
                    detectionRate = 97 + Math.random() * 2; // Higher during surge
                } else if (demoPhase === 'startup') {
                    detectionRate = 94 + Math.random() * 3; // Lower during startup
                } else {
                    detectionRate = 95 + Math.random() * 4;
                }
                
                // PERFMASTER PABLO: Coalesced updates using requestAnimationFrame
                const baseLatency = demoPhase === 'surge' ? 0.4 : 0.3;
                const baseWsLatency = demoPhase === 'surge' ? 35 : 25;
                const baseThroughput = demoPhase === 'surge' ? 4500 : 3500;
                const baseMemory = demoPhase === 'surge' ? 55 : 40;
                
                scheduleMetricUpdate({
                    activeSessions: activeSessions,
                    blockedSessions: blockedSessions,
                    avgRiskScore: avgRiskScore.toFixed(3),
                    detectionRate: detectionRate.toFixed(1),
                    inferenceLatency: (baseLatency + Math.random() * 0.3).toFixed(1) + 'ms',
                    wsLatency: Math.floor(baseWsLatency + Math.random() * 20) + 'ms',
                    sessionsPerSec: Math.floor(baseThroughput + Math.random() * 1000).toLocaleString(),
                    memoryUsage: Math.floor(baseMemory + Math.random() * 15) + 'MB',
                    heatmapPoints: riskHeatmap ? `${riskHeatmap.getDataPoints().length} points` : '0 points',
                    chartUpdateTime: new Date().toLocaleTimeString()
                });
                
                // Animate metric updates (for visual feedback)
                animateMetric('activeSessions', activeSessions);
                animateMetric('blockedSessions', blockedSessions);
                
                // Update transaction analytics
                updateTransactionAnalytics();
                
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/api/health`);
                const data = await response.json();
                
                // PERFMASTER PABLO: Coalesced updates
                scheduleMetricUpdate({
                    activeSessions: data.active_sessions,
                    avgRiskScore: data.avg_risk_score.toFixed(3),
                    heatmapPoints: riskHeatmap ? `${riskHeatmap.getDataPoints().length} points` : '0 points'
                });
                
            } catch (error) {
                console.error('Failed to update metrics:', error);
            }
        }
        
        // Start metrics update loop
        function startMetricsUpdate() {
            updateMetrics();
            setInterval(updateMetrics, 5000); // Update every 5 seconds
        }
        
        // Simulate some initial data for demonstration
        function simulateInitialData() {
            // Simulate some risk scores
            const mockData = [
                { riskLevel: 'low', count: 45 },
                { riskLevel: 'medium', count: 12 },
                { riskLevel: 'high', count: 5 },
                { riskLevel: 'critical', count: 2 }
            ];
            
            if (riskChart) {
                riskChart.data.datasets[0].data = mockData.map(d => d.count);
                riskChart.update('none'); // PERFMASTER PABLO: No animation for initial load
            }
            
            // Simulate feature contributions
            if (featureChart) {
                featureChart.data.datasets[0].data = [2.4, 1.8, 1.2, 1.9, 2.1];
                featureChart.update('none'); // PERFMASTER PABLO: No animation for initial load
            }
        }
        
        // Initialize with mock data after a short delay
        setTimeout(simulateInitialData, 1000);
        
        // Demo mode functions
        function startDemoMode() {
            console.log('🎭 Starting AI Risk Analysis Demo Mode');
            updateConnectionStatus(true);
            demoPhaseStartTime = Date.now();
            demoEventCount = 0;
            
            // Initialize last update time immediately
            updateLastUpdateTime();
            
            // Initialize transaction data with some baseline
            transactionData.totalVolume = 125000 + Math.random() * 50000;
            transactionData.totalTransactions = 450 + Math.floor(Math.random() * 100);
            transactionData.blockedAmount = 15000 + Math.random() * 5000;
            transactionData.blockedTransactions = 12 + Math.floor(Math.random() * 5);
            
            // Initialize with some baseline data
            simulateInitialData();
            
            // Initialize transaction analytics display
            updateTransactionAnalytics();
            
            // Initialize geographic display
            updateGeographicDisplay();
            
            // Start phase management
            manageDemoPhases();
            
            // Start generating demo events
            scheduleNextDemoEvent();
        }
        
        function scheduleNextDemoEvent() {
            if (demoPaused) return;
            
            const delay = demoSpeed + (Math.random() - 0.5) * demoSpeed * 0.3; // Add variance
            setTimeout(() => {
                if (!demoPaused) {
                    generateDemoEvent();
                    demoEventCount++;
                    scheduleNextDemoEvent();
                }
            }, delay);
        }
        
        function manageDemoPhases() {
            setInterval(() => {
                const elapsed = (Date.now() - demoPhaseStartTime) / 1000; // seconds
                const oldPhase = demoPhase;
                
                // Phase transitions based on time
                if (elapsed < 10) {
                    demoPhase = 'startup';
                } else if (elapsed < 45) {
                    demoPhase = 'normal';
                } else if (elapsed < 75) {
                    demoPhase = 'surge'; // Attack surge
                } else if (elapsed < 100) {
                    demoPhase = 'recovery';
                } else {
                    // Reset to normal after recovery
                    demoPhaseStartTime = Date.now();
                    demoPhase = 'normal';
                    demoEventCount = 0;
                }
                
                if (oldPhase !== demoPhase) {
                    onPhaseChange(oldPhase, demoPhase);
                }
                
                updatePhaseIndicator();
            }, 1000);
        }
        
        function onPhaseChange(oldPhase, newPhase) {
            console.log(`📊 Demo phase: ${oldPhase} → ${newPhase}`);
            
            if (newPhase === 'surge') {
                // Trigger multiple alerts to simulate attack
                setTimeout(() => {
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            const sessionId = `attack-${Date.now()}-${i}`;
                            const merchantId = `MERCH-${Math.floor(Math.random() * 10) + 1}`; // Focus on specific merchants
                            generateAttackEvent(sessionId, merchantId);
                        }, i * 500);
                    }
                }, 1000);
            }
        }
        
        function updatePhaseIndicator() {
            const indicator = $.demoPhase;
            if (!indicator) return;
            
            const phaseNames = {
                startup: '🚀 Startup',
                normal: '✅ Normal',
                surge: '⚠️ Attack Surge',
                recovery: '🔄 Recovery'
            };
            
            indicator.textContent = phaseNames[demoPhase] || 'Unknown';
            indicator.className = `px-2 py-1 text-white rounded text-xs ${
                demoPhase === 'surge' ? 'bg-red-600 animate-pulse' :
                demoPhase === 'startup' ? 'bg-yellow-600' :
                demoPhase === 'recovery' ? 'bg-blue-600' :
                'bg-green-600'
            }`;
        }
        
        function toggleDemoPause() {
            demoPaused = !demoPaused; // Binary state toggle
            if ($.demoPauseBtn) {
                $.demoPauseBtn.textContent = demoPaused ? '▶ Resume' : '⏸ Pause';
                $.demoPauseBtn.className = `px-2 py-1 text-white rounded text-xs transition-colors ${
                    demoPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
                }`;
            }
            
            if (!demoPaused) {
                scheduleNextDemoEvent();
            }
        }
        
        function toggleDemoSpeed() {
            const speeds = [
                { value: 3000, label: '0.5x' },
                { value: 1500, label: '1x' },
                { value: 750, label: '2x' },
                { value: 375, label: '4x' }
            ];
            
            const currentIndex = speeds.findIndex(s => s.value === demoSpeed);
            const nextIndex = (currentIndex + 1) % speeds.length;
            demoSpeed = speeds[nextIndex].value;
            
            if ($.demoSpeedBtn) {
                $.demoSpeedBtn.textContent = `⚡ ${speeds[nextIndex].label}`;
            }
        }
        
        function initializeMerchantProfiles() {
            // Create risk profiles for different merchants with realistic names
            for (let i = 1; i <= 50; i++) {
                const merchantName = merchantNames[i - 1] || `Merchant ${i}`;
                const baseRisk = Math.random() * 0.3; // 0-0.3 base risk
                const country = countries[Math.floor(Math.random() * countries.length)];
                
                merchantRiskProfiles.set(`MERCH-${i}`, {
                    id: `MERCH-${i}`,
                    name: merchantName,
                    baseRisk,
                    fraudRate: Math.random() * 0.1, // 0-10% fraud rate
                    volume: Math.floor(Math.random() * 10000) + 500,
                    lastSeen: Date.now() - Math.random() * 3600000, // Random time in last hour
                    country: country.code,
                    countryName: country.name,
                    countryRisk: country.risk
                });
            }
        }
        
        function generateAttackEvent(sessionId, merchantId) {
            // Generate coordinated attack pattern
            const score = 0.90 + Math.random() * 0.10;
            const riskLevel = score > 0.95 ? 'critical' : 'high';
            const reason = getRandomFraudReason();
            
            const merchantProfile = merchantRiskProfiles.get(merchantId) || {
                baseRisk: 0.2,
                fraudRate: 0.1,
                volume: 1000,
                country: 'US',
                countryName: 'United States'
            };
            
            const features = {
                root_detected: 1,
                vpn_active: 1,
                thermal_spike: Math.random() * 20 + 10,
                biometric_fail: Math.floor(Math.random() * 4) + 2,
                proxy_hop_count: Math.floor(Math.random() * 5) + 3
            };
            
            // Generate transaction amount (attacks tend to target larger amounts)
            const transactionAmount = 1000 + Math.random() * 2000; // $1000-$3000
            
            const sessionData = {
                sessionId,
                merchantId,
                score,
                riskLevel,
                blocked: true,
                timestamp: Date.now(),
                features,
                reason,
                transactionAmount,
                country: merchantProfile.country,
                countryName: merchantProfile.countryName
            };
            
            // Update transaction data
            transactionData.blockedAmount += transactionAmount;
            transactionData.blockedTransactions++;
            
            // Update geographic data
            updateGeographicData(merchantProfile.country, merchantProfile.countryName, riskLevel, transactionAmount);
            
            // Add to timeline
            addToTimeline('blocked', sessionData);
            
            handleFraudBlocked(sessionData);
            
            if (riskHeatmap) {
                riskHeatmap.addDataPoint(sessionData);
            }
            
            updateRiskScore({
                sessionId,
                merchantId,
                score,
                riskLevel,
                blocked: true,
                timestamp: Date.now()
            });
            
            // Update last update time for demo mode
            updateLastUpdateTime();
        }
        
        function generateDemoEvent() {
            // Adjust probabilities based on phase
            let criticalProb = 0.05;
            let highRiskProb = 0.10;
            
            if (demoPhase === 'surge') {
                criticalProb = 0.15; // 15% critical during surge
                highRiskProb = 0.25; // 25% high risk
            } else if (demoPhase === 'startup') {
                criticalProb = 0.02; // Lower during startup
                highRiskProb = 0.05;
            } else if (demoPhase === 'recovery') {
                criticalProb = 0.03; // Decreasing after surge
                highRiskProb = 0.08;
            }
            
            const eventType = Math.random();
            const sessionId = `demo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
            
            // Select merchant based on risk profile and phase
            let merchantId;
            if (demoPhase === 'surge' && Math.random() < 0.4) {
                // During surge, focus on high-risk merchants
                const highRiskMerchants = Array.from(merchantRiskProfiles.entries())
                    .filter(([_, profile]) => profile.fraudRate > 0.05)
                    .map(([id]) => id);
                merchantId = highRiskMerchants.length > 0 
                    ? highRiskMerchants[Math.floor(Math.random() * highRiskMerchants.length)]
                    : `MERCH-${Math.floor(Math.random() * 50) + 1}`;
            } else {
                merchantId = `MERCH-${Math.floor(Math.random() * 50) + 1}`;
            }
            
            // Get merchant profile
            const merchantProfile = merchantRiskProfiles.get(merchantId) || {
                baseRisk: 0.1,
                fraudRate: 0.02,
                volume: 500
            };
            
            // Generate feature vector based on risk level and merchant profile
            function generateFeatures(riskLevel, merchantRisk) {
                const isHighRisk = riskLevel === 'high' || riskLevel === 'critical';
                const riskMultiplier = merchantRisk.fraudRate * 10;
                
                return {
                    root_detected: isHighRisk && Math.random() > (0.5 - riskMultiplier) ? 1 : 0,
                    vpn_active: isHighRisk && Math.random() > (0.4 - riskMultiplier) ? 1 : (Math.random() > 0.85 ? 1 : 0),
                    thermal_spike: isHighRisk ? Math.random() * 15 + 5 : Math.random() * 3,
                    biometric_fail: isHighRisk ? Math.floor(Math.random() * 3) + 1 : (Math.random() > 0.9 ? 1 : 0),
                    proxy_hop_count: isHighRisk ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 2)
                };
            }
            
            if (eventType < criticalProb) {
                // Critical fraud alert
                const baseScore = 0.85 + Math.random() * 0.15; // 0.85-1.0
                const score = Math.min(1.0, baseScore + merchantProfile.baseRisk);
                const riskLevel = score > 0.95 ? 'critical' : 'high';
                const reason = getRandomFraudReason();
                const features = generateFeatures(riskLevel, merchantProfile);
                
                // Generate transaction amount
                const transactionAmount = generateTransactionAmount(riskLevel, merchantProfile);
                
                const sessionData = {
                    sessionId,
                    merchantId,
                    score,
                    riskLevel,
                    blocked: true,
                    timestamp: Date.now(),
                    features,
                    reason,
                    transactionAmount,
                    country: merchantProfile.country,
                    countryName: merchantProfile.countryName
                };
                
                handleFraudBlocked(sessionData);
                
                // Update transaction data
                transactionData.blockedAmount += transactionAmount;
                transactionData.blockedTransactions++;
                
                // Update geographic data
                updateGeographicData(merchantProfile.country, merchantProfile.countryName, riskLevel, transactionAmount);
                
                // Add to timeline
                addToTimeline('blocked', sessionData);
                
                // Update heatmap with proper FraudSession format
                if (riskHeatmap) {
                    riskHeatmap.addDataPoint(sessionData);
                }
                
                updateRiskScore({
                    sessionId,
                    merchantId,
                    score,
                    riskLevel,
                    blocked: true,
                    timestamp: Date.now()
                });
                
                // Update last update time for demo mode
                updateLastUpdateTime();
            } else if (eventType < criticalProb + highRiskProb) {
                // High-risk fraud detected (warning)
                const baseScore = 0.70 + Math.random() * 0.15; // 0.70-0.85
                const score = Math.min(0.95, baseScore + merchantProfile.baseRisk);
                const riskLevel = 'high';
                const features = generateFeatures(riskLevel, merchantProfile);
                
                // Generate transaction amount
                const transactionAmount = generateTransactionAmount(riskLevel, merchantProfile);
                
                const sessionData = {
                    sessionId,
                    merchantId,
                    score,
                    riskLevel,
                    blocked: false,
                    timestamp: Date.now(),
                    features,
                    transactionAmount,
                    country: merchantProfile.country,
                    countryName: merchantProfile.countryName
                };
                
                handleFraudDetected(sessionData);
                
                // Update transaction data
                transactionData.totalVolume += transactionAmount;
                transactionData.totalTransactions++;
                
                // Update geographic data
                updateGeographicData(merchantProfile.country, merchantProfile.countryName, riskLevel, transactionAmount);
                
                // Add to timeline
                addToTimeline('detected', sessionData);
                
                // Update heatmap
                if (riskHeatmap) {
                    riskHeatmap.addDataPoint(sessionData);
                }
                
                updateRiskScore({
                    sessionId,
                    merchantId,
                    score,
                    riskLevel: 'high',
                    blocked: false,
                    timestamp: Date.now()
                });
                
                // Update last update time for demo mode
                updateLastUpdateTime();
            } else {
                // Normal risk score (most common)
                const baseScore = Math.random() * 0.70; // 0.0-0.70
                const score = Math.min(0.95, baseScore + merchantProfile.baseRisk * Math.random());
                let riskLevel;
                if (score < 0.3) riskLevel = 'low';
                else if (score < 0.5) riskLevel = 'medium';
                else riskLevel = 'high';
                
                const features = generateFeatures(riskLevel, merchantProfile);
                
                // Update merchant profile (learning)
                merchantProfile.lastSeen = Date.now();
                if (score > 0.6) {
                    merchantProfile.fraudRate = Math.min(0.2, merchantProfile.fraudRate + 0.001);
                }
                const sessionData = {
                    sessionId,
                    merchantId,
                    score,
                    riskLevel,
                    blocked: false,
                    timestamp: Date.now(),
                    features
                };
                
                // Update heatmap
                if (riskHeatmap) {
                    riskHeatmap.addDataPoint(sessionData);
                }
                
                updateRiskScore({
                    sessionId,
                    merchantId,
                    score,
                    riskLevel,
                    blocked: false,
                    timestamp: Date.now()
                });
                
                // Update last update time for demo mode
                updateLastUpdateTime();
            }
            
            // Occasionally update feature contributions
            if (Math.random() < 0.3) {
                updateFeatureContributions();
            }
            
            // Update risk distribution chart periodically
            if (Math.random() < 0.2) {
                updateRiskDistribution();
            }
        }
        
        function getRandomFraudReason() {
            const reasons = [
                'Suspicious device fingerprint pattern detected',
                'Multiple failed authentication attempts (3+ failures)',
                'Unusual transaction velocity - 5x normal rate',
                'VPN/proxy detection - Tor network identified',
                'Geolocation anomaly - login from 3 countries in 2 hours',
                'Behavioral pattern mismatch - typing cadence anomaly',
                'Known fraudster device ID - blacklist match',
                'Synthetic identity indicators - SSN validation failed',
                'Account takeover signals - password reset abuse',
                'Payment method risk factors - stolen card patterns',
                'Device emulation detected - Android emulator',
                'Biometric spoofing attempt - liveness check failed',
                'Network fingerprint mismatch - ISP change anomaly',
                'Session hijacking indicators - cookie theft pattern',
                'Credential stuffing attack - multiple account attempts',
                'Man-in-the-middle attack pattern detected',
                'Malware signature match - keylogger detected',
                'Social engineering indicators - phishing link clicked',
                'Time-based anomaly - activity outside normal hours',
                'Velocity check failed - rapid-fire transactions'
            ];
            return reasons[Math.floor(Math.random() * reasons.length)];
        }
        
        function updateFeatureContributions() {
            if (!featureChart) return;
            
            // Calculate feature contributions from recent sessions
            let features = [0, 0, 0, 0, 0]; // Root, VPN, Thermal, Bio, Proxy
            let totalWeight = 0;
            
            if (riskHeatmap) {
                const points = riskHeatmap.getDataPoints();
                // Use last 30 points, weighted by recency and risk
                const recentPoints = points.slice(-30);
                
                recentPoints.forEach((point, index) => {
                    // Weight by recency (newer = higher weight) and risk level
                    const recencyWeight = (recentPoints.length - index) / recentPoints.length;
                    const riskWeight = point.value; // Higher risk = higher weight
                    const weight = recencyWeight * (0.5 + riskWeight * 0.5);
                    
                    // Estimate features from risk level and value
                    const isHighRisk = point.riskLevel === 'high' || point.riskLevel === 'critical';
                    features[0] += (isHighRisk ? 0.6 : 0.1) * weight; // Root
                    features[1] += (isHighRisk ? 0.5 : 0.15) * weight; // VPN
                    features[2] += (point.value * 0.3) * weight; // Thermal (scaled)
                    features[3] += (isHighRisk ? 0.4 : 0.05) * weight; // Bio
                    features[4] += (isHighRisk ? 0.45 : 0.1) * weight; // Proxy
                    
                    totalWeight += weight;
                });
                
                if (totalWeight > 0) {
                    features = features.map(f => (f / totalWeight) * 5); // Scale to 0-5 range
                }
            }
            
            // If no data, generate phase-based values
            if (totalWeight === 0) {
                const phaseMultiplier = demoPhase === 'surge' ? 1.5 : demoPhase === 'recovery' ? 0.8 : 1.0;
                features = [
                    (Math.random() * 2 + 1.5) * phaseMultiplier,  // Root
                    (Math.random() * 1.5 + 1.0) * phaseMultiplier, // VPN
                    (Math.random() * 1.2 + 0.8) * phaseMultiplier,   // Thermal
                    (Math.random() * 1.3 + 1.2) * phaseMultiplier,  // Bio
                    (Math.random() * 1.2 + 1.0) * phaseMultiplier  // Proxy
                ];
            }
            
            // Smooth transition
            const currentData = featureChart.data.datasets[0].data;
            const smoothed = features.map((target, i) => {
                const old = currentData[i] || 0;
                return old + (target - old) * 0.2; // 20% interpolation
            });
            
            featureChart.data.datasets[0].data = smoothed;
            // PERFMASTER PABLO: Use 'none' mode for maximum performance (no animations)
            featureChart.update('none');
        }
        
        function updateRiskDistribution() {
            if (!riskChart) return;
            
            // Get current data points from heatmap if available
            let distribution = [0, 0, 0, 0]; // Critical, High, Medium, Low
            
            if (riskHeatmap) {
                const points = riskHeatmap.getDataPoints();
                // Use recent points for more dynamic updates (last 100)
                const recentPoints = points.slice(-100);
                distribution = [
                    recentPoints.filter(p => p.riskLevel === 'critical').length,
                    recentPoints.filter(p => p.riskLevel === 'high').length,
                    recentPoints.filter(p => p.riskLevel === 'medium').length,
                    recentPoints.filter(p => p.riskLevel === 'low').length
                ];
            } else {
                // Generate realistic distribution based on phase
                const phaseMultiplier = demoPhase === 'surge' ? 2 : demoPhase === 'recovery' ? 0.5 : 1;
                distribution = [
                    Math.floor(Math.random() * 3 * phaseMultiplier),      // Critical
                    Math.floor((Math.random() * 8 + 2) * phaseMultiplier),   // High
                    Math.floor((Math.random() * 15 + 5) * phaseMultiplier),  // Medium
                    Math.floor((Math.random() * 40 + 20) * phaseMultiplier)  // Low
                ];
            }
            
            // Smooth transition
            const currentData = riskChart.data.datasets[0].data;
            const smoothed = currentData.map((old, i) => {
                const target = distribution[i];
                return old + (target - old) * 0.3; // 30% interpolation
            });
            
            riskChart.data.datasets[0].data = smoothed.map(v => Math.max(0, Math.round(v)));
            // PERFMASTER PABLO: Use 'none' mode for maximum performance (no animations)
            riskChart.update('none');
        }
        
        
        // Animate metric value changes
        function animateMetric(elementId, newValue) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const oldValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
            if (oldValue === newValue) {
                return;
            }
            
            // Add pulse animation to parent card
            const card = element.closest('.metric-card');
            if (card) {
                card.classList.add('metric-update');
                setTimeout(() => card.classList.remove('metric-update'), 500);
            }
            
            // Smooth transition
            const diff = newValue - oldValue;
            const steps = Math.min(20, Math.abs(diff));
            const stepValue = diff / steps;
            let current = oldValue;
            let step = 0;
            
            const interval = setInterval(() => {
                step++;
                current += stepValue;
                const displayValue = Math.round(current);
                element.textContent = displayValue.toLocaleString();
                
                if (step >= steps) {
                    element.textContent = newValue.toLocaleString();
                    clearInterval(interval);
                }
            }, 20);
        }
        
        // Generate transaction amount based on risk level
        function generateTransactionAmount(riskLevel, merchantProfile) {
            // Higher risk transactions tend to be larger (fraudsters go for bigger amounts)
            let baseAmount;
            if (riskLevel === 'critical') {
                baseAmount = 500 + Math.random() * 2000; // $500-$2500
            } else if (riskLevel === 'high') {
                baseAmount = 200 + Math.random() * 800; // $200-$1000
            } else if (riskLevel === 'medium') {
                baseAmount = 50 + Math.random() * 200; // $50-$250
            } else {
                baseAmount = 10 + Math.random() * 100; // $10-$110
            }
            
            // Add merchant volume influence
            const volumeMultiplier = Math.min(2, merchantProfile.volume / 5000);
            return Math.round(baseAmount * (0.8 + volumeMultiplier * 0.4));
        }
        
        // Update geographic data
        function updateGeographicData(countryCode, countryName, riskLevel, amount) {
            if (!geographicData.has(countryCode)) {
                geographicData.set(countryCode, {
                    code: countryCode,
                    name: countryName,
                    total: 0,
                    highRisk: 0,
                    blocked: 0,
                    amount: 0,
                    blockedAmount: 0
                });
            }
            
            const data = geographicData.get(countryCode);
            data.total++;
            data.amount += amount;
            
            if (riskLevel === 'high' || riskLevel === 'critical') {
                data.highRisk++;
            }
            
            if (riskLevel === 'critical') {
                data.blocked++;
                data.blockedAmount += amount;
            }
            
            updateGeographicDisplay();
        }
        
        // Update geographic display
        function updateGeographicDisplay() {
            if (!$.geoList || !$.geoRiskList) return;
            
            const sortedCountries = Array.from(geographicData.values())
                .sort((a, b) => b.total - a.total)
                .slice(0, 8);
            
            const sortedHighRisk = Array.from(geographicData.values())
                .filter(c => c.highRisk > 0)
                .sort((a, b) => b.highRisk - a.highRisk)
                .slice(0, 8);
            
            const total = Array.from(geographicData.values()).reduce((sum, c) => sum + c.total, 0);
            const totalHighRisk = Array.from(geographicData.values()).reduce((sum, c) => sum + c.highRisk, 0);
            
            if ($.geoTotal) updateAriaLive($.geoTotal, total.toString()); // Throttled
            if ($.geoHighRisk) updateAriaLive($.geoHighRisk, totalHighRisk.toString()); // Throttled
            
            $.geoList.innerHTML = sortedCountries.length > 0
                ? sortedCountries.map(c => `
                    <div class="flex items-center justify-between">
                        <span>${c.name}</span>
                        <span class="text-gray-400">${c.total}</span>
                    </div>
                `).join('')
                : '<p class="text-gray-500">No data</p>';
            
            $.geoRiskList.innerHTML = sortedHighRisk.length > 0
                ? sortedHighRisk.map(c => `
                    <div class="flex items-center justify-between">
                        <span>${c.name}</span>
                        <span class="text-red-400">${c.highRisk}</span>
                    </div>
                `).join('')
                : '<p class="text-gray-500">No high risk</p>';
        }
        
        // Add to activity timeline
        function addToTimeline(type, data) {
            const timelineContainer = document.getElementById('timelineContainer');
            if (!timelineContainer) return;
            
            // Remove placeholder
            const placeholder = timelineContainer.querySelector('.text-gray-400');
            if (placeholder) {
                placeholder.remove();
            }
            
            const merchantProfile = merchantRiskProfiles.get(data.merchantId);
            const merchantName = merchantProfile?.name || data.merchantId;
            
            const icons = {
                blocked: '🚨',
                detected: '⚠️',
                normal: '✓'
            };
            
            const colors = {
                blocked: 'text-red-400',
                detected: 'text-yellow-400',
                normal: 'text-green-400'
            };
            
            const eventElement = document.createElement('div');
            eventElement.className = `p-2 rounded border-l-2 ${colors[type]} border-${type === 'blocked' ? 'red' : type === 'detected' ? 'yellow' : 'green'}-500 bg-gray-800 bg-opacity-50 mb-1 text-sm`;
            eventElement.style.opacity = '0';
            eventElement.style.transform = 'translateX(-10px)';
            
            const time = new Date(data.timestamp).toLocaleTimeString();
            const amount = data.transactionAmount ? `$${data.transactionAmount.toLocaleString()}` : '';
            const country = data.countryName ? `🌍 ${data.countryName}` : '';
            
            eventElement.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center">
                            <span class="mr-2">${icons[type]}</span>
                            <span class="font-semibold">${merchantName}</span>
                            ${amount ? `<span class="ml-2 text-gray-400">${amount}</span>` : ''}
                        </div>
                        <div class="text-xs text-gray-400 ml-6 mt-1">
                            ${type === 'blocked' ? `BLOCKED: ${data.reason || 'High risk detected'}` :
                              type === 'detected' ? `Risk Score: ${data.score.toFixed(3)}` :
                              `Risk Level: ${data.riskLevel.toUpperCase()}`}
                            ${country ? ` | ${country}` : ''}
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 ml-2 whitespace-nowrap">${time}</span>
                </div>
            `;
            
            timelineContainer.insertBefore(eventElement, timelineContainer.firstChild);
            
            // Animate in
            setTimeout(() => {
                eventElement.style.transition = 'all 0.2s ease-out';
                eventElement.style.opacity = '1';
                eventElement.style.transform = 'translateX(0)';
            }, 10);
            
            activityTimeline.push({ type, data, timestamp: data.timestamp });
            
            // Keep only last 30 items
            while (timelineContainer.children.length > 30) {
                const lastChild = timelineContainer.lastChild;
                lastChild.style.opacity = '0';
                setTimeout(() => lastChild.remove(), 200);
            }
            
            // Keep timeline array in sync
            if (activityTimeline.length > 30) {
                activityTimeline.shift();
            }
        }
        
        // Clear alerts
        // PERFMASTER PABLO: Return all alerts to pool
        window.clearAlerts = function() {
            if ($.alertsContainer) {
                // Return all alert elements to pool
                Array.from($.alertsContainer.children).forEach(child => {
                    if (child.tagName === 'DIV' && child.classList.contains('p-3')) {
                        returnAlertToPool(child);
                    }
                });
                $.alertsContainer.innerHTML = '<p class="text-gray-400 text-center py-8">No alerts yet. Waiting for data...</p>';
            }
            
            if ($.timelineContainer) {
                $.timelineContainer.innerHTML = '<p class="text-gray-400 text-center py-8 text-sm">Activity feed will appear here...</p>';
            }
            
            alertCount = 0;
            activityTimeline = [];
            
            const clearBtn = document.getElementById('clearAlertsBtn');
            if (clearBtn) {
                clearBtn.classList.add('hidden');
            }
        };
        
        // Update transaction analytics
        function updateTransactionAnalytics() {
            if (!$.totalVolume) return;
            
            // PERFMASTER PABLO: Coalesced updates
            const avgTransaction = transactionData.totalTransactions > 0
                ? `$${Math.round(transactionData.totalVolume / transactionData.totalTransactions).toLocaleString()}`
                : '$0';
            const savingsRate = transactionData.totalVolume > 0
                ? (transactionData.blockedAmount / transactionData.totalVolume * 100)
                : 0;
            
            scheduleMetricUpdate({
                totalVolume: `$${transactionData.totalVolume.toLocaleString()}`,
                avgTransaction: avgTransaction,
                blockedAmount: `$${transactionData.blockedAmount.toLocaleString()}`,
                savingsRate: `${savingsRate.toFixed(2)}%`
            });
        }
        
        // Update alert stats
        function updateAlertStats() {
            if ($.alertStats) {
                const blocked = document.querySelectorAll('.fraud-alert').length;
                updateAriaLive($.alertStats, `${alertCount} total | ${blocked} blocked`); // Throttled
            }
            
            const clearBtn = document.getElementById('clearAlertsBtn');
            if (clearBtn && alertCount > 0) {
                clearBtn.classList.remove('hidden');
            }
        }
        
        // Event delegation for data-action attributes (separates JS hooks from style classes)
        // PERFMASTER PABLO: Single event listener with binary state checks
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.getAttribute('data-action');
            if (!action) return;
            
            switch (action) {
                case 'clear-alerts':
                    e.preventDefault();
                    if (typeof window.clearAlerts === 'function') {
                        window.clearAlerts();
                    }
                    break;
                case 'close-fraud-alert':
                    e.preventDefault();
                    if (typeof window.closeFraudAlert === 'function') {
                        window.closeFraudAlert();
                    }
                    break;
                case 'toggle-pause':
                    e.preventDefault();
                    toggleDemoPause();
                    break;
                case 'toggle-speed':
                    e.preventDefault();
                    toggleDemoSpeed();
                    break;
            }
        });
        
        // Cleanup demo mode on page unload
        window.addEventListener('beforeunload', () => {
            if (demoInterval) {
                clearInterval(demoInterval);
            }
        });
