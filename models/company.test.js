"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  specificCompaniesSeedData,
} = require("./_testCommon");
const { JsonWebTokenError } = require("jsonwebtoken");

beforeAll(async () => {
  await commonBeforeAll();
});
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// /** Optional - Use specific seed data with longer company `name` and more variable `numEmployees` for more robust findAll testing without affecting the other tests */
// const specificCompaniesSeedData = [
//   {
//     handle: "c1",
//     name: "Company One",
//     description: "Description One",
//     numEmployees: 50,
//     logoUrl: "http://c1.img",
//   },
//   {
//     handle: "c2",
//     name: "Company Two",
//     description: "Description Two",
//     numEmployees: 200,
//     logoUrl: "http://c2.img",
//   },
//   {
//     handle: "c3",
//     name: "Net Solutions",
//     description: "Description Three",
//     numEmployees: 30,
//     logoUrl: "http://c3.img",
//   },
// ];

// // // Set a flag to determine which seed data to use for specific describe blocks
// // let customSeedData = null;

// // Centralize hooks for all test suites
// beforeAll(async () => {
//   jest.setTimeout(30000);
//   await commonBeforeAll(); // Seed DB with default or custom data
// });
// beforeEach(commonBeforeEach);
// afterEach(commonAfterEach);
// afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with duplicate data", async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  // beforeAll(async () => {
  //   await commonBeforeAll(specificCompaniesSeedData); // Reset DB with specific data for findAll tests
  // });

  // afterAll(async () => {
  //   await commonAfterAll(); // Restore DB after tests
  // });
  beforeAll(async () => {
    await db.query("DELETE FROM companies");
    await Company.create(specificCompaniesSeedData[0]);
    await Company.create(specificCompaniesSeedData[1]);
    await Company.create(specificCompaniesSeedData[2]);
  });
  test("works: no filter", async function () {
    let companies = await Company.findAll();
    expect(companies).toEqual(specificCompaniesSeedData);
  }); 

  test("works: filter by name", async function () {
    let companies = await Company.findAll({ name: "Net" });
    expect(companies).toEqual([specificCompaniesSeedData[2]]);
  });

  test("works: filter by minEmployees", async function () {
    let companies = await Company.findAll({ minEmployees: 50 });
    expect(companies).toEqual([
      specificCompaniesSeedData[0],
      specificCompaniesSeedData[1],
    ]);
  });

  test("works: filter by maxEmployees", async function () {
    let companies = await Company.findAll({ maxEmployees: 50 });
    expect(companies).toEqual([
      specificCompaniesSeedData[0],
      specificCompaniesSeedData[2],
    ]);
  });

  test("works: filter by minEmployees and maxEmployees", async function () {
    let companies = await Company.findAll({ minEmployees: 30, maxEmployees: 100 });
    expect(companies).toEqual([
      specificCompaniesSeedData[0],
      specificCompaniesSeedData[2],
    ]);
  });

  test("throws error if minEmployees > maxEmployees", async function () {
    try {
      await Company.findAll({ minEmployees: 100, maxEmployees: 50 });
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
      expect(err.message).toEqual("minEmployees cannot be greater than maxEmployees");
    }
  });

  afterAll(async () => {
    // Reset the database to the default state for other tests
    await commonBeforeAll();
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let company = await Company.get("c1");
    expect(company).toEqual({
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
    });
  });

  test("not found if no such company", async function () {
    try {
      await Company.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    let company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Company.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Company.remove("c1");
    const res = await db.query(
        "SELECT handle FROM companies WHERE handle='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Company.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
