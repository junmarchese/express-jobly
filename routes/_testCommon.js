"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");
const { createToken } = require("../helpers/tokens");

// const User = require("../models/user");
// const Company = require("../models/company");
// const Job = require("../models/job");


const testJobIds = []; // Array to store seeded job IDs

async function seedCompanies() {
  await db.query(`
    INSERT INTO companies (handle, name, description, num_employees, logo_url)
    VALUES 
      ('c1', 'C1', 'Desc1', 1, 'http://c1.img'),
      ('c2', 'C2', 'Desc2', 2, 'http://c2.img'),
      ('c3', 'C3', 'Desc3', 3, 'http://c3.img'),
      ('c4', 'C4', 'Desc4', 4, 'http://c4.img')
  `);
}

async function seedJobs() {
  const jobResults = await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES 
      ('Retail Pharmacist', 100000, '0.01', 'c1'),
      ('Hospital Pharmacist', 150000, '0', 'c2'),
      ('Nuclear Physicist', 200000, NULL, 'c3')
    RETURNING id
  `);
  testJobIds.push(...jobResults.rows.map(r => r.id));
}

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


async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM jobs");

  await seedCompanies();
  await seedJobs();
  await seedUsers();
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

// Create tokens for user and admin 
const u1Token = createToken({ username: "u1", isAdmin: false });
const adminToken = createToken({ username: "admin1", isAdmin: true });


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  adminToken,
  testJobIds,
};
