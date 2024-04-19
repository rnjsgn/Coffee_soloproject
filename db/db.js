const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "1234",
    port: "3306",
    database: "coffee3",
});

module.exports = pool;

