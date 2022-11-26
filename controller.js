const Servicio_has_participantes = require("./servicio_participantes");
exports.create = (req, res) => {
    // Validate request
    if (!req.body) {
        res.status(400).send({
            message: "Content can not be empty!"
        });
    }

    // Create a Tutorial
    const servicio_has_participantes = new Servicio_has_participantes({
        Servicio_idServicio: req.body.idServicio,
        Participantes_idParticipantes: req.body.idParticipantes,
        published: req.body.published || false
    });

    // Save Tutorial in the database
    Servicio_has_participantes.create(servicio_has_participantes, (err, data) => {
        if (err)
            res.status(500).send({
                message:
                    err.message || "Some error occurred while creating the Tutorial."
            });
        else res.send(data);
    });
};
// Retrieve all Tutorials from the database (with condition).
exports.findAll = (req, res) => {
    const title = req.query.title;

    Servicio_has_participantes.getAll(title, (err, data) => {
        if (err)
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving tutorials."
            });
        else res.send(data);
    });
};

