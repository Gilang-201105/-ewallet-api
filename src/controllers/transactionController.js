const { Transaction } = require('../models');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /transactions
 * Lists every transaction the authenticated user has been the owner of
 * (top ups, payments, and the DEBIT side of transfers they sent, plus the
 * CREDIT side of transfers they received once the background worker commits it).
 */
const listTransactions = asyncHandler(async (req, res) => {
  const rows = await Transaction.findAll({
    where: { user_id: req.user.user_id },
    order: [['created_date', 'DESC']]
  });

  const result = rows.map((row) => {
    const base = {
      status: row.status,
      user_id: row.user_id,
      transaction_type: row.transaction_type,
      amount: row.amount,
      remarks: row.remarks,
      balance_before: row.balance_before,
      balance_after: row.balance_after,
      created_date: row.created_date
    };

    if (row.category === 'TOP_UP') {
      return { top_up_id: row.id, ...base };
    }
    if (row.category === 'PAYMENT') {
      return { payment_id: row.id, ...base };
    }
    return { transfer_id: row.id, ...base };
  });

  return success(res, result);
});

module.exports = { listTransactions };
