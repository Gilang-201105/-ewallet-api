require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    app.listen(PORT, () => {
      logger.info(`E-Wallet API listening on port ${PORT}`);
      logger.info(
        'Reminder: the background transfer worker runs separately -> npm run worker'
      );
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

start();
