"use strict";

const request = require("supertest");
const app = require("../app");
const db = require("../db");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../expressError");
const Company = require("../models/company");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
} = require("./_testCommon");

// Centralize seeding and cleanup
beforeAll(commonBeforeAll); // Default data for most tests
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "DescNew",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works for admins", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("unauthorized for non-admin users", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauthorized for anonymous users with no token", async function () {
    const resp = await request(app).post("/companies").send(newCompany);
    expect(resp.statusCode).toEqual(401);
  })

  test("fails bad request with missing data for admins", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({ handle: "new"})
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
  test("fails bad request with missing data for non-admin users", async function () {
    const resp = await request(app)
        .post("/companies")
        .send({
          handle: "new",
          numEmployees: 10,
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test ("fails bad request with invalid data for admins", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({ ...newCompany, logoUrl: "not-a-url" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  })

  test("fails bad request with invalid data for non-admin users", async function () {
    const resp = await request(app)
        .post("/companies")
        .send({
          ...newCompany,
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("works: no filters", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
        {
          handle: "c4",
          name: "C4",
          description: "Desc4",
          numEmployees: 4,
          logoUrl: "http://c4.img",
        },
      ],
    });
  });

  test("works: filter by name", async function () {
    const resp = await request(app).get("/companies").query({ name: "C1" });
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
      ],
    });
  });

  test("works: filter by minEmployees", async function () {
    const resp = await request(app).get("/companies").query({ minEmployees: 2 });
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
        {
          handle: "c3",
          name: "C3",
          description: "Desc3",
          numEmployees: 3,
          logoUrl: "http://c3.img",
        },
        {
          handle: "c4",
          name: "C4",
          description: "Desc4",
          numEmployees: 4,
          logoUrl: "http://c4.img",
        },
      ],
    });
  });

  test("works: filter by maxEmployees", async function () {
    const resp = await request(app).get("/companies").query({ maxEmployees: 2 });
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
      ],
    });
  });

  test("works: filter by minEmployees and maxEmployees", async function () {
    const resp = await request(app).get("/companies").query({ minEmployees:1, maxEmployees: 2 });
    expect(resp.body).toEqual({
      companies: [
        {
          handle: "c1",
          name: "C1",
          description: "Desc1",
          numEmployees: 1,
          logoUrl: "http://c1.img",
        },
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          numEmployees: 2,
          logoUrl: "http://c2.img",
        },
      ],
    });
  });

  test("responds with 400 error if minEmployees > maxEmployees", async function () {
    const resp = await request(app).get("/companies").query({ minEmployees: 10, maxEmployees: 5 });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual("minEmployees cannot be greater than maxEmployees");
  });

  test("responds with 400 error if invalid query parameter is provided", async function () {
    const resp = await request(app).get("/companies").query({ invalidParam: "invalid" });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message[0]).toMatch(/additionalProperty "invalidParam" exists/);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
        .get("/companies")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});


/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon, displays company with associated jobs", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [
          {
            id: expect.any(Number),
            title: "Retail Pharmacist",
            salary: 100000,
            equity: "0.01",
          },
        ],
      },
    });
  });
  test("works for anon: company with no jobs", async function () {
    const resp = await request(app).get(`/companies/c4`);
    expect(resp.body).toEqual({
      company: {
        handle: "c4",
        name: "C4",
        description: "Desc4",
        numEmployees: 4,
        logoUrl: "http://c4.img",
        jobs: [],
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body.error).toEqual({
      message: "No company: nope",
      status: 404,
    });
  });

  test("bad request for invalid handle format", async function () {
    const resp = await request(app).get("/companies/!@#");
    expect(resp.statusCode).toEqual(404); 
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {

  test("works for admins users", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({ name: "C1-new" })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.company.name).toEqual("C1-new");
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });
  test("unauthorized for non-admin users", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({ name: "C1-new" })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
  test("unauthorized for anonymous users or no token provided", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({ name: "C1-new" });
    expect(resp.statusCode).toEqual(401);
  });

  test("fails 404 error not found for non-existent company for admins", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({ name: "new nope" })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("fails 403 error for non-existent company for non-admin users", async function () {
    const resp = await request(app)
        .patch(`/companies/nope`)
        .send({ name: "new nope" })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
  test("fails 403 bad request on handle change attempt for non-admins", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          handle: "c1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("fails 403 bad request on invalid data for non-admins", async function () {
    const resp = await request(app)
        .patch(`/companies/c1`)
        .send({
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for admins users", async function () {
    const resp = await request(app)
        .delete(`/companies/c1`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: "c1" });

    const res = await db.query("SELECT * FROM companies WHERE handle = 'c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("unauthorized for non-admin users", async function () {
    // Test for non-admin users
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });

  test("unauthorized for anonymous users", async function () {
    const resp = await request(app).delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("fails 404 for non-existent company for admins", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
  test("fails 403 for non-existent company for non-admins users", async function () {
    const resp = await request(app)
        .delete(`/companies/nope`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(403);
  });
});
