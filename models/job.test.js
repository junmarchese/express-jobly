"use strict";

const db = require("../db");
const Job = require("./job");
const { NotFoundError, BadRequestError} = require("../expressError");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    testJobIds
} = require("./_testCommon");
const { findAll } = require("./user");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    const newJob = {
        title: "New Job",
        salary: 180000,
        equity: "0.1",
        companyHandle: "c1"
    };

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual({
            id: expect.any(Number),
            title: "New Job",
            salary: 180000,
            equity: "0.1",
            companyHandle: "c1"
        });
        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE title = 'New Job'`);
        expect(result.rows).toEqual([{
            id: job.id,
            title: "New Job",
            salary: 180000,
            equity: "0.1",
            companyHandle: "c1"
        }]);
    });
});

/*********************************** findAll */

describe("findAll", function () {
    test("works: no filter", async function () {
        let jobs = await Job.findAll();
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Retail Pharmacist",
                salary: 100000,
                equity: "0.01",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "Hospital Pharmacist",
                salary: 150000,
                equity: "0",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "Nuclear Physicist",
                salary: 200000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });

    test("works: with filter by title", async function () {
        let jobs = await Job.findAll({ title: "nuc" });
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Nuclear Physicist",
                salary: 200000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });

    test("works: with case-insensitive filter by title", async function () {
        let jobs = await Job.findAll({ title: "PHARMA" });
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Retail Pharmacist",
                salary: 100000,
                equity: "0.01",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "Hospital Pharmacist",
                salary: 150000,
                equity: "0",
                companyHandle: "c2"
            }
        ]);
    });

    test("works: with filter by minSalary", async function () {
        let jobs = await Job.findAll({ minSalary: 150000 });
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Hospital Pharmacist",
                salary: 150000,
                equity: "0",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "Nuclear Physicist",
                salary: 200000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });

    test("works: with filter by hasEquity true", async function () {
        let jobs = await Job.findAll({ hasEquity: true });
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Retail Pharmacist",
                salary: 100000,
                equity: "0.01",
                companyHandle: "c1"
            }
        ]);
    });

    test("works: without hasEquity filter (list all jobs)", async function () {
        let jobs = await Job.findAll({});
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Retail Pharmacist",
                salary: 100000,
                equity: "0.01",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "Hospital Pharmacist",
                salary: 150000,
                equity: "0",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "Nuclear Physicist",
                salary: 200000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });

    test("works: with hasEquity is false (list all jobs)", async function () {
        let jobs = await Job.findAll({ hasEquity: false });
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Retail Pharmacist",
                salary: 100000,
                equity: "0.01",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "Hospital Pharmacist",
                salary: 150000,
                equity: "0",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "Nuclear Physicist",
                salary: 200000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });

    test("works: with multiple filters", async function () {
        let jobs = await Job.findAll({
            minSalary: 90000,
            hasEquity: true
        });
        expect(jobs.sort((a, b) => a.id - b.id)).toEqual([
            {
                id: expect.any(Number),
                title: "Retail Pharmacist",
                salary: 100000,
                equity: "0.01",
                companyHandle: "c1"
            },
        ]);
    });
});

/*************************************** get */

describe("get", function () {
    test("works", async function () {
        let job = await Job.get(testJobIds[0]);
        expect(job).toEqual({
            id: testJobIds[0],
            title: "Retail Pharmacist",
            salary: 100000,
            equity: "0.01",
            companyHandle: "c1", 
        });
    });

    test("not found if no such job", async function () {
        const nonExistentIds = [0, 99999]; // Array of job IDs to test

        for (let id of nonExistentIds) {
            try {
                await Job.get(id);
                fail(`Expected NotFoundError for job ID ${id}, but no error was thrown.`);
            } catch (err) {
                expect(err instanceof NotFoundError).toBeTruthy();
                expect(err.message).toEqual(`No job found with id: ${id}`);
            }
        }
    });
});

/********************************************* update */

describe("update", function () {
    const updateData = {
        title: "Updated Job",
        salary: 50000,
        equity: "0.5"
    };

    test("works", async function () {
        let job = await Job.update(testJobIds[0], updateData);
        expect(job).toEqual({
            id: testJobIds[0],
            ...updateData,
            companyHandle: "c1"
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE id = $1`, [testJobIds[0]]);
        expect(result.rows).toEqual([{
            id: testJobIds[0],
            title: "Updated Job",
            salary: 50000,
            equity: "0.5",
            companyHandle: "c1"
        }]);
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(0, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            await Job.update(testJobIds[0], {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/*********************************** remove */

describe("remove", function () {
    test("works", async function () {
        await Job.remove(testJobIds[0]);
        const result = await db.query(
            "SELECT id FROM jobs WHERE id=$1", [testJobIds[0]]);
        expect(result.rows.length).toEqual(0);
    });

    test("not found if no such job", async function () {
        try {
            await Job.remove(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});