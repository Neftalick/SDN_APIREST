module.exports = app => {
    const ser_part = require("controller");

    var router = require("express").Router();


    // Create a new Participante
    router.post("/", ser_part.create);
    // Retrieve all Lista
    router.get("/", ser_part.findAll);

    // Retrieve a single PArticipante with id
    router.get("/:id", ser_part.findOne);




    app.use('/api/ser_part', router);
};