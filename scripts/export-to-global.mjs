#!/usr/bin/env node
/**
 * Export verified contracts from local Hedera Sourcify to global Sourcify (v2 API).
 *
 * Fetches contracts via API from local Sourcify instance and re-submits them
 * to global Sourcify for verification. Fully API-based - no local filesystem access needed.
 *
 * USAGE:
 *   node scripts/export-to-global.mjs --chain-id <id> [options]
 *
 * EXAMPLES:
 *   # Dry run to see what would be exported
 *   node scripts/export-to-global.mjs --chain-id 296 --dry-run --verbose
 *
 *   # Export testnet full matches
 *   node scripts/export-to-global.mjs --chain-id 296
 *
 *   # Export mainnet partial matches
 *   node scripts/export-to-global.mjs --chain-id 295 --match-type partial_match
 *
 *   # Custom API URLs
 *   node scripts/export-to-global.mjs --chain-id 296 \
 *     --local-api-url https://server-verify.hashscan.io \
 *     --global-api-url https://sourcify.dev/server
 *
 * OPTIONS:
 *   --chain-id <id>          295 (mainnet) or 296 (testnet) (required)
 *   --match-type <type>      full_match or partial_match (default: full_match)
 *   --local-api-url <url>    Local Sourcify API (default: https://server-verify.hashscan.io)
 *   --global-api-url <url>   Global Sourcify API (default: https://sourcify.dev/server)
 *   --log-file <path>        Export log path (default: ./export-log-{chainId}.json)
 *   --dry-run                Log actions without submitting to API
 *   --verbose                Show detailed debug output
 *   --delay-ms <ms>          Delay between API requests (default: 1000)
 *
 * EXPORT LOG:
 *   Tracks status per contract (SUCCESS/FAILED/SKIPPED). On re-run, contracts
 *   with SUCCESS status are skipped. Uses atomic writes to prevent corruption.
 *
 * See: docs/ADR_SOURCIFY_EXPORT_TO_GLOBAL.md for decision context.
 */

import fs from 'fs';
import { getAddress } from 'ethers';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  localApiUrl: 'https://server-verify.hashscan.io',
  globalApiUrl: 'https://sourcify.dev/server',
  matchType: 'full_match',
  delayMs: 1000,
  pollIntervalMs: 2000,
  pollMaxAttempts: 60, // 2 minutes max polling time
};

const CHAIN_NAMES = {
  295: 'Hedera Mainnet',
  296: 'Hedera Testnet',
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    chainId: null,
    matchType: DEFAULTS.matchType,
    localApiUrl: DEFAULTS.localApiUrl,
    globalApiUrl: DEFAULTS.globalApiUrl,
    logFile: null,
    dryRun: false,
    verbose: false,
    delayMs: DEFAULTS.delayMs,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--chain-id':
        config.chainId = parseInt(args[++i], 10);
        break;
      case '--match-type':
        config.matchType = args[++i];
        break;
      case '--local-api-url':
        config.localApiUrl = args[++i];
        break;
      case '--global-api-url':
        config.globalApiUrl = args[++i];
        break;
      case '--log-file':
        config.logFile = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--delay-ms':
        config.delayMs = parseInt(args[++i], 10);
        break;
    }
  }

  if (!config.logFile) {
    config.logFile = `./export-log-${config.chainId}.json`;
  }

  return config;
}

function validateConfig(config) {
  const errors = [];

  if (!config.chainId) {
    errors.push('--chain-id is required');
  } else if (![295, 296].includes(config.chainId)) {
    errors.push('--chain-id must be 295 or 296');
  }

  if (!['full_match', 'partial_match'].includes(config.matchType)) {
    errors.push('--match-type must be full_match or partial_match');
  }

  if (errors.length > 0) {
    console.error('Errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\nUsage: node scripts/export-to-global.mjs --chain-id <id>');
    process.exit(1);
  }
}

// ============================================================================
// Logging
// ============================================================================

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function logVerbose(config, message) {
  if (config.verbose) {
    log(`[VERBOSE] ${message}`);
  }
}

// ============================================================================
// Export Log Management
// ============================================================================

function loadExportLog(logFile, chainId) {
  if (fs.existsSync(logFile)) {
    try {
      const data = fs.readFileSync(logFile, 'utf8');
      const parsed = JSON.parse(data);
      log(`Loaded existing export log with ${Object.keys(parsed.contracts || {}).length} contracts`);
      return parsed;
    } catch (err) {
      log(`Warning: Could not parse log file, starting fresh: ${err.message}`);
    }
  }

  return {
    chainId,
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    stats: { total: 0, success: 0, failed: 0, skipped: 0 },
    contracts: {},
  };
}

function saveExportLog(exportLog, logFile) {
  const tempFile = `${logFile}.tmp`;
  const backupFile = `${logFile}.backup`;

  if (fs.existsSync(logFile)) {
    fs.copyFileSync(logFile, backupFile);
  }

  exportLog.lastUpdated = new Date().toISOString();
  fs.writeFileSync(tempFile, JSON.stringify(exportLog, null, 2));
  fs.renameSync(tempFile, logFile);
}

function updateStats(exportLog) {
  const contracts = Object.values(exportLog.contracts);
  exportLog.stats = {
    total: contracts.length,
    success: contracts.filter((c) => c.status === 'SUCCESS').length,
    failed: contracts.filter((c) => c.status === 'FAILED').length,
    skipped: contracts.filter((c) => c.status === 'SKIPPED').length,
  };
}

// ============================================================================
// Local Sourcify API Client
// ============================================================================

async function fetchContractList(config) {
  const url = `${config.localApiUrl}/files/contracts/${config.chainId}`;
  logVerbose(config, `GET ${url}`);

  const response = await fetchWithRetry(url, undefined, config);
  if (!response.ok) {
    throw new Error(`Failed to fetch contract list: HTTP ${response.status}`);
  }

  const data = await response.json();
  const fullCount = data.full?.length || 0;
  const partialCount = data.partial?.length || 0;
  logVerbose(config, `Response: ${fullCount} full, ${partialCount} partial`);

  // Warn if either list has exactly 200 entries — may indicate the endpoint
  // is silently truncating results (e.g. upstream Sourcify deprecation).
  if (fullCount === 200 || partialCount === 200) {
    log(`WARNING: Contract list has exactly 200 entries (full=${fullCount}, partial=${partialCount}).`);
    log(`WARNING: This may indicate the API is truncating results. Verify all contracts are included.`);
  }

  // Return addresses based on match type
  if (config.matchType === 'full_match') {
    return data.full || [];
  } else {
    return data.partial || [];
  }
}

async function fetchContractFiles(config, address) {
  const url = `${config.localApiUrl}/files/any/${config.chainId}/${address}`;
  logVerbose(config, `GET ${url}`);

  const response = await fetchWithRetry(url, undefined, config);
  if (!response.ok) {
    throw new Error(`Failed to fetch contract files: HTTP ${response.status}`);
  }

  const data = await response.json();
  logVerbose(config, `Fetched ${data.files?.length || 0} files, status: ${data.status}`);

  return data;
}

// ============================================================================
// Global Sourcify API Client
// ============================================================================

async function checkAlreadyVerified(config, address) {
  const url = `${config.globalApiUrl}/check-by-addresses?addresses=${address}&chainIds=${config.chainId}`;
  logVerbose(config, `GET ${url}`);

  try {
    const response = await fetchWithRetry(url, undefined, config);
    logVerbose(config, `Response status: ${response.status}`);

    if (response.status === 200) {
      const data = await response.json();
      if (data && data[0]) {
        const status = data[0].status;
        if (status === 'perfect' || status === 'partial') {
          return { verified: true, matchType: status };
        }
      }
    }
    return { verified: false };
  } catch (err) {
    logVerbose(config, `Error checking verification: ${err.message}`);
    return { verified: false, error: err.message };
  }
}

async function submitForVerification(config, address, metadata, sources) {
  const url = `${config.globalApiUrl}/v2/verify/metadata/${config.chainId}/${address}`;
  logVerbose(config, `POST ${url}`);

  const body = { metadata, sources };
  logVerbose(config, `Request body sources: ${Object.keys(sources).join(', ')}`);

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, config);

  const responseText = await response.text();
  logVerbose(config, `Response status: ${response.status}, body: ${responseText.substring(0, 500)}`);

  if (response.status === 202) {
    try {
      const data = JSON.parse(responseText);
      return { success: true, verificationId: data.verificationId };
    } catch {
      return { success: false, error: `Invalid response: ${responseText.substring(0, 200)}` };
    }
  }

  return { success: false, error: `HTTP ${response.status}: ${responseText.substring(0, 200)}` };
}

async function pollVerificationStatus(config, verificationId) {
  const url = `${config.globalApiUrl}/v2/verify/${verificationId}`;

  for (let attempt = 0; attempt < DEFAULTS.pollMaxAttempts; attempt++) {
    logVerbose(config, `Polling attempt ${attempt + 1}/${DEFAULTS.pollMaxAttempts}`);

    try {
      const response = await fetchWithRetry(url, undefined, config);
      const data = await response.json();

      logVerbose(config, `Poll response: isJobCompleted=${data.isJobCompleted}, match=${data.contract?.match}`);

      // Check if job is completed
      if (data.isJobCompleted) {
        const match = data.contract?.match;
        if (match === 'exact_match') {
          return { success: true, matchType: 'perfect' };
        }
        if (match === 'match') {
          return { success: true, matchType: 'partial' };
        }
        // Job completed but no match - verification failed
        return { success: false, error: data.error || 'Verification failed - no match' };
      }

      // Still pending, wait and retry
      await sleep(DEFAULTS.pollIntervalMs);
    } catch (err) {
      logVerbose(config, `Poll error: ${err.message}`);
      await sleep(DEFAULTS.pollIntervalMs);
    }
  }

  return { success: false, error: 'Verification polling timed out' };
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, config, maxRetries = 3) {
  const retryableStatuses = [408, 429, 500, 502, 503, 504];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success or non-retryable error - return immediately
      if (response.ok || !retryableStatuses.includes(response.status)) {
        return response;
      }

      // Retryable error - wait and retry if attempts remain
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, cap at 30s
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;

        logVerbose(config, `Retryable error ${response.status}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }

      // Final attempt failed, return the error response
      return response;

    } catch (err) {
      // Network error (timeout, DNS failure, connection refused)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        logVerbose(config, `Network error: ${err.message}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      // Final attempt, throw the error
      throw err;
    }
  }
}

function shortenAddress(address) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function recordContractResult(exportLog, logFile, address, contractEntry) {
  exportLog.contracts[address] = {
    ...contractEntry,
    timestamp: new Date().toISOString(),
  };
  updateStats(exportLog);
  saveExportLog(exportLog, logFile);
}

// ============================================================================
// Main Export Logic
// ============================================================================

async function exportContract(config, exportLog, address, index, total) {
  const prefix = `[${index + 1}/${total}] ${shortenAddress(address)}`;

  // Check if already successfully exported
  if (exportLog.contracts[address]?.status === 'SUCCESS') {
    log(`${prefix} - Already exported, skipping`);
    return;
  }

  // Normalize address (checksummed)
  let checksummedAddress;
  try {
    checksummedAddress = getAddress(address);
  } catch {
    checksummedAddress = address;
  }

  // Step 1: Check if already verified on global Sourcify
  log(`${prefix} - Checking global Sourcify...`);
  const existingCheck = await checkAlreadyVerified(config, checksummedAddress);

  if (existingCheck.verified) {
    log(`${prefix} - SKIPPED (already verified on global as ${existingCheck.matchType})`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'SKIPPED',
      reason: 'Already verified on global',
      globalMatchType: existingCheck.matchType,
    });
    return;
  }

  // Step 2: Fetch contract files from local Sourcify API
  log(`${prefix} - Fetching from local Sourcify...`);
  let contractData;
  try {
    contractData = await fetchContractFiles(config, checksummedAddress);
  } catch (err) {
    log(`${prefix} - FAILED: ${err.message}`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'FAILED',
      localMatchType: config.matchType,
      error: err.message,
    });
    return;
  }

  // Parse metadata and sources from API response
  let metadata = null;
  const sources = {};

  for (const file of contractData.files || []) {
    if (file.name === 'metadata.json') {
      try {
        metadata = JSON.parse(file.content);
      } catch (err) {
        log(`${prefix} - FAILED: Invalid metadata.json`);
        recordContractResult(exportLog, config.logFile, address, {
          status: 'FAILED',
          localMatchType: config.matchType,
          error: `Invalid metadata.json: ${err.message}`,
        });
        return;
      }
    } else {
      // Source file - use filename as key
      sources[file.name] = file.content;
    }
  }

  if (!metadata) {
    log(`${prefix} - FAILED: No metadata.json found`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'FAILED',
      localMatchType: config.matchType,
      error: 'No metadata.json found',
    });
    return;
  }

  if (Object.keys(sources).length === 0) {
    log(`${prefix} - FAILED: No source files found`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'FAILED',
      localMatchType: config.matchType,
      error: 'No source files found',
    });
    return;
  }

  logVerbose(config, `Files: metadata.json + ${Object.keys(sources).join(', ')}`);

  // Step 3: Submit for verification (or dry-run)
  if (config.dryRun) {
    log(`${prefix} - DRY RUN: Would submit metadata + ${Object.keys(sources).length} source files`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'SKIPPED',
      reason: 'Dry run - not submitted',
      localMatchType: config.matchType,
      sourceFiles: Object.keys(sources),
    });
    return;
  }

  log(`${prefix} - Submitting to global Sourcify (v2 API)...`);
  const submitResult = await submitForVerification(config, checksummedAddress, metadata, sources);

  if (!submitResult.success) {
    log(`${prefix} - FAILED: ${submitResult.error}`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'FAILED',
      localMatchType: config.matchType,
      error: submitResult.error,
    });
    return;
  }

  // Step 4: Poll for verification result
  log(`${prefix} - Polling for result (id: ${submitResult.verificationId})...`);
  const pollResult = await pollVerificationStatus(config, submitResult.verificationId);

  if (pollResult.success) {
    log(`${prefix} - SUCCESS (${pollResult.matchType})`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'SUCCESS',
      localMatchType: config.matchType,
      globalMatchType: pollResult.matchType,
      verificationId: submitResult.verificationId,
    });
  } else {
    log(`${prefix} - FAILED: ${pollResult.error}`);
    recordContractResult(exportLog, config.logFile, address, {
      status: 'FAILED',
      localMatchType: config.matchType,
      error: pollResult.error,
      verificationId: submitResult.verificationId,
    });
  }
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const config = parseArgs();
  validateConfig(config);

  const chainName = CHAIN_NAMES[config.chainId] || `Chain ${config.chainId}`;
  log(`Starting export for chain ${config.chainId} (${chainName})`);
  log(`Local API:  ${config.localApiUrl}`);
  log(`Global API: ${config.globalApiUrl}`);
  log(`Match type: ${config.matchType}`);
  log(`Log file:   ${config.logFile}`);
  if (config.dryRun) log(`DRY RUN MODE - no submissions will be made`);

  // Load or create export log
  const exportLog = loadExportLog(config.logFile, config.chainId);

  // Fetch contract list from local Sourcify
  log(`Fetching contract list from local Sourcify...`);
  let addresses;
  try {
    addresses = await fetchContractList(config);
  } catch (err) {
    log(`FATAL: Failed to fetch contract list: ${err.message}`);
    process.exit(1);
  }

  log(`Found ${addresses.length} ${config.matchType} contracts to process`);

  if (addresses.length === 0) {
    log('No contracts found. Exiting.');
    return;
  }

  // Process each contract
  for (let i = 0; i < addresses.length; i++) {
    try {
      await exportContract(config, exportLog, addresses[i], i, addresses.length);
    } catch (err) {
      // Catch any unhandled errors (network failures, unexpected exceptions)
      // to ensure the script continues processing remaining contracts
      const address = addresses[i];
      log(`[${i + 1}/${addresses.length}] ${shortenAddress(address)} - FATAL ERROR: ${err.message}`);
      recordContractResult(exportLog, config.logFile, address, {
        status: 'FAILED',
        error: `Unhandled error: ${err.message}`,
      });
    }

    // Rate limiting delay (skip for last item)
    if (i < addresses.length - 1) {
      await sleep(config.delayMs);
    }
  }

  // Final summary
  log('');
  log('='.repeat(60));
  log('Export complete!');
  log(`  Total:   ${exportLog.stats.total}`);
  log(`  Success: ${exportLog.stats.success}`);
  log(`  Failed:  ${exportLog.stats.failed}`);
  log(`  Skipped: ${exportLog.stats.skipped}`);
  log(`Log saved to: ${config.logFile}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
