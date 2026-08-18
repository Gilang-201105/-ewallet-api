/**
 * Consistent response envelope, matching the { status, result } / { message } contracts
 * shown in the API spec.
 */
function success(res, result, statusCode = 200) {
  return res.status(statusCode).json({
    status: 'SUCCESS',
    result
  });
}

function failed(res, message, statusCode = 400) {
  return res.status(statusCode).json({
    message
  });
}

module.exports = { success, failed };
