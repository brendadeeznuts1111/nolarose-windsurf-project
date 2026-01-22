#!/usr/bin/env bun

// Sovereign Logger - Enterprise-grade logging framework
// Production-ready with configurable levels, no console dependencies

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const LOG_LEVEL_NAMES = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
  4: 'NONE'
};

class SovereignLogger {
  constructor(component = 'SOVEREIGN') {
    this.component = component;
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
    this.enableConsole = process.env.LOG_TO_CONSOLE !== 'false';
    this.enableFile = process.env.LOG_TO_FILE === 'true';
    this.logFile = process.env.LOG_FILE || './logs/sovereign.log';
    this.traceId = this.generateTraceId();

    // Performance tracking
    this.metrics = {
      logsProcessed: 0,
      errorsLogged: 0,
      warningsLogged: 0,
      startTime: Date.now()
    };
  }

  setLevel(level) {
    if (typeof level === 'string') {
      level = LOG_LEVELS[level.toUpperCase()];
    }
    this.level = level || LOG_LEVELS.INFO;
  }

  shouldLog(level) {
    return level >= this.level;
  }

  formatMessage(level, message, metadata) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    const pid = process.pid;

    let formatted = `[${timestamp}] [${levelName}] [${this.component}] [TRACE:${this.traceId}] ${message}`;

    if (metadata) {
      if (typeof metadata === 'object') {
        formatted += ` ${JSON.stringify(metadata)}`;
      } else {
        formatted += ` ${metadata}`;
      }
    }

    return formatted;
  }

  generateTraceId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  async writeToFile(message) {
    if (!this.enableFile) return;

    try {
      // Use Bun's file API for production logging
      await Bun.write(this.logFile, message + '\n', { createPath: true });
    } catch (error) {
      // Silent fail - don't create logging loops
    }
  }

  async debug(message, metadata) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;

    const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message, metadata);
    if (this.enableConsole) await this.writeToStdout(formatted);
    await this.writeToFile(formatted);
    this.metrics.logsProcessed++;
  }

  async info(message, metadata) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;

    const formatted = this.formatMessage(LOG_LEVELS.INFO, message, metadata);
    if (this.enableConsole) await this.writeToStdout(formatted);
    await this.writeToFile(formatted);
    this.metrics.logsProcessed++;
  }

  async warn(message, metadata) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;

    const formatted = this.formatMessage(LOG_LEVELS.WARN, message, metadata);
    if (this.enableConsole) await this.writeToStderr(formatted);
    await this.writeToFile(formatted);
    this.metrics.logsProcessed++;
    this.metrics.warningsLogged++;
  }

  async error(message, metadata) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

    const formatted = this.formatMessage(LOG_LEVELS.ERROR, message, metadata);
    if (this.enableConsole) await this.writeToStderr(formatted);
    await this.writeToFile(formatted);
    this.metrics.logsProcessed++;
    this.metrics.errorsLogged++;
  }

  async writeToStdout(message) {
    try {
      await Bun.write(Bun.stdout, message + '\n');
    } catch (error) {
      // Fallback to process.stdout
      process.stdout.write(message + '\n');
    }
  }

  async writeToStderr(message) {
    try {
      await Bun.write(Bun.stderr, message + '\n');
    } catch (error) {
      // Fallback to process.stderr
      process.stderr.write(message + '\n');
    }
  }

  // Emergency logging (always logs)
  async emergency(message, metadata) {
    const formatted = this.formatMessage(LOG_LEVELS.ERROR, `🚨 EMERGENCY: ${message}`, metadata);
    await this.writeToStderr(formatted);
    await this.writeToFile(`EMERGENCY: ${formatted}`);
    this.metrics.logsProcessed++;
    this.metrics.errorsLogged++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      level: LOG_LEVEL_NAMES[this.level],
      component: this.component
    };
  }

  // Legacy NebulaLogger compatibility
  log(level, message, metadata) {
    switch (level) {
      case 'debug': return this.debug(message, metadata);
      case 'info': return this.info(message, metadata);
      case 'warn': return this.warn(message, metadata);
      case 'error': return this.error(message, metadata);
    }
  }
}

// Global logger instance
const logger = new SovereignLogger('NEBULA');

// Legacy compatibility
export class NebulaLogger extends SovereignLogger {
  constructor(component) {
    super(component);
  }
}

export default logger;
export { SovereignLogger, logger, LOG_LEVELS };
