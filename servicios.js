const sql = require("connect_db");
//constructor servicio
const Servicio = function(servicio) {
    this.Nombre = servicio.Nombre;
    this.Puerto = servicio.Puerto;
    this.Protocolo = servicio.Protocolo;
    this.IP = servicio.IP;
    this.MAC = servicio.MAC;
};

Servicio.getAll = (title, result) => {
    let query = "SELECT * FROM servicio";

    if (title) {
        query += ` WHERE Nombre LIKE '%${title}%'`;
    }

    sql.query(query, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log("servicio: ", res);
        result(null, res);
    });
};
Servicio.updateById = (idServicio, servicio, result) => {
    sql.query(
        "UPDATE servicio SET Nombre = ?, Puerto = ?, Protocolo = ?, IP = ?, MAC = ?, WHERE idServicio = ?",
        [servicio.Nombre, servicio.Puerto, servicio.Protocolo,servicio.IP,servicio.MAC, idServicio],
        (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(null, err);
                return;
            }

            if (res.affectedRows == 0) {
                // not found Tutorial with the id
                result({ kind: "not_found" }, null);
                return;
            }

            console.log("updated tutorial: ", { idServicio: idServicio, ...servicio });
            result(null, { idServicio: idServicio, ...servicio });
        }
    );
};

module.exports = Servicio;

