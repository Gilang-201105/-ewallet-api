const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { topUp } = require('../controllers/topupController');

const router = express.Router();

router.post(
  '/topup',
  authenticate,
  [body('amount').isInt({ gt: 0 }).withMessage('amount must be a positive integer')],
  validate,
  topUp
);

module.exports = router;
