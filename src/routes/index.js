const express = require('express');

const router = express.Router();

router.use(require('./auth'));
router.use(require('./topup'));
router.use(require('./payment'));
router.use(require('./transfer'));
router.use(require('./transactions'));
router.use(require('./profile'));
router.use(require('./dashboard'));

router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
