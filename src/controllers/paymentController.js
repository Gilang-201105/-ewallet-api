const { sequelize, User, Transaction } = require('../models');
const { success, failed } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /pay
 * Debits `amount` from the authenticated user's balance for a purchase.
 */
const pay = asyncHandler(async (req, res) => {
  const { amount, remarks } = req.body;

  if (!Number.isInteger(amount) || amount <= 0) {
    return failed(res, 'Amount must be a positive integer', 400);
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const user = await User.findByPk(req.user.user_id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (user.balance < amount) {
        const err = new Error('Balance is not enough');
        err.statusCode = 400;
        throw err;
      }

      const balance_before = user.balance;
      const balance_after = balance_before - amount;

      user.balance = balance_after;
      await user.save({ transaction: t });

      const paymentRecord = await Transaction.create(
        {
          category: 'PAYMENT',
          user_id: user.user_id,
          transaction_type: 'DEBIT',
          status: 'SUCCESS',
          amount,
          remarks: remarks || '',
          balance_before,
          balance_after
        },
        { transaction: t }
      );

      return paymentRecord;
    });

    return success(res, {
      payment_id: result.id,
      amount: result.amount,
      remarks: result.remarks,
      balance_before: result.balance_before,
      balance_after: result.balance_after,
      created_date: result.created_date
    });
  } catch (err) {
    if (err.message === 'Balance is not enough') {
      return failed(res, 'Balance is not enough', 400);
    }
    throw err;
  }
});

module.exports = { pay };
