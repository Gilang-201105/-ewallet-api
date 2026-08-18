'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transfer_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      transfer_group_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      sender_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      target_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      remarks: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: ''
      },
      status: {
        type: Sequelize.ENUM('QUEUED', 'PROCESSING', 'DONE', 'FAILED'),
        allowNull: false,
        defaultValue: 'QUEUED'
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      error_message: {
        type: Sequelize.STRING,
        allowNull: true
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('transfer_jobs', ['status'], {
      name: 'transfer_jobs_status_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transfer_jobs');
  }
};
