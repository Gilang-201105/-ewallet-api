// Sequelize-CLI configuration (used by migrations/seeders) AND by src/models/index.js
require('dotenv').config();

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    // Swap these env vars to point at Postgres/MySQL in production.
    // Example for Postgres:
    // dialect: 'postgres',
    // host: process.env.DB_HOST,
    // port: process.env.DB_PORT,
    // username: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,
    // database: process.env.DB_NAME,
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false
  }
};
