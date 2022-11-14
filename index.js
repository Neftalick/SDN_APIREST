const express = require('express')
const path = require("path")
const dotenv = require("dotenv")
const bodyParser = require("body-parser")
const pool = require("./pools")
const SHA512 = require("js-sha512").sha512
//Obtenemos constante a partir de variables de entorno para aumentar la seguridad del servicio y realizamos las congifuraciones correspondientes
dotenv.config()
const app = express()
app.use(bodyParser.json())
app.set('trust proxy', true)
const pool_para_autenticar = pool.pool1
const pool_usuarios_autenticados = pool.pool2
const pool_servicios = pool.pool3
//Solo expondremos un endpoint
app.post("/",(req,res)=>{
    if(req.body.action != null){
        switch(req.body.action){
            case "status":
                if(req.body.ip != null && req.body.mac != null){
                    //Aqui se hace la consulta a la base de datos 
                    pool_usuarios_autenticados.query(`SELECT u.idUsuario_Autenticado, u.Dispositivo_dispositivo_MAC, u.IP, r.nameROL FROM usuarios_autenticados.usuario_autenticado u INNER JOIN usuarios_autenticados.rol r ON u.Rol_idROL = r.idROL  WHERE u.IP = "${String(req.body.ip)}" AND u.Dispositivo_dispositivo_MAC = "${req.body.mac}"`,(err,results,fields)=>{
                        if(err == null){
                            console.log(results)
                            res.json({
                                "status":"OK",
                                "usuario":results[0]["idUsuario_Autenticado"],
                                "rol":results[0]["nameROL"],
                                "MAC asociada":results[0]["Dispositivo_dispositivo_MAC"],
                                "IP asociada":results[0]["IP"]
                            })
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
                if(req.body.user != null && req.body.password != null){
                    //Aqui se hace la consulta para autenticación
                    pool_para_autenticar.query(`SELECT * FROM usuarios_para_autenticar.usuario u
                    inner join usuarios_para_autenticar.rol r on r.idROL = u.Rol_idRol
                    inner join usuarios_para_autenticar.facultad f on f.idFacultad = u.Facultad_idFacultad
                    where u.usuario = "${req.body.user}" and u.enable = 1;`,(err,result,fields)=>{
                        if(err == null){
                            if(result.length != 0){
                                if(SHA512(req.body.password) == result[0]["password"]){
                                    //Falta
                                    console.log(result)
                                }else{
                                    res.json({
                                        "status":"error",
                                        "error":"la contraseña es incorrecta"
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
                }else{
                    res.json({
                        "status":"error",
                        "error":"debe ingresar su usuario y contraseña"
                    })
                }
                break
            case "sign out":
                
                break
            //Pensaba que el administrador mande sus credenciales cada vez que desee 
            case "add service":
                if(req.body.servicio != null){

                }else{
                    res.json({
                        "status":"error",
                        "error":"debe ingresar el servicio que desea agregar"
                    })
                }
                break
        }
    }else{
        res.json({
            "status":"error",
            "error":"la accion establecida no esta disponible"
        })
    }
})
app.listen(process.env.PORT, ()=>{
    console.log(`Se levanto un servidor API-REST en el puerto ${process.env.PORT}`)
})


