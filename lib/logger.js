/**
 * Comprehensive Logging System
 * Provides structured logging with levels, timestamps, and file output
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Current log level (can be set via env)
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Get current timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Format log message
function formatMessage(level, category, message, data) {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] [${category}] ${message}${dataStr}`;
}

// Write to log file
function writeToFile(level, message) {
  ensureLogDir();
  const date = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `${date}.log`);
  const errorFile = path.join(LOG_DIR, `${date}-errors.log`);
  
  fs.appendFileSync(logFile, message + '\n');
  
  if (level === 'ERROR') {
    fs.appendFileSync(errorFile, message + '\n');
  }
}

// Console colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m'
};

// Log function factory
function createLogger(category = 'APP') {
  return {
    error(message, data = null, error = null) {
      if (CURRENT_LEVEL >= LOG_LEVELS.ERROR) {
        const errorData = error ? { ...data, stack: error.stack, errorMessage: error.message } : data;
        const formatted = formatMessage('ERROR', category, message, errorData);
        console.error(`${colors.red}${formatted}${colors.reset}`);
        writeToFile('ERROR', formatted);
      }
    },
    
    warn(message, data) {
      if (CURRENT_LEVEL >= LOG_LEVELS.WARN) {
        const formatted = formatMessage('WARN', category, message, data || null);
        console.warn(`${colors.yellow}${formatted}${colors.reset}`);
        writeToFile('WARN', formatted);
      }
    },
    
    info(message, data = null) {
      if (CURRENT_LEVEL >= LOG_LEVELS.INFO) {
        const formatted = formatMessage('INFO', category, message, data);
        console.log(`${colors.blue}${formatted}${colors.reset}`);
        writeToFile('INFO', formatted);
      }
    },
    
    debug(message, data = null) {
      if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
        const formatted = formatMessage('DEBUG', category, message, data);
        console.log(`${colors.cyan}${formatted}${colors.reset}`);
        writeToFile('DEBUG', formatted);
      }
    },
    
    trace(message, data = null) {
      if (CURRENT_LEVEL >= LOG_LEVELS.TRACE) {
        const formatted = formatMessage('TRACE', category, message, data);
        console.log(`${colors.gray}${formatted}${colors.reset}`);
        writeToFile('TRACE', formatted);
      }
    },
    
    // Log source activity
    source(sourceName, action, data = null) {
      this.info(`[${sourceName}] ${action}`, data);
    },
    
    // Log scraper activity
    scrape(sourceName, action, data = null) {
      this.debug(`[SCRAPER:${sourceName}] ${action}`, data);
    },
    
    // Log database activity
    db(action, data = null) {
      this.debug(`[DATABASE] ${action}`, data);
    },
    
    // Log API requests
    api(method, path, status, duration) {
      this.info(`${method} ${path} ${status} ${duration}ms`);
    }
  };
}

// Get recent logs
export function getRecentLogs(lines = 100, level = 'all') {
  ensureLogDir();
  const date = new Date().toISOString().split('T')[0];
  const logFile = level === 'error' 
    ? path.join(LOG_DIR, `${date}-errors.log`)
    : path.join(LOG_DIR, `${date}.log`);
  
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  const content = fs.readFileSync(logFile, 'utf-8');
  const allLines = content.split('\n').filter(Boolean);
  return allLines.slice(-lines);
}

// Clear old logs (keep last 7 days)
export function cleanOldLogs() {
  ensureLogDir();
  const files = fs.readdirSync(LOG_DIR);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  let deleted = 0;
  for (const file of files) {
    const filePath = path.join(LOG_DIR, file);
    const stat = fs.statSync(filePath);
    if (stat.mtime.getTime() < cutoff) {
      fs.unlinkSync(filePath);
      deleted++;
    }
  }
  
  return deleted;
}

// Default logger
const logger = createLogger('APP');

export { createLogger, LOG_LEVELS };
export default logger;
