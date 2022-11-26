const sql = require("connect_db");

const Servicio_has_participantes = function (servicio_has_participantes) {
    this.Servicio_idServicio = servicio_has_participantes.Servicio_idServicio;
    this.Participantes_idParticipantes = servicio_has_participantes.Participantes_idParticipantes;


};
Servicio_has_participantes.create = (nuevo, result) => {
    sql.query("INSERT INTO servicio_has_participantes SET ?", nuevo, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("created tutorial: ", {nuevo});
        result(null, {nuevo});
    });
};
Servicio_has_participantes.getAll = (title, result) => {
    let query = "SELECT s.idServicio,s.Nombre, p.* FROM participantes p inner join servicio_has_participantes sp on p.idParticipantes=sp.Participantes_idParticipantes inner join servicio s on s.idServicio=sp.Servicio_idServicio";


    if (title) {
        query += ` WHERE Nombre = '%${title}%'`;
    }

    sql.query(query, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log("lista: ", res);
        result(null, res);
    });
};

module.exports = Servicio_has_participantes;