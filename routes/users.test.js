"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");
const { ensureLoggedIn, ensureAdmin, ensureCorrectUserOrAdmin } = require("../middleware/auth");
const { BadRequestError, NotFoundError, ForbiddenError } = require("../expressError");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************* POST /users (registration) */

describe("POST /users (registration)", function () {
  test("works for anonymous: user registration open to everyone", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "new@email.com",
      });
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      },
      token: expect.any(String),
    });
  });

  test("bad request with missing fields for anonymous users", async function () {
    const resp = await request(app)
      .post("/users")
      .send({ username: "u-new" });
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data for anonymous users", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password-new",
        email: "not-an-email", // invalid data
      });
    expect(resp.statusCode).toEqual(400);
  });
});

/**************POST /users (only admin allowed creation of users) */

describe("POST /users (admin creation of users)", function () {
  test("works for admin users only to create non-admin user", async function () {
    const resp = await request(app)
      .post("/users/admin")
      .send({
        username: "u-new-admin",
        firstName: "AdminFirst",
        lastName: "AdminLast",
        password: "password-new",
        email: "adminuser@email.com",
        isAdmin: true,
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new-admin",
        firstName: "AdminFirst",
        lastName: "AdminLast",
        email: "adminuser@email.com",
        isAdmin: true,
      }, 
      token: expect.any(String),
    });
  });
  test("unauthorized for non-admin users", async function () {
    const resp = await request(app)
        .post("/users/admin")
        .send({
          username: "u-new-nonadmin",
          firstName: "FirstNonAdmin",
          lastName: "LastNonAdmin",
          password: "password-new",
          email: "nonadminuser@email.com",
          isAdmin: false,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauthorized for anonymous users", async function () {
    const resp = await request(app)
      .post("/users/admin")
      .send({
        username: "u-new-anon",
        firstName: "AnonFirst",
        lastName: "AnonLast",
        password: "password-new",
        email: "anonuser@email.com",
        isAdmin: false,
      });
    expect(resp.statusCode).toEqual(403);
  });

  test("bad request with missing fields for admin users", async function () {
    const resp = await request(app)
        .post("/users")
        .send({ username: "missingfields" })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data for admin users", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "invaliddata",
        firstName: "AdminFirst",
        lastName: "AdminLast",
        password: "password-new",
        email: "invalid-email", // Invalid data
        isAdmin: true,
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users */

describe("GET /users", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      users: expect.arrayContaining([
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "u1@email.com",
          isAdmin: false,
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "u2@email.com",
          isAdmin: false,
        },
        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "u3@email.com",
          isAdmin: false,
        },
        {
          username: "admin1",
          firstName: "Admin1",
          lastName: "User",
          email: "admin@user.com",
          isAdmin: true
        }
      ]),
    });
  });
  test("unauthorized for non-admin users", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
  test("unauthorized for anonymous users", async function () {
    const resp = await request(app)
        .get("/users");
    expect(resp.statusCode).toEqual(403);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE users CASCADE");
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
        .get(`/users/u1`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "u1@email.com",
        isAdmin: false,
        jobs: [], // Expected jobs field
      },
    });
  });

  test("works for same user", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "u1@email.com",
        isAdmin: false,
        jobs: [], // Expected jobs field
      },
    });
  });

  test("unauthorized for non-admin, different user", async function () {
    const resp = await request(app)
        .get(`/users/u2`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
  test("unauthorized for anonymous users", async function () {
    const resp = await request(app).get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found for admin users", async function () {
    const resp = await request(app)
        .get(`/users/nope`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
  test("not found if user not found for non-admin users", async function () {
    const resp = await request(app)
        .get(`/users/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
  test("not found if user not found for anonymous users", async function () {
    const resp = await request(app)
        .get(`/users/nope`)
    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {
  test("works for admin users", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({ firstName: "New" })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body.user.firstName).toEqual("New");
  });

  test("works for same user", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: "NewFirst" })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body.user.firstName).toEqual("NewFirst");
  });

  test("unauthorized for non-admin, different user", async function () {
    const resp = await request(app)
      .patch(`/users/u2`)
      .send({ firstName: "Nope" })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
  test("unauthorized for anonymous user", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({ firstName: "Nope" });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found for admin", async function () {
    const resp = await request(app)
        .patch(`/users/nope`)
        .send({ firstName: "Nope" })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("not found if different user is not found by non-admin user", async function () {
    const resp = await request(app)
        .patch(`/users/nope`)
        .send({ firstName: "Nope" })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("not found if different user is not found by anonymous user", async function () {
    const resp = await request(app)
        .patch(`/users/nope`)
        .send({ firstName: "Nope" })
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if invalid data sent by admin user", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({ firstName: 42 }) // Invalid data
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
  test("bad request if invalid data sent by non-admin user", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({ firstName: 42 }) // Invalid data
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data sent by anonymous user", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({ firstName: 42 }) // Invalid data
    expect(resp.statusCode).toEqual(401);
  });

  test("works: set new password by admin user", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          password: "new-password",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "u1@email.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });
  test("works: set new password as same non-admin user", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          password: "new-password",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "u1@email.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });

  test("fails: set new password by different, non-admin user", async function () {
    const resp = await request(app)
        .patch(`/users/u2`)
        .send({
          password: "new-password",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauthorized for anonymous users", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ password: "new-password" });
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if invalid data sent by admin user", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ password: 42 }) // Invalid type
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data sent by non-admin user", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ password: 42 }) // Invalid type
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
        .delete(`/users/u1`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: "u1" });
  });
  test("works for same non-admin users", async function () {
    const resp = await request(app)
        .delete(`/users/u1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("unauthorized for non-admin, different users", async function () {
    const resp = await request(app)
      .delete(`/users/u2`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
  test("unauthorized for anonymous users", async function () {
    const resp = await request(app).delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user is not found by admin users", async function () {
    const resp = await request(app)
        .delete(`/users/nope`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("unauthorized for non-admin users trying to delete non-existent user", async function () {
    const resp = await request(app)
        .delete(`/users/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauthorized for anonymous users trying to delete non-existent user", async function () {
    const resp = await request(app)
        .delete(`/users/nope`)
    expect(resp.statusCode).toEqual(401);
  });
});
