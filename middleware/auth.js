"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError, ForbiddenError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when user must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError("Unauthorized");
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to ensure user is an admin.
 * 
 * If not an admin, raises Unauthorized.
 */

function ensureAdmin(req, res, next) {
  try {
    if (!res.locals.user || !res.locals.user.isAdmin) {
      throw new ForbiddenError();
    }
    // if (!res.locals.user) throw new UnauthorizedError("User is not logged in.");
    // if (!res.locals.user.isAdmin) throw new ForbiddenError("Admin privileges required");
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to ensure the user is either:
 * - the correct user (matches the username in the URL param), or
 * - an admin.
 * 
 * If neither, raises Unauthorized.
 */

function ensureCorrectUserOrAdmin(req, res, next) {
  try {
    const user = res.locals.user;
    if (!user) throw new UnauthorizedError("User is not logged in"); // Throws 401 for missing token
    if (!(user.isAdmin || user.username === req.params.username)) {
      throw new ForbiddenError("Unauthorized access denied."); // Throw 403
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureCorrectUserOrAdmin,
};
