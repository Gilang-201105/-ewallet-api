const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * PUT /profile
 * Updates the non-unique-key fields of the authenticated user's profile
 * (first_name, last_name, address). phone_number is intentionally not
 * editable here since it is the unique key used for login.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, address } = req.body;
  const user = req.user;

  if (first_name !== undefined) user.first_name = first_name;
  if (last_name !== undefined) user.last_name = last_name;
  if (address !== undefined) user.address = address;

  await user.save();

  return success(res, {
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    address: user.address,
    updated_date: user.updated_date
  });
});

module.exports = { updateProfile };
