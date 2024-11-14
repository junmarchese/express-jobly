"use strict";
/** Database setup for jobly. */
require('dotenv').config()

const { Pool } = require("pg");
const { getDatabaseUri } = require("./config");

let db;

if (process.env.NODE_ENV === "production") {
  db = new Pool({
    connectionString: getDatabaseUri(),
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  db = new Pool({
    connectionString: getDatabaseUri()
  });
}

module.exports = {
  query: (text, params) => db.query(text, params),
  end: () => db.end(),
};