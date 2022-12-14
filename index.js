const express = require('express')
const path = require("path")
const dotenv = require("dotenv")
const bodyParser = require("body-parser")
const pool = require("./pools")
const e = require('express')
const SHA512 = require("js-sha512").sha512
// const http = require('http')
const request = require("request")


//Obtenemos constante a partir de variables de entorno para aumentar la seguridad del servicio y realizamos las congifuraciones correspondientes
dotenv.config()
const app = express()
app.use(bodyParser.json())
app.set('trust proxy', true)
const pool_para_autenticar = pool.pool1
const pool_usuarios_autenticados = pool.pool2
const pool_servicios = pool.pool3

// Variables importantes
const controller_IP = "localhost"

// Prueba DPID
// app.get("/dpid",(req,response)=> {
//
//     const mac = req.query.mac
//     console.log("La MAC recibida fue:",mac)
//
//     http.get('http://'+controller_IP+':8080'+uri+'?mac='+mac, res => {
//         let data = ''
//
//         // called when a data chunk is received.
//         res.on('data', chunk => {
//             data += chunk
//         })
//
//         // called when the complete response is received.
//         res.on('end', () => {
//             let resJSON = JSON.parse(data)
//             //console.log("RAW Data: ", data)
//             //console.log("\n\nJSON Data: ", resJSON[0])
//             //console.log("\n\nAP: ", resJSON[0].attachmentPoint)
//             //console.log("\n\nAP: ", resJSON[0].attachmentPoint[0].switchDPID)
//             //if (resJSON.attachmentPoint !== undefined && resJSON.attachmentPoint[0].switchDPID !== undefined){
//
//             //console.log("\n\nSwitchDPID: ", resJSON[0].attachmentPoint[0].switchDPID)
//             dpid = resJSON[0].attachmentPoint[0].switchDPID
//             response.json({"MAC": mac , "dpid" : dpid})
//             //}
//         })
//         res.on("error", (err) => {
//             console.log("Error: ", err)
//         })
//     }).end()
// })

//Solo expondremos un endpoint para el reqerimiento 1
app.post("/",(req,res)=>{
    if(req.body.action != null){
        switch(req.body.action){
            case "status":
                if(req.body.ip != null && req.body.mac != null){

                    //Aqui se hace la consulta a la base de datos
                    pool_usuarios_autenticados.query(`SELECT u.idUsuario_Autenticado, u.Dispositivo_dispositivo_MAC, u.IP, r.nameROL FROM usuarios_autenticados.usuario_autenticado u 
                                                    INNER JOIN usuarios_autenticados.rol r ON u.Rol_idROL = r.idROL  
                                                    WHERE u.IP = "${String(req.body.ip)}" AND u.Dispositivo_dispositivo_MAC = "${req.body.mac}"`,
                    (err,results,fields)=>{

                        if(err == null){
                            console.log(results)
                            if(results.length != 0){
                                res.json({
                                    "status":"OK",
                                    "usuario":results[0]["idUsuario_Autenticado"],
                                    "rol":results[0]["nameROL"],
                                    "MAC asociada":results[0]["Dispositivo_dispositivo_MAC"],
                                    "IP asociada":results[0]["IP"]
                                })
                            }else{
                                res.json({
                                    //modifico
                                    "status":"error",
                                    "error":"No se encuentra ningun usuario vinculado al dispositivo",
                                    "msg":"Si desea ingresar debe enviar mediante HTTP/POST el siguiente JSON con la accion = sign in"
                                })
                            }
                        }else{
                            res.json({
                                "status":"error",
                                "error":err
                            })
                        }
                    })
                }else{
                    res.json({
                        "status":"error",
                        "error":"debe ingresar la ip y la mac de su dispositivo"
                    })
                    
                }
                break
            case "sign in":
                if(req.body.user != null){
                    if(req.body.password != null && req.body.mac != null && req.body.ip != null){
                        //Aqui se hace la consulta para autenticaci??n
                        pool_para_autenticar.query(`SELECT * FROM usuarios_para_autenticar.usuario u
                                                    inner join usuarios_para_autenticar.rol r on r.idROL = u.Rol_idRol
                                                    inner join usuarios_para_autenticar.facultad f on f.idFacultad = u.Facultad_idFacultad
                                                    where u.usuario = "${req.body.user}" and u.enable = 1;`,
                        (err,result,fields)=>{
                            if(err == null){
                                //password de prueba => password123
                                if(result.length != 0){
                                    if(SHA512(req.body.password) == result[0]["password"]){
                                        //debemos agregar manera para obtener la mac del equipo
                                        pool_usuarios_autenticados.query(`INSERT INTO usuarios_autenticados.dispositivo (dispositivo_ID, dispositivo_MAC, name) 
                                                                        VALUES ("${req.body.mac}", "${req.body.mac}", 'computador')`,
                                        (err2,result2,fields2)=>{
                                            if(err2 == null){

                                                // Se obtiene la DPID:
                                                request('http://'+controller_IP+':8080/wm/device/?mac='+req.body.mac, {json: true}, (err, response, body)  => {

                                                    if (err) {
                                                        console.log("Hubo un problema al conectarse con el controlador para pedir la DPID")
                                                        res.json({
                                                            "status":"error",
                                                            "error": "No se pudo obtener la DPID del switch correspondiente a la MAC " + req.body.mac
                                                        })
                                                    }
                                                    else {
                                                        //console.log("resJSON: ", body[0])
                                                        //console.log("true? : ", body[0].attachmentPoint[0] != null)

                                                        if (body[0] != null && body[0].attachmentPoint[0] != null){

                                                            let dpid = body[0].attachmentPoint[0].switchDPID
                                                            console.log("El DPID obtenido es: ", dpid)

                                                            pool_usuarios_autenticados.query(`INSERT INTO usuarios_autenticados.usuario_autenticado (idUsuario_Autenticado,Dispositivo_dispositivo_MAC,diferenciador,switch_MAC,IP,Facultad_facultad_ID,Rol_idROL) 
                                                                            VALUES ("${req.body.user}","${req.body.mac}","0","${dpid}","${req.body.ip}","${result[0]["Facultad_idFacultad"]}","${result[0]["Rol_idRol"]}")`,
                                                                (err3,results3,fields3)=>{
                                                                    if(err3 == null){
                                                                        res.json({
                                                                            "status":"OK"
                                                                        })
                                                                    }else{
                                                                        res.json({
                                                                            "status":"error",
                                                                            "error":err3
                                                                        })
                                                                    }
                                                                })
                                                        }
                                                        else {
                                                            console.log("No se pudo obtener la DPID de la mac")
                                                            res.json({
                                                                "status":"error",
                                                                "error": "No se pudo obtener la DPID del switch correspondiente a la MAC " + req.body.mac
                                                            })
                                                        }
                                                    }
                                                })
                                            }else{
                                                console.log("aqui")
                                                res.json({
                                                    "status":"error",
                                                    "error":err2
                                                })
                                            }
                                        })
                                        console.log(result)
                                    }else{
                                        res.json({
                                            "status":"error",
                                            "error":"la contrase??a es incorrecta"
                                        })
                                    }
                                }else{
                                    res.json({
                                        "status":"error",
                                        "error":"El usuario no existe o no esta habilitado"
                                    })
                                }
                            }else{
                                res.json(
                                    {
                                        "status":"error",
                                        "error":err
                                    }
                                )
                            }
                        })
                    }
                }else{
                    if(req.body.help != null){
                        res.json({
                            "status":"OK",
                            "msg":"Parametros requeridos -> user,password,ip,mac"
                        })
                    }else{
                        res.json({
                            "status":"error",
                            "error":"debe ingresar su usuario y contrase??a"
                        })
                    }
                }
                break
            case "sign out":
                if(req.body.user!=null && req.body.password!=null && req.body.mac!=null && req.body.ip!=null){
                    pool_para_autenticar.query(`SELECT * FROM usuarios_para_autenticar.usuario where usuario = "${req.body.user}" and password = "${req.body.password}"`,(err,result,fields)=>{
                        if(err == null){
                            if(result.length != 0){
                                pool_usuarios_autenticados.query(`SELECT FROM usuarios_autenticados.usuario_autenticado WHERE IP = "${req.body.ip}" and Dispositivo_dispositivo_MAC = "${req.body.mac}"`,(err10,result10,fields10)=>{
                                    if (err10 == null) {
                                        if (result.length != 0) {
                                            if (result[0]["idUsuario"] == result10[0]["idUsuario_Autenticado"]) {
                                                pool_usuarios_autenticados.query(`DELETE FROM usuarios_autenticados.usuario_autenticado WHERE idUsuario_Autenticado = "${req.body.user}"`,(err2,result2,fields2)=>{
                                                    if(err2 == null){
                                                        console.log(result)
                                                        pool_usuarios_autenticados.query(`DELETE FROM usuarios_autenticados.dispositivo WHERE dispositivo_MAC = "${result[0]["Dispositivo_dispositivo_MAC"]}"`,(err3,results3,fields3)=>{
                                                            if(err3 == null){
                                                                res.json({
                                                                    "status":"OK"
                                                                })
                                                            }else{
                                                                res.json({
                                                                    "status":"error",
                                                                    "error":err3
                                                                })
                                                            }
                                                        })
                                                    }else{
                                                        console.log("aqui")
                                                        res.json({
                                                            "status":"error",
                                                            "error":err2
                                                        })
                                                    }
                                                })
                                            } else {
                                                res.json({
                                                    "status":"error",
                                                    "error":"No se han encontrado coincidencias"
                                                })
                                            }
                                        } else{
                                            res.json({
                                                "status":"error",
                                                "error":"El usuario autenticado no se ha encontrado"
                                            })
                                        }
                                    } else{
                                        console.log("aqui")
                                        res.json({
                                            "status":"error",
                                            "error":err10
                                        })
                                    }
                                })
                            }else{
                                res.json({
                                    "status":"error",
                                    "error":"El usuario no se ha encontrado"
                                })
                            }
                        }else{
                            res.json(
                                {
                                    "status":"error",
                                    "error":err
                                }
                            )
                        }
                    })
                } else{
                    if(req.body.help != null){
                        res.json({
                            "status":"OK",
                            "msg":"Parametros requeridos -> password,ip,mac"
                        })
                    }else{
                        res.json({
                            "status":"error",
                            "error":"debe ingresar contrase??a"
                        })
                    }
                }
                break
            //Pensaba que el administrador mande sus credenciales cada vez que desee 
        }
    }else{
        res.json({
            "status":"error",
            "error":"la accion establecida no esta disponible - acciones disponibles: status, sign in y sign out"
        })
    }
})


app.get("/services",(req,res) => {
    if(req.body.user != null && req.body.password != null){
        //validamos que sea el administrador
        pool_para_autenticar.query(`SELECT * FROM usuarios_para_autenticar.usuario u
                                                    inner join usuarios_para_autenticar.rol r on r.idROL = u.Rol_idRol
                                                    inner join usuarios_para_autenticar.facultad f on f.idFacultad = u.Facultad_idFacultad
                                                    where u.usuario = "${req.body.user}" and u.enable = 1;`,(err,result,fields) =>{
            if(err == null){
                if(result.length != 0){
                    if(SHA512(req.body.password) == result[0]["password"]){
                        //console.log(result[0])
                        if(result[0]["nombreRol"] == "ADMIN"){
                            if(req.body.servicio != null){
                                //lista el servicio
                                pool_servicios.query(`Select * from servicios.servicio where Nombre="${req.body.servicio}" `, (err2,result2,fields2) => {
                                    if(err2 == null){
                                        //Lista los participantes
                                        pool_servicios.query(`SELECT p.usuario FROM servicios.servicio s 
                                        inner join servicios.servicio_has_participantes sp on sp.Servicio_idServicio = s.idServicio
                                        inner join servicios.participantes p on sp.Participantes_idParticipantes = p.idParticipantes
                                        where s.idServicio = "${result2[0]["idServicio"]}";`,(err3,result3,fields3) => {

                                            if(err3 == null){
                                                res.json({
                                                    "status":"ok",
                                                    "servicio":result2[0],
                                                    "participantes":result3
                                                })
                                            }else{
                                                res.status(400).json({
                                                    "status":"error",
                                                    "error":err3
                                                })
                                            }
                                            
                                        })
                                    }else{
                                        res.status(400).json({
                                            "status":"error",
                                            "msg":"Surgio un problema con la query, por favor vuelva a intentarlo m??s tarde"
                                        })
                                    }
                                })
                            }else{
                                //lista todos los ervicios
                                pool_servicios.query("Select * from servicios.servicio", (err2,result2,fields2) => {
                                    if(err2 == null){
                                        res.json({
                                            "status":"ok",
                                            "respuesta":result2
                                        })
                                    }else{
                                        res.status(400).json({
                                            "status":"error",
                                            "msg":"Surgio un problema con la query, por favor vuelva a intentarlo m??s tarde"
                                        })
                                    }
                                })
                            }
                        }else{
                            res.status(401).json({
                                "status":"error",
                                "msg":"El usuario ingresado no es un administrador"
                            })
                        }
                    }else{
                        res.status(401).json({
                            "status":"error",
                            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                        })
                    }
                }else{
                    res.status(401).json({
                        "status":"error",
                        "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                    })
                }
            }
        })
    }else{
        res.status(401).json({
            "status":"error",
            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
        })
    }
})

app.post("/services",(req,res) => {
    //Veremos los parametros necesarios
    //Se debe identificar el administrados para anadir servicios
    if(req.body.user != null && req.body.password != null){
        //validamos que sea el administrador
        pool_para_autenticar.query(`SELECT * FROM usuarios_para_autenticar.usuario u
                                                    inner join usuarios_para_autenticar.rol r on r.idROL = u.Rol_idRol
                                                    inner join usuarios_para_autenticar.facultad f on f.idFacultad = u.Facultad_idFacultad
                                                    where u.usuario = "${req.body.user}" and u.enable = 1;`,(err,result,fields) =>{
            if(err == null){
                if(result.length != 0){
                    if(SHA512(req.body.password) == result[0]["password"]){
                        //console.log(result[0])
                        if(result[0]["nombreRol"] == "ADMIN"){
                            if(req.body.servicio != null && req.body.puerto != null && req.body.protocolo != null && req.body.ip != null && req.body.mac != null && req.body.participantes != null){
                                if(req.body.participantes.length != 0){
                                    //Creamos los servicios
                                    pool_servicios.query(`INSERT INTO servicios.servicio (Nombre,Puerto,Protocolo,IP,MAC) VALUES ("${req.body.servicio}","${req.body.puerto}","${req.body.protocolo}","${req.body.ip}","${req.body.mac}")`,(err,result,fields) =>{
                                        id = result.insertId
                                        if(err == null){
                                            const usuariosNoValidos = []
                                            req.body.participantes.forEach(usuarios => {
                                                //usuarios["user"]
                                                pool_servicios.query(`SELECT idParticipantes FROM servicios.participantes WHERE servicios.participantes.usuario = "${usuarios["user"]}"`,(err2,result2,fields2) =>{
                                                    if(result != null){
                                                        pool_servicios.query(`INSERT INTO servicios.servicio_has_participantes (Servicio_idServicio,Participantes_idParticipantes) VALUES ("${id}","${result2[0]["idParticipantes"]}")`)
                                                    }else{
                                                        usuariosNoValidos.push(usuarios["user"])
                                                    }
                                                })
                                            })
                                            if(usuariosNoValidos.length == 0){
                                                res.json({
                                                    "status":"OK"
                                                })
                                            }else{
                                                res.status(400).json({
                                                    "status":"error",
                                                    "msg":"los siguientes usuarios no existen y no seran ingresados al servicio",
                                                    "users":usuariosNoValidos
                                                })
                                            }
                                        }else{
                                            res.status(401).json({
                                                "status":"error",
                                                "msg":"error al crear el servicio validar todos los parametros"
                                            })
                                        }
                                    })
                                }else{
                                    res.status(401).json({
                                        "status":"error",
                                        "msg":"Los participantes no debe estar vacio"
                                    })
                                }
                            }else{
                                res.status(401).json({
                                    "status":"error",
                                    "msg":"Ingresa todos los parametros necesarios"
                                })
                            }
                        }else{
                            res.status(401).json({
                                "status":"error",
                                "msg":"El usuario ingresado no es un administrador"
                            })
                        }
                    }else{
                        res.status(401).json({
                            "status":"error",
                            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                        })
                    }
                }else{
                    res.status(401).json({
                        "status":"error",
                        "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                    })
                }
            }
        })
    }else{
        res.status(401).json({
            "status":"error",
            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
        })
    }
})

app.put("/services", (req,res) => {
    //Veremos los parametros necesarios
    //Se debe identificar el administrados para anadir servicios
    if(req.body.user != null && req.body.password != null  && req.body.action != null && req.body.servicio){
        //validamos que sea el administrador
        pool_para_autenticar.query(`SELECT * FROM usuarios_para_autenticar.usuario u
                                                    inner join usuarios_para_autenticar.rol r on r.idROL = u.Rol_idRol
                                                    inner join usuarios_para_autenticar.facultad f on f.idFacultad = u.Facultad_idFacultad
                                                    where u.usuario = "${req.body.user}" and u.enable = 1;`,(err,result,fields) =>{
            if(err == null){
                if(result.length != 0){
                    if(SHA512(req.body.password) == result[0]["password"]){
                        //console.log(result[0])
                        if(result[0]["nombreRol"] == "ADMIN"){
                            switch (req.body.action){
                                case "modificar":
                                    pool_servicios.query(`SELECT idServicio from servicio where Nombre = "${req.body.servicio}"`,(err,result,fields) =>{
                                        id = result[0]["idServicio"]
                                        if(err == null){                                        
                                                    if(req.body.protocolo != null){
                                                        pool_servicios.query(`UPDATE servicio SET Protocolo = "${req.body.protocolo}" WHERE (idServicio = '${id}');`,(err,result) =>{
                                                            if(err == null){
                                                                res.json({
                                                                    "status":"ok"
                                                                })
                                                            }else{
                                                                res.json({
                                                                    "status":"error",
                                                                    "error":err
                                                                })
                                                            }
                                                        })
                                                    }
                                                    if(req.body.puerto != null){
                                                        pool_servicios.query(`UPDATE servicio SET Puerto = "${req.body.puerto}" WHERE (idServicio = '${id}');`,(err,result) =>{
                                                            if(err == null){
                                                                res.json({
                                                                    "status":"ok"
                                                                })
                                                            }else{
                                                                res.json({
                                                                    "status":"error",
                                                                    "error":err
                                                                })
                                                            }
                                                        })

                                                    }
                                                    if(req.body.ip != null){
                                                        pool_servicios.query(`UPDATE servicio SET IP = "${req.body.ip}" WHERE (idServicio = '${id}');`,(err,result) =>{
                                                            if(err == null){
                                                                res.json({
                                                                    "status":"ok"
                                                                })
                                                            }else{
                                                                res.json({
                                                                    "status":"error",
                                                                    "error":err
                                                                })
                                                            }
                                                        })
                                                    }
                                                    if(req.body.mac != null){
                                                        pool_servicios.query(`UPDATE servicio SET MAC = "${req.body.mac}" WHERE (idServicio = '${id}');`,(err,result) =>{
                                                            if(err == null){
                                                                res.json({
                                                                    "status":"ok"
                                                                })
                                                            }else{
                                                                res.json({
                                                                    "status":"error",
                                                                    "error":err
                                                                })
                                                            }
                                                        })
                                                    }
                                                    else{
                                                        res.status(401).json({
                                                            "msg":"error",
                                                            "error":"Establesca el parametro que desea modificar del servicio"
                                                        })
                                                    }                                    
                                        }else{
                                            res.status(401).json({
                                                "status":"error",
                                                "msg":"error al crear el servicio validar todos los parametros"
                                            })
                                        }
                                    })
                                    break
                                case "agregar participante":
                                    if(req.body.participantes.length != 0){
                                        //Creamos los servicios
                                        pool_servicios.query(`SELECT idServicio from servicio where Nombre="${req.body.servicio}"`,(err,result,fields) =>{
                                            if(err == null){
                                                console.log(result[0])
                                                id = result[0]["idServicio"]
                                                console.log(id)
                                                const usuariosNoValidos = []
                                                req.body.participantes.forEach(usuarios => {
                                                    //usuarios["user"]
                                                    pool_servicios.query(`SELECT idParticipantes FROM servicios.participantes WHERE servicios.participantes.usuario = "${usuarios["user"]}"`,(err2,result2,fields2) =>{
                                                        console.log(result2)
                                                        if(result != null){
                                                            pool_servicios.query(`INSERT INTO servicios.servicio_has_participantes (Servicio_idServicio,Participantes_idParticipantes) VALUES ("${id}","${result2[0]["idParticipantes"]}")`)
                                                        }else{
                                                            usuariosNoValidos.push(usuarios["user"])
                                                        }
                                                    })
                                                })
                                                if(usuariosNoValidos.length == 0){
                                                    res.json({
                                                        "status":"OK"
                                                    })
                                                }else{
                                                    res.status(400).json({
                                                        "status":"error",
                                                        "msg":"los siguientes usuarios no existen y no seran ingresados al servicio",
                                                        "users":usuariosNoValidos
                                                    })
                                                }
                                                
                                            }else{
                                                res.json({
                                                    "msg":"error",
                                                    "error":err
                                                })
                                            }
                                        })
                                    }else{
                                        res.status(401).json({
                                            "status":"error",
                                            "msg":"Los participantes no debe estar vacio"
                                        })
                                    }
                                    break
                                default :
                                    res.json({
                                        "status":"error",
                                        "error":"la accion establecida no esta disponible"
                                    })
                                    break
                            }
                        }else{
                            res.status(401).json({
                                "status":"error",
                                "msg":"El usuario ingresado no es un administrador"
                            })
                        }
                    }else{
                        res.status(401).json({
                            "status":"error",
                            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                        })
                    }
                }else{
                    res.status(401).json({
                        "status":"error",
                        "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                    })
                }
            }
        })
    }else{
        res.status(401).json({
            "status":"error",
            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
        })
    }
})

app.delete("/services", (req,res) => {
    if(req.body.user != null && req.body.password != null){
        //validamos que sea el administrador
        pool_para_autenticar.query(`SELECT * FROM usuarios_para_autenticar.usuario u
                                                    inner join usuarios_para_autenticar.rol r on r.idROL = u.Rol_idRol
                                                    inner join usuarios_para_autenticar.facultad f on f.idFacultad = u.Facultad_idFacultad
                                                    where u.usuario = "${req.body.user}" and u.enable = 1;`,(err,result,fields) =>{
            if(err == null){
                if(result.length != 0){
                    if(SHA512(req.body.password) == result[0]["password"]){
                        //console.log(result[0])
                        if(result[0]["nombreRol"] == "ADMIN"){
                            //debe ingresar el nombre del servicio a eliminar
                            if(req.body.servicio != null){
                                //Obtenemos el ID del servicio que se desea eliminar
                                pool_servicios.query(`SELECT * FROM servicios.servicio WHERE servicio.Nombre = "${req.body.servicio}"`,(err2,result2,fields2) => {
                                    if(err2 == null){
                                        //console.log(result2[0]["idServicio"])
                                        //Eliminamos la relacion de un servicio
                                        pool_servicios.query(`DELETE FROM servicios.servicio_has_participantes WHERE servicio_has_participantes.Servicio_idServicio = "${result2[0]["idServicio"]}"`,(err3,result3,fields3) =>{
                                            if(err3 == null){
                                                res.json({
                                                    "status":"OK"
                                                })
                                            }else{
                                                res.json({
                                                    "status":"error",
                                                    "msg":"No se pudo eliminar el servicio"
                                                })
                                            }
                                        })
                                    }else{
                                        res.json({
                                            "status":"error",
                                            "msg":"No existe dicho servicio"
                                        })
                                    }
                                })
                            }else{
                                res.status(401).json({
                                    "status":"error",
                                    "msg":"Debe ingresar el nombre del servicio que desea eliminar"
                                })
                            }
                        }else{
                            res.status(401).json({
                                "status":"error",
                                "msg":"El usuario ingresado no es un administrador"
                            })
                        }
                    }else{
                        res.status(401).json({
                            "status":"error",
                            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                        })
                    }
                }else{
                    res.status(401).json({
                        "status":"error",
                        "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
                    })
                }
            }
        })
    }else{
        res.status(401).json({
            "status":"error",
            "msg":"Usuario o contrase??a incorrecta debe pertenecer al administrados"
        })
    }
})
/*
app.post("/prueba",(req,res)=>{
    req.body.participantes.forEach(element => {
        console.log(element["user"])
    });
})
*/

app.listen(process.env.PORT, ()=>{
    console.log(`Se levanto un servidor API-REST en el puerto ${process.env.PORT}`)
})


