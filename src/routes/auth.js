const express = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { register, login } = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('first_name').isString().trim().notEmpty().withMessage('first_name is required'),
    body('last_name').isString().trim().notEmpty().withMessage('last_name is required'),
    body('phone_number')
      .isString()
      .trim()
      .matches(/^[0-9+]{8,15}$/)
      .withMessage('phone_number must be a valid phone number'),
    body('address').optional({ nullable: true }).isString(),
    body('pin')
      .isString()
      .isLength({ min: 6, max: 6 })
      .withMessage('pin must be exactly 6 digits')
      .isNumeric()
      .withMessage('pin must contain only digits')
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('phone_number').isString().trim().notEmpty().withMessage('phone_number is required'),
    body('pin').isString().notEmpty().withMessage('pin is required')
  ],
  validate,
  login
);

module.exports = router;
