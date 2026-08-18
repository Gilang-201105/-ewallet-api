const express = require('express');
const authenticate = require('../middlewares/auth');
const { listTransactions } = require('../controllers/transactionController');

const router = express.Router();

router.get('/transactions', authenticate, listTransactions);

module.exports = router;
