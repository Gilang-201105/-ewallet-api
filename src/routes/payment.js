const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { pay } = require('../controllers/paymentController');

const router = express.Router();

router.post(
  '/pay',
  authenticate,
  [
    body('amount').isInt({ gt: 0 }).withMessage('amount must be a positive integer'),
    body('remarks').optional({ nullable: true }).isString()
  ],
  validate,
  pay
);

module.exports = router;
