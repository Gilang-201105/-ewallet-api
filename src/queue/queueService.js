const { sequelize, User, Transaction, TransferJob } = require('../models');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 5;

/**
 * Claims the next QUEUED job (FIFO) and marks it PROCESSING, using a row
 * lock so multiple worker instances can run concurrently without double-
 * processing the same job.
 */
async function claimNextJob() {
  return sequelize.transaction(async (t) => {
    const job = await TransferJob.findOne({
      where: { status: 'QUEUED' },
      order: [['created_date', 'ASC']],
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!job) return null;

    job.status = 'PROCESSING';
    job.attempts += 1;
    await job.save({ transaction: t });

    return job;
  });
}

/**
 * Applies the receiver-side credit for a claimed transfer job: increments the
 * target user's balance and writes their CREDIT ledger row, then marks the
 * job DONE. Everything happens in one DB transaction so a crash mid-way
 * never leaves the receiver credited without a matching ledger row (or
 * vice versa).
 */
async function processJob(job) {
  try {
    await sequelize.transaction(async (t) => {
      const target = await User.findByPk(job.target_user_id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!target) {
        throw new Error(`Target user ${job.target_user_id} no longer exists`);
      }

      const balance_before = target.balance;
      const balance_after = balance_before + job.amount;

      target.balance = balance_after;
      await target.save({ transaction: t });

      await Transaction.create(
        {
          category: 'TRANSFER',
          user_id: target.user_id,
          counterparty_user_id: job.sender_user_id,
          transfer_group_id: job.transfer_group_id,
          transaction_type: 'CREDIT',
          status: 'SUCCESS',
          amount: job.amount,
          remarks: job.remarks || '',
          balance_before,
          balance_after
        },
        { transaction: t }
      );

      job.status = 'DONE';
      job.processed_at = new Date();
      job.error_message = null;
      await job.save({ transaction: t });
    });

    logger.info('Transfer job completed', { job_id: job.id, transfer_group_id: job.transfer_group_id });
  } catch (err) {
    logger.error('Transfer job failed', { job_id: job.id, error: err.message, attempts: job.attempts });

    job.status = job.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'QUEUED';
    job.error_message = err.message;
    await job.save();
  }
}

/**
 * Claims and processes a single job, if one is available. Returns the job
 * that was processed, or null if the queue was empty. Exposed separately
 * from the polling loop so it can be driven directly in tests.
 */
async function processNext() {
  const job = await claimNextJob();
  if (!job) return null;
  await processJob(job);
  return job;
}

module.exports = { claimNextJob, processJob, processNext };
