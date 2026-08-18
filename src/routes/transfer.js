const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { transfer } = require('../controllers/transferController');

const router = express.Router();

router.post(
  '/transfer',
  authenticate,
  [
    body('target_user').isUUID().withMessage('target_user must be a valid user_id'),
    body('amount').isInt({ gt: 0 }).withMessage('amount must be a positive integer'),
    body('remarks').optional({ nullable: true }).isString()
  ],
  validate,
  transfer
);

module.exports = router;
