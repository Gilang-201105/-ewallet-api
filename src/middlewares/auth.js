const { verifyAccessToken } = require('../utils/jwt');
const { failed } = require('../utils/response');
const { User } = require('../models');

/**
 * Verifies "Authorization: Bearer {jwt_token}" and attaches the authenticated
 * user to req.user. Responds with { message: "Unauthenticated" } on any failure,
 * matching the spec's FAILED contract for protected endpoints.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return failed(res, 'Unauthenticated', 401);
    }

    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.user_id);

    if (!user) {
      return failed(res, 'Unauthenticated', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return failed(res, 'Unauthenticated', 401);
  }
}

module.exports = authenticate;
