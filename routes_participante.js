module.exports = app => {
    const participante = require("controller");

    var router = require("express").Router();

    // Create a new Participante
    router.post("/", participante.create);

    // Retrieve all Participante
    router.get("/", participante.findAll);

    // Retrieve a single PArticipante with id
    router.get("/:id", participante.findOne);

    // Update a Particiapnte with id
    router.put("/:id", participante.update);


    app.use('/api/participante', router);
};