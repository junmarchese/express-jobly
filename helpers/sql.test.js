const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", () => {
    test("test for valid input with mapped fields", () => {
        const dataToUpdate = { firstName: "Jill", age: 30 };
        const jsToSql = { firstName: "first_name", age: "age" };

        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ["Jill", 30],
        });
    });

    test("test for partially mapped fields", () => {
        const dataToUpdate = { firstName: "John", jobTitle: "accountant" };
        const jsToSql = { firstName: "first_name" };

        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result).toEqual({
            setCols: '"first_name"=$1, "jobTitle"=$2',
            values: ["John", "accountant"]
        });
    });

    test("test with only single field passed in dataToUpdate", () => {
        const dataToUpdate = { firstName: "Joel" };
        const jsToSql = { firstName: "first_name", age: "age" };

        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result).toEqual({
            setCols: '"first_name"=$1',
            values: ["Joel"],
        });
    });


    test("throws error if no data is passed into dataToUpdate", () => {
        const dataToUpdate = {};
        const jsToSql = { firstName: "first_name", age:"age" };

        expect(() => sqlForPartialUpdate(dataToUpdate, jsToSql)).toThrowError("No data");
    });

    test("fields with null values", () => {
        const dataToUpdate = { firstName: "Jane", age: null };
        const jsToSql = { firstName: "first_name", age: "age" };

        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ["Jane", null],
        });
    });

});