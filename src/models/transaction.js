'use strict';

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define(
    'Transaction',
    {
      id: {
        // Generic PK. The value is also exposed as top_up_id / payment_id / transfer_id
        // in API responses depending on `category`, per the required response contracts.
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      category: {
        // TOP_UP | PAYMENT | TRANSFER
        type: DataTypes.ENUM('TOP_UP', 'PAYMENT', 'TRANSFER'),
        allowNull: false
      },
      user_id: {
        // owner of this ledger row (whose balance this row affects)
        type: DataTypes.UUID,
        allowNull: false
      },
      counterparty_user_id: {
        // for TRANSFER rows: the other party's user_id
        type: DataTypes.UUID,
        allowNull: true
      },
      transfer_group_id: {
        // links the DEBIT row (sender) and CREDIT row (receiver) of the same transfer
        type: DataTypes.UUID,
        allowNull: true
      },
      transaction_type: {
        // DEBIT | CREDIT
        type: DataTypes.ENUM('DEBIT', 'CREDIT'),
        allowNull: false
      },
      status: {
        // PENDING | SUCCESS | FAILED  (TRANSFER rows start PENDING until the background worker commits them)
        type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED'),
        allowNull: false,
        defaultValue: 'SUCCESS'
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      remarks: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ''
      },
      balance_before: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      balance_after: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'transactions',
      underscored: true,
      createdAt: 'created_date',
      updatedAt: false
    }
  );

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Transaction;
};
