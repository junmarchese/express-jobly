const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.
/**
 * Helper function for generating SQL query for partial update by dynamically generating the `SET` clause of an SQL `UPDATE` query.  It takes a JavaScript-styled object with fields to update and a mapping object, and converts the field names to their corresponding SQL column names.
 * 
 * Input Example:
 * dataToUpdate = { firstName: "Jill", age:30 }
 * jsToSql = { firstName: "first_name", age: "age" }
 * 
 * Output Example:
 * {
 *    setCols: "first_name=$1, age=$2",
 *    values: ["Jill", 30]
 * }
 * 
 * @param {Object} dataToUpdate - Object containing fields to    update.
 * @param {Object} jsToSql - Object mapping JS-style fields to SQL column names.
 * @returns {Object} { setCols, values }
 * @throws {Error} If `dataToUpdate` is empty.
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
