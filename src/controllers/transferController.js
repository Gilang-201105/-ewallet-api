const { v4: uuidv4 } = require('uuid');
const { sequelize, User, Transaction, TransferJob } = require('../models');
const { success, failed } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * POST /transfer
 *
 * Design note (see README "Background transfer" section for the full explanation):
 * - The sender's side of the transfer (balance check + debit + ledger row) happens
 *   synchronously inside this request, inside a DB transaction with a row lock,
 *   so the sender always gets an accurate, race-free balance_before/balance_after.
 * - Crediting the *receiver's* balance is the part that is executed in the
 *   background: a TransferJob row is enqueued in the same DB transaction as the
 *   debit, and a separate worker process (src/queue/worker.js) polls for QUEUED
 *   jobs and applies the credit. This decouples the receiver-side write (which in
 *   a real system might hit another shard/service, retry on failure, etc.) from
 *   the request/response cycle, while still returning a SUCCESS result to the
 *   sender immediately as the spec's example response expects.
 */
const transfer = asyncHandler(async (req, res) => {
  const { target_user: targetUserId, amount, remarks } = req.body;

  if (!Number.isInteger(amount) || amount <= 0) {
    return failed(res, 'Amount must be a positive integer', 400);
  }

  if (targetUserId === req.user.user_id) {
    return failed(res, 'Cannot transfer to yourself', 400);
  }

  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser) {
    return failed(res, 'Target user not found', 404);
  }

  try {
    const { debitRecord, job } = await sequelize.transaction(async (t) => {
      const sender = await User.findByPk(req.user.user_id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (sender.balance < amount) {
        const err = new Error('Balance is not enough');
        err.statusCode = 400;
        throw err;
      }

      const balance_before = sender.balance;
      const balance_after = balance_before - amount;
      const transfer_group_id = uuidv4();

      sender.balance = balance_after;
      await sender.save({ transaction: t });

      const debitRecord = await Transaction.create(
        {
          category: 'TRANSFER',
          user_id: sender.user_id,
          counterparty_user_id: targetUser.user_id,
          transfer_group_id,
          transaction_type: 'DEBIT',
          status: 'SUCCESS',
          amount,
          remarks: remarks || '',
          balance_before,
          balance_after
        },
        { transaction: t }
      );

      const job = await TransferJob.create(
        {
          transfer_group_id,
          sender_user_id: sender.user_id,
          target_user_id: targetUser.user_id,
          amount,
          remarks: remarks || '',
          status: 'QUEUED'
        },
        { transaction: t }
      );

      return { debitRecord, job };
    });

    logger.info('Transfer queued for background processing', {
      transfer_group_id: debitRecord.transfer_group_id,
      job_id: job.id
    });

    return success(res, {
      transfer_id: debitRecord.id,
      amount: debitRecord.amount,
      remarks: debitRecord.remarks,
      balance_before: debitRecord.balance_before,
      balance_after: debitRecord.balance_after,
      created_date: debitRecord.created_date
    });
  } catch (err) {
    if (err.message === 'Balance is not enough') {
      return failed(res, 'Balance is not enough', 400);
    }
    throw err;
  }
});

module.exports = { transfer };
