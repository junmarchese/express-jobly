"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");
const express = require("express");

const { ensureLoggedIn, ensureAdmin, ensureCorrectUserOrAdmin } = require("../middleware/auth");

const { BadRequestError, NotFoundError, ForbiddenError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");

const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");
const { create } = require("../models/company");

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is the registration endpoint, which is open to everyone.
 * 
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 * 
 * No Authorization required.
 **/

router.post("/", async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register({
      ...req.body,
      isAdmin: false, // ensure new users are not admins by default
    });
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});

/** POST /admin { user } => { user, token }
 * 
 * This is not the registration endpoint - only for admin users to add new users (who can be added as admin)
 * 
 * Authorization required: admin
 **/

router.post("/admin", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }
    const user = await User.register({
      ...req.body,
      isAdmin: req.body.isAdmin || false, 
    });
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});

/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: Admin only
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin }
 *
 * Authorization required: login - Admin or the user themselves
 **/

router.get("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    if (res.locals.user.username !== req.params.username && !res.locals.user.isAdmin) {
      throw new ForbiddenError("Unauthorized to view this user.");
    }

    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login - Admin or the user themselves
 **/

router.patch("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    if (res.locals.user.username !== req.params.username && !res.locals.user.isAdmin) {
      throw new ForbiddenError("Unauthorized to update this user.");
    }

    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: login - Admin or user themselves
 **/

router.delete("/:username", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});

/** POST /users/[username]/jobs/[id] => { applied: jobId }
 * 
 * Allows a user to apply for a job (or an admin can do it for user)
 * 
 * Authorization required: same user as :username or admin
 */
router.post("/:username/jobs/:id", ensureCorrectUserOrAdmin, async function (req, res, next) {
  try {
    const { username, id } = req.params;

    if (res.locals.user.username !== username && !res.locals.user.isAdmin) {
      throw new ForbiddenError("Unauthorized to apply for this job.");
    }

    const result = await User.applyForJob(username, +id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
