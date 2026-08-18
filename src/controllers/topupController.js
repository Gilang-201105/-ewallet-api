const { sequelize, User, Transaction } = require('../models');
const { success, failed } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /topup
 * Adds `amount` to the authenticated user's balance. Runs inside a DB
 * transaction with a row lock on the user record to keep concurrent
 * top ups/payments/transfers from racing on the same balance.
 */
const topUp = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!Number.isInteger(amount) || amount <= 0) {
    return failed(res, 'Amount must be a positive integer', 400);
  }

  const result = await sequelize.transaction(async (t) => {
    const user = await User.findByPk(req.user.user_id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    const balance_before = user.balance;
    const balance_after = balance_before + amount;

    user.balance = balance_after;
    await user.save({ transaction: t });

    const topUpRecord = await Transaction.create(
      {
        category: 'TOP_UP',
        user_id: user.user_id,
        transaction_type: 'CREDIT',
        status: 'SUCCESS',
        amount,
        remarks: '',
        balance_before,
        balance_after
      },
      { transaction: t }
    );

    return topUpRecord;
  });

  return success(res, {
    top_up_id: result.id,
    amount_top_up: result.amount,
    balance_before: result.balance_before,
    balance_after: result.balance_after,
    created_date: result.created_date
  });
});

module.exports = { topUp };
