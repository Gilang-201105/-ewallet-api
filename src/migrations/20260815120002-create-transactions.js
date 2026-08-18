'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      category: {
        type: Sequelize.ENUM('TOP_UP', 'PAYMENT', 'TRANSFER'),
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      counterparty_user_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      transfer_group_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      transaction_type: {
        type: Sequelize.ENUM('DEBIT', 'CREDIT'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'SUCCESS', 'FAILED'),
        allowNull: false,
        defaultValue: 'SUCCESS'
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
      balance_before: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      balance_after: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      created_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('transactions', ['user_id'], {
      name: 'transactions_user_id_idx'
    });
    await queryInterface.addIndex('transactions', ['transfer_group_id'], {
      name: 'transactions_transfer_group_id_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transactions');
  }
};
