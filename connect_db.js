var mysql = require('mysql2');
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "servicios"
});

// open the MySQL connection
con.connect(error => {
    if (error) throw error;
    console.log("Successfully connected to the database.");
});
module.exports = con;