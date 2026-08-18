/**
 * Standalone background worker script.
 *
 * Run separately from the API process:
 *   npm run worker
 *
 * It polls the transfer_jobs table for QUEUED rows and applies the
 * receiver-side credit for each one (see queueService.js for the
 * transactional logic). This satisfies the "transferring money should be
 * executed in background server" requirement: the HTTP request only
 * handles the sender-side debit + enqueue, this process does the rest.
 *
 * For higher throughput / true multi-worker deployments, this same
 * processNext() logic can be dropped into a Bull/BullMQ (Redis-backed)
 * consumer instead of the polling loop below -- the job-claiming logic
 * already uses row-level locking so it's safe to run several instances
 * of this script in parallel as-is.
 */
require('dotenv').config();
const { sequelize } = require('../models');
const { processNext } = require('./queueService');
const logger = require('./../utils/logger');

const POLL_INTERVAL_MS = parseInt(process.env.TRANSFER_WORKER_POLL_INTERVAL_MS || '2000', 10);
let stopping = false;

async function loop() {
  await sequelize.authenticate();
  logger.info('Transfer worker started', { pollIntervalMs: POLL_INTERVAL_MS });

  while (!stopping) {
    try {
      const job = await processNext();
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (err) {
      logger.error('Worker loop error', { error: err.message });
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on('SIGINT', () => {
  logger.info('Transfer worker shutting down');
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});

loop();
