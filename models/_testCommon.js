"use strict";

const db = require("../db.js");
// const User = require("../models/user");
// const Company = require("../models/company");
// const Job = require("../models/job");
// const { createToken } = require("../helpers/tokens");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

const testJobIds = [];

// Default seed data
const defaultCompaniesSeedData = [
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
  }
];

const specificCompaniesSeedData = [
  {
    handle: "c1",
    name: "Company One",
    description: "Description One",
    numEmployees: 50,
    logoUrl: "http://c1.img",
  },
  {
    handle: "c2",
    name: "Company Two",
    description: "Description Two",
    numEmployees: 200,
    logoUrl: "http://c2.img",
  },
  {
    handle: "c3",
    name: "Net Solutions",
    description: "Description Three",
    numEmployees: 30,
    logoUrl: "http://c3.img",
  },
];

/**
 * Function to seed the companies table with custom or default data.
 * 
 * @param {Array} Data - Array of company objects to seed.
 *                     - Default data is used if no parameter is    provided.
 * 
 * Use Cases:
 * - Pass in specific data to test filtering logic in `Company.findAll` tests
 * - Default data is used for other test suites (e.g., get, create, update).
 * 
 * Example:
 * const specificCompaniesSeedData = [
 *  { handle: "c1", name: "Company One", numEmployees: 50, ... }
 * ];
 * beforeAll(() => commonBeforeAll(specificCompaniesSeedData));
 */

async function seedCompanies(seedData = defaultCompaniesSeedData) {
  for (let company of seedData) {
    await db.query(
      `INSERT INTO companies
        (handle, name, description, num_employees, logo_url)
      VALUES ($1, $2, $3, $4, $5)`,
      [company.handle, company.name, company.description, company.numEmployees, company.logoUrl]
    );
  }
}

/** 
 * Function to seed the jobs table with default data. 
 **/
async function seedJobs() {
  await db.query(`ALTER SEQUENCE jobs_id_seq RESTART WITH 1`);
  const jobResults = await db.query(
    `INSERT INTO jobs (title, salary, equity, company_handle)
     VALUES ('Retail Pharmacist', 100000, '0.01', 'c1'),
            ('Hospital Pharmacist', 150000, '0', 'c2'),
            ('Nuclear Physicist', 200000, NULL, 'c3')
     RETURNING id`
  );
  testJobIds.splice(0, 0, ...jobResults.rows.map(r => r.id));
}


/**
 * Function to seed the users table with default data.
 **/
async function seedUsers() {
  const hashedPasswords = await Promise.all([
    bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
    bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
    bcrypt.hash("password3", BCRYPT_WORK_FACTOR),
    bcrypt.hash("adminpassword", BCRYPT_WORK_FACTOR)
  ]);

  await db.query(`
    INSERT INTO users (username, password, first_name, last_name, email, is_admin)
    VALUES 
      ('u1', $1, 'U1F', 'U1L', 'u1@email.com', false),
      ('u2', $2, 'U2F', 'U2L', 'u2@email.com', false),
      ('u3', $3, 'U3F', 'U3L', 'u3@email.com', false),
      ('admin1', $4, 'Admin1', 'User', 'admin@user.com', true)
  `, hashedPasswords);
}



/**
 * Function to prepare the database for testing.
 * - Clears existing data and seeds the database with the specified     company data.
 * - Users data is seeded statically across all tests.
 * 
 * @param {Array} data - Optional - Array of company objects for custom seeding.
 *                     - Default company data is used if no parameter is provided. 
 */

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  // Clear and seed companies, users, and jobs
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM jobs");

  // Seed users as before
  await seedCompanies();
  await seedJobs();
  await seedUsers();  
}

/**
 * Starts a new transaction before each test.
 */
async function commonBeforeEach() {
    await db.query("BEGIN");
}

/** 
 * Rolls back the current transaction after each test. 
 * */
async function commonAfterEach() {
  await db.query("ROLLBACK");
}

/**
 * Closes the database connection after all tests.
  */
async function commonAfterAll() {
  await db.end();
}


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
  defaultCompaniesSeedData,
  specificCompaniesSeedData, // Optional: For use in tests needing custom company data
};