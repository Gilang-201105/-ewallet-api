'use strict';

module.exports = (sequelize, DataTypes) => {
  const TransferJob = sequelize.define(
    'TransferJob',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      transfer_group_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      sender_user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      target_user_id: {
        type: DataTypes.UUID,
        allowNull: false
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
      status: {
        // QUEUED -> PROCESSING -> DONE | FAILED
        type: DataTypes.ENUM('QUEUED', 'PROCESSING', 'DONE', 'FAILED'),
        allowNull: false,
        defaultValue: 'QUEUED'
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      error_message: {
        type: DataTypes.STRING,
        allowNull: true
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'transfer_jobs',
      underscored: true,
      createdAt: 'created_date',
      updatedAt: 'updated_date'
    }
  );

  return TransferJob;
};
