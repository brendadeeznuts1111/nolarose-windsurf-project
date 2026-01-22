#!/usr/bin/env bun

// modules/plaid-verifier.js - Isolated Plaid Module
// Bank account verification via Plaid API with caching and validation

console.log("🏦 Plaid Verifier Module - Loaded");

/**
 * Plaid Verifier for bank account integration
 * 
 * Manages Plaid API integration, account verification, and caching:
 * - Link token generation
 * - Account verification and validation
 * - Transaction analysis
 * - Balance verification
 */
export class PlaidVerifier {
    constructor(config = {}) {
        this.config = {
            clientId: config.clientId || process.env.PLAID_CLIENT_ID,
            secret: config.secret || process.env.PLAID_SECRET,
            env: config.env || process.env.PLAID_ENV || 'sandbox',
            products: config.products || ['auth', 'transactions'],
            countryCodes: config.countryCodes || ['US'],
            language: config.language || 'en',
            webhook: config.webhook || process.env.PLAID_WEBHOOK,
            cacheExpiry: config.cacheExpiry || 1800, // 30 minutes
            ...config
        };
        
        this.linkTokenCache = new Map();
        this.verificationCache = new Map();
        this.metrics = {
            totalVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
            averageVerificationTime: 0,
            accountsVerified: 0
        };
        
        this.initialized = false;
        this.baseURL = this.getPlaidURL();
    }
    
    /**
     * Initialize Plaid verifier
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Validate configuration
            this.validateConfig();
            
            // Test Plaid connectivity
            await this.testConnectivity();
            
            // Clean expired cache
            this.cleanupExpired();
            
            this.initialized = true;
            console.log('✅ Plaid Verifier initialized');
            
        } catch (error) {
            console.error('❌ Plaid Verifier initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Verify bank account for user
     */
    async verifyBankAccount(userData, identityResult) {
        const startTime = performance.now();
        this.metrics.totalVerifications++;
        
        try {
            console.log(`🏦 Verifying bank account for user: ${this.maskPII(userData.userId)}`);
            
            // Check cache first
            const cacheKey = `${userData.userId}_${identityResult.verificationId}`;
            const cached = this.verificationCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry * 1000) {
                console.log('📋 Using cached verification result');
                return {
                    ...cached.result,
                    cached: true,
                    verificationTime: (performance.now() - startTime).toFixed(2)
                };
            }
            
            // Generate link token
            const linkToken = await this.generateLinkToken(userData, identityResult);
            
            // Create public token exchange (in real flow, this comes from frontend)
            const publicToken = await this.simulatePublicTokenExchange(linkToken);
            
            // Exchange public token for access token
            const accessToken = await this.exchangePublicToken(publicToken);
            
            // Get account information
            const accounts = await this.getAccounts(accessToken);
            
            // Verify account ownership and balance
            const verification = await this.verifyAccountDetails(accounts, userData);
            
            // Get recent transactions for additional verification
            const transactions = await this.getRecentTransactions(accessToken);
            
            // Analyze transaction patterns
            const transactionAnalysis = this.analyzeTransactions(transactions, userData);
            
            const result = {
                success: true,
                userId: this.maskPII(userData.userId),
                verificationId: identityResult.verificationId,
                linkToken: linkToken.link_token,
                accounts: accounts.map(acc => ({
                    accountId: this.maskPII(acc.account_id),
                    name: acc.name,
                    type: acc.type,
                    subtype: acc.subtype,
                    verificationStatus: acc.verification_status,
                    balance: acc.balances?.current || 0
                })),
                verification: {
                    accountMatch: verification.accountMatch,
                    balanceVerified: verification.balanceVerified,
                    riskScore: verification.riskScore,
                    confidence: verification.confidence
                },
                transactionAnalysis: {
                    totalTransactions: transactionAnalysis.total,
                    averageAmount: transactionAnalysis.averageAmount,
                    riskIndicators: transactionAnalysis.riskIndicators,
                    patterns: transactionAnalysis.patterns
                },
                verificationTime: (performance.now() - startTime).toFixed(2),
                cached: false
            };
            
            // Cache result
            this.verificationCache.set(cacheKey, {
                result,
                timestamp: Date.now()
            });
            
            this.metrics.successfulVerifications++;
            this.metrics.accountsVerified += accounts.length;
            
            const verificationTime = performance.now() - startTime;
            this.updateMetrics(verificationTime, true);
            
            return result;
            
        } catch (error) {
            const verificationTime = performance.now() - startTime;
            this.updateMetrics(verificationTime, false);
            
            console.error('❌ Bank account verification failed:', error);
            return {
                success: false,
                error: error.message,
                userId: this.maskPII(userData.userId),
                verificationTime: verificationTime.toFixed(2)
            };
        }
    }
    
    /**
     * Generate Plaid link token
     */
    async generateLinkToken(userData, identityResult) {
        try {
            const response = await this.makePlaidRequest('/link/token/create', {
                user: {
                    client_user_id: userData.userId,
                    email: userData.email,
                    phone_number: userData.phone
                },
                client_name: 'Cash App Verification',
                products: this.config.products,
                country_codes: this.config.countryCodes,
                language: this.config.language,
                webhook: this.config.webhook
            });
            
            return response;
            
        } catch (error) {
            throw new Error(`Failed to generate link token: ${error.message}`);
        }
    }
    
    /**
     * Exchange public token for access token
     */
    async exchangePublicToken(publicToken) {
        try {
            const response = await this.makePlaidRequest('/item/public_token/exchange', {
                public_token: publicToken
            });
            
            return response.access_token;
            
        } catch (error) {
            throw new Error(`Failed to exchange public token: ${error.message}`);
        }
    }
    
    /**
     * Get account information
     */
    async getAccounts(accessToken) {
        try {
            const response = await this.makePlaidRequest('/accounts/get', {
                access_token: accessToken
            });
            
            return response.accounts;
            
        } catch (error) {
            throw new Error(`Failed to get accounts: ${error.message}`);
        }
    }
    
    /**
     * Get recent transactions
     */
    async getRecentTransactions(accessToken, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const response = await this.makePlaidRequest('/transactions/get', {
                access_token: accessToken,
                start_date: startDate.toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                count: 100
            });
            
            return response.transactions;
            
        } catch (error) {
            console.warn('Failed to get transactions:', error.message);
            return [];
        }
    }
    
    /**
     * Verify account details
     */
    async verifyAccountDetails(accounts, userData) {
        const verification = {
            accountMatch: false,
            balanceVerified: false,
            riskScore: 0,
            confidence: 0
        };
        
        // Check if user has provided account info that matches
        if (userData.accountNumber && userData.routingNumber) {
            verification.accountMatch = this.verifyAccountNumbers(accounts, userData);
        }
        
        // Check account balances
        const totalBalance = accounts.reduce((sum, acc) => 
            sum + (acc.balances?.current || 0), 0);
        
        verification.balanceVerified = totalBalance > 0;
        
        // Calculate risk score based on account types and balances
        verification.riskScore = this.calculateRiskScore(accounts, totalBalance);
        
        // Calculate confidence based on verification factors
        verification.confidence = this.calculateConfidence(verification);
        
        return verification;
    }
    
    /**
     * Analyze transactions for risk patterns
     */
    analyzeTransactions(transactions, userData) {
        const analysis = {
            total: transactions.length,
            averageAmount: 0,
            riskIndicators: [],
            patterns: []
        };
        
        if (transactions.length === 0) return analysis;
        
        // Calculate average amount
        analysis.averageAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
        
        // Check for risk indicators
        const largeTransactions = transactions.filter(t => Math.abs(t.amount) > 10000);
        if (largeTransactions.length > 0) {
            analysis.riskIndicators.push('Large transactions detected');
        }
        
        const frequentTransactions = transactions.filter(t => 
            t.name.toLowerCase().includes('gambling') || 
            t.name.toLowerCase().includes('casino')
        );
        if (frequentTransactions.length > 0) {
            analysis.riskIndicators.push('High-risk transaction categories');
        }
        
        // Identify patterns
        const regularDeposits = transactions.filter(t => t.amount > 0).length;
        const regularWithdrawals = transactions.filter(t => t.amount < 0).length;
        
        if (regularDeposits > regularWithdrawals * 2) {
            analysis.patterns.push('Positive cash flow pattern');
        }
        
        if (Math.abs(analysis.averageAmount) < 100) {
            analysis.patterns.push('Low-value transaction pattern');
        }
        
        return analysis;
    }
    
    /**
     * Verify account numbers against provided info
     */
    verifyAccountNumbers(accounts, userData) {
        // In a real implementation, this would use account masking
        // For demo, we'll simulate verification
        return accounts.some(acc => 
            acc.verification_status === 'verified' && 
            acc.type === 'depository'
        );
    }
    
    /**
     * Calculate risk score for accounts
     */
    calculateRiskScore(accounts, totalBalance) {
        let riskScore = 0;
        
        // Account type risk
        const hasInvestment = accounts.some(acc => acc.type === 'investment');
        if (hasInvestment) riskScore += 10;
        
        const hasCredit = accounts.some(acc => acc.type === 'credit');
        if (hasCredit) riskScore += 15;
        
        // Balance risk
        if (totalBalance < 100) riskScore += 20;
        else if (totalBalance > 100000) riskScore += 5;
        
        // Account age risk (simplified)
        const newAccounts = accounts.filter(acc => 
            acc.verification_status !== 'verified'
        ).length;
        riskScore += newAccounts * 10;
        
        return Math.min(riskScore, 100);
    }
    
    /**
     * Calculate verification confidence
     */
    calculateConfidence(verification) {
        let confidence = 0;
        
        if (verification.accountMatch) confidence += 40;
        if (verification.balanceVerified) confidence += 30;
        if (verification.riskScore < 30) confidence += 20;
        if (verification.riskScore < 10) confidence += 10;
        
        return Math.min(confidence, 100);
    }
    
    /**
     * Simulate public token exchange (for demo)
     */
    async simulatePublicTokenExchange(linkToken) {
        // In a real implementation, this comes from the frontend
        // For demo, we'll simulate a successful exchange
        return 'public-sandbox-demo-token';
    }
    
    /**
     * Make request to Plaid API
     */
    async makePlaidRequest(endpoint, data) {
        const url = `${this.baseURL}${endpoint}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Plaid-Client-Id': this.config.clientId,
                'Plaid-Secret': this.config.secret
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Plaid API error: ${error.error_message || response.statusText}`);
        }
        
        return response.json();
    }
    
    /**
     * Test Plaid connectivity
     */
    async testConnectivity() {
        try {
            // Skip connectivity test in development/sandbox mode
            if (this.config.env === 'sandbox' || this.config.env === 'development') {
                console.log('⚠️ Skipping Plaid connectivity test in development mode');
                return true;
            }
            
            const response = await this.makePlaidRequest('/institutions/get', {
                count: 1,
                country_codes: this.config.countryCodes
            });
            
            return response.institutions.length > 0;
            
        } catch (error) {
            throw new Error(`Plaid connectivity test failed: ${error.message}`);
        }
    }
    
    /**
     * Get Plaid API URL based on environment
     */
    getPlaidURL() {
        const urls = {
            sandbox: 'https://sandbox.plaid.com',
            development: 'https://development.plaid.com',
            production: 'https://api.plaid.com'
        };
        
        return urls[this.config.env] || urls.sandbox;
    }
    
    /**
     * Validate configuration
     */
    validateConfig() {
        const required = ['clientId', 'secret'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required Plaid config: ${missing.join(', ')}`);
        }
    }
    
    /**
     * Clean expired cache
     */
    cleanupExpired() {
        const now = Date.now();
        
        for (const [key, data] of this.verificationCache.entries()) {
            if (now - data.timestamp > this.config.cacheExpiry * 1000) {
                this.verificationCache.delete(key);
            }
        }
    }
    
    /**
     * Update metrics
     */
    updateMetrics(verificationTime, success) {
        if (success) {
            this.metrics.successfulVerifications++;
        } else {
            this.metrics.failedVerifications++;
        }
        
        const totalVerifications = this.metrics.totalVerifications;
        const currentAvg = this.metrics.averageVerificationTime;
        this.metrics.averageVerificationTime = 
            (currentAvg * (totalVerifications - 1) + verificationTime) / totalVerifications;
    }
    
    /**
     * Get module metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalVerifications > 0 
                ? (this.metrics.successfulVerifications / this.metrics.totalVerifications) * 100 
                : 0,
            cachedVerifications: this.verificationCache.size,
            environment: this.config.env
        };
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Check configuration
            this.validateConfig();
            
            // Test connectivity
            const isConnected = await this.testConnectivity();
            
            return {
                status: isConnected ? 'healthy' : 'unhealthy',
                initialized: this.initialized,
                environment: this.config.env,
                metrics: this.getMetrics(),
                config: {
                    hasClientId: !!this.config.clientId,
                    hasSecret: !!this.config.secret,
                    products: this.config.products,
                    countryCodes: this.config.countryCodes
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
    
    /**
     * Check if module is healthy
     */
    isHealthy() {
        return this.initialized && !!this.config.clientId && !!this.config.secret;
    }
    
    /**
     * Shutdown module
     */
    async shutdown() {
        console.log('🔄 Shutting down Plaid Verifier...');
        
        this.linkTokenCache.clear();
        this.verificationCache.clear();
        this.initialized = false;
        
        console.log('✅ Plaid Verifier shutdown complete');
    }
    
    /**
     * Mask PII for logging
     */
    maskPII(value) {
        if (!value) return 'undefined';
        const str = String(value);
        if (str.length <= 4) return '****';
        return str.substring(0, 2) + '****' + str.substring(str.length - 2);
    }
}

export default PlaidVerifier;
