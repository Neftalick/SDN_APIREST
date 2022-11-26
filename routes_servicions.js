module.exports = app => {
    const servicio = require("controller");

    var router = require("express").Router();



    // Retrieve all Servico
    router.get("/", servicio.findAll);

    // Retrieve a single PArticipante with id
    router.get("/:id", servicio.findOne);

    // Update a Particiapnte with id
    router.put("/:id", servicio.update);


    app.use('/api/servicio', router);
};