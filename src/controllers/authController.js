const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { success, failed } = require('../utils/response');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');

const PIN_SALT_ROUNDS = 10;

/**
 * POST /register
 */
const register = asyncHandler(async (req, res) => {
  const { first_name, last_name, phone_number, address, pin } = req.body;

  const existing = await User.findOne({ where: { phone_number } });
  if (existing) {
    return failed(res, 'Phone Number already registered', 400);
  }

  const pin_hash = await bcrypt.hash(pin, PIN_SALT_ROUNDS);

  const user = await User.create({
    first_name,
    last_name,
    phone_number,
    address,
    pin_hash,
    balance: 0
  });

  return success(
    res,
    {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      address: user.address,
      created_date: user.created_date
    },
    201
  );
});

/**
 * POST /login
 */
const login = asyncHandler(async (req, res) => {
  const { phone_number, pin } = req.body;

  const user = await User.findOne({ where: { phone_number } });
  if (!user) {
    return failed(res, "Phone number and pin doesn't match.", 401);
  }

  const pinMatches = await bcrypt.compare(pin, user.pin_hash);
  if (!pinMatches) {
    return failed(res, "Phone number and pin doesn't match.", 401);
  }

  const access_token = signAccessToken({ user_id: user.user_id });
  const refresh_token = signRefreshToken({ user_id: user.user_id });

  return success(res, { access_token, refresh_token });
});

module.exports = { register, login };
