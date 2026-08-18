const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { updateProfile } = require('../controllers/profileController');

const router = express.Router();

router.put(
  '/profile',
  authenticate,
  [
    body('first_name').optional().isString().trim().notEmpty(),
    body('last_name').optional().isString().trim().notEmpty(),
    body('address').optional().isString()
  ],
  validate,
  updateProfile
);

module.exports = router;
