"use strict";

/** Shared config for application; can be required many places. */

require("dotenv").config();
require("colors");

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

const PORT = +process.env.PORT || 3001;

// Use dev database, testing database, or via env var, production database
function getDatabaseUri() {
  return (process.env.NODE_ENV === "test")
      ? process.env.TEST_DATABASE_URL || "postgresql:///jobly_test"
      : process.env.DATABASE_URL || "postgresql:///jobly";
}

// Display only the database name (without credentials) for logging purpose
const dbUriForLog = (process.env.NODE_ENV === "test") 
  ? "postgresql:///jobly_test"
  : (process.env.NODE_ENV === "production")
  ? "postgresql:///jobly"
  : "postgresql:///jobly";

// Speed up bcrypt during tests, since the algorithm safety isn't being tested
//
// WJB: Evaluate in 2021 if this should be increased to 13 for non-test use
const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

console.log("Jobly Config:".green);
console.log("SECRET_KEY:".yellow, process.env.NODE_ENV === "development" ? SECRET_KEY: "****");
console.log("PORT:".yellow, PORT.toString());
console.log("BCRYPT_WORK_FACTOR".yellow, BCRYPT_WORK_FACTOR);
console.log("Database:".yellow, dbUriForLog);
console.log("---");

module.exports = {
  SECRET_KEY,
  PORT,
  BCRYPT_WORK_FACTOR,
  getDatabaseUri,
};
