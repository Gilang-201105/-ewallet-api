'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      user_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      pin_hash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      balance: {
        // stored in the smallest currency unit (Rupiah, no decimals) as INTEGER
        // to avoid floating point rounding issues.
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'users',
      underscored: true,
      createdAt: 'created_date',
      updatedAt: 'updated_date'
    }
  );

  User.associate = (models) => {
    User.hasMany(models.Transaction, { foreignKey: 'user_id', as: 'transactions' });
    User.hasMany(models.TransferJob, { foreignKey: 'sender_user_id', as: 'sentTransferJobs' });
  };

  // Never leak the pin hash in API responses.
  User.prototype.toSafeJSON = function () {
    const { pin_hash, ...safe } = this.toJSON();
    return safe;
  };

  return User;
};
