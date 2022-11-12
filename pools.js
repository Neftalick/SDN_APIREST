const mysql = require("mysql2");
require("dotenv").config();

module.exports = {
    pool1: mysql.createPool({
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: 'usuarios_para_autenticar',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    }),
    pool2: mysql.createPool({
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: 'usuarios_autenticados',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    }),
    pool3: mysql.createPool({
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: 'servicios',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    })
}