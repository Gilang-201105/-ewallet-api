const express = require('express');
const path = require('path');
const { TransferJob, sequelize } = require('../models');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

/**
 * GET /dashboard/jobs
 * JSON status feed used by the HTML dashboard (public/dashboard.html) to
 * poll and display the state of the background transfer queue.
 */
router.get(
  '/dashboard/jobs',
  asyncHandler(async (req, res) => {
    const [counts, recentJobs] = await Promise.all([
      TransferJob.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status']
      }),
      TransferJob.findAll({
        order: [['created_date', 'DESC']],
        limit: 50
      })
    ]);

    const summary = { QUEUED: 0, PROCESSING: 0, DONE: 0, FAILED: 0 };
    counts.forEach((row) => {
      summary[row.status] = parseInt(row.get('count'), 10);
    });

    return success(res, { summary, recent_jobs: recentJobs });
  })
);

// Serves the static bonus dashboard page.
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'dashboard.html'));
});

module.exports = router;
