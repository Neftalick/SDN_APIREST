const sql = require("connect_db");
// constructor participante
const Partcipante = function(participante) {
    this.usuario = participante.usuario;


};
Partcipante.create = (nuevo, result) => {
    sql.query("INSERT INTO participantes SET ?", nuevo, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("created tutorial: ", { id: res.insertId, ...nuevo });
        result(null, { id: res.insertId, ...nuevo });
    });
};
Partcipante.getAll = (title, result) => {
    let query = "SELECT * FROM participantes";

    if (title) {
        query += ` WHERE usuario LIKE '%${title}%'`;
    }

    sql.query(query, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log("participante: ", res);
        result(null, res);
    });
};
Partcipante.updateById = (idParticipantes, participante, result) => {
    sql.query(
        "UPDATE participantes SET usuario = ? WHERE idParticipantes = ?",
        [participante.usuario, idParticipantes],
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

            console.log("updated participante: ", { idParticipantes: idParticipantes, ...participante });
            result(null, { idParticipantes: idParticipantes, ...participante });
        }
    );
};

module.exports = Partcipante;