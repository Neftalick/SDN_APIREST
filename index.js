const express = require('express')
const path = require("path")
const dotenv = require("dotenv")
const bodyParser = require("body-parser")
const pool = require("./pools")
const e = require('express')
const SHA512 = require("js-sha512").sha512
const http = require('http')

//Obtenemos constante a partir de variables de entorno para aumentar la seguridad del servicio y realizamos las congifuraciones correspondientes
dotenv.config()
const app = express()
app.use(bodyParser.json())
app.set('trust proxy', true)
const pool_para_autenticar = pool.pool1
const pool_usuarios_autenticados = pool.pool2
const pool_servicios = pool.pool3

// Función para obtener el Switch DPID

function obtenerDPID(ip){
    const controller_IP = "10.0.0.1"
    const uri = "/wm/device/"

    http.get('http://'+controller_IP+':8080'+uri+'?ipv4='+ip, res => {
        let data = ''

        // called when a data chunk is received.
        res.on('data', chunk => {
            data += chunk
        })

        // called when the complete response is received.
        res.on('end', () => {
            let resJSON = JSON.parse(data)
            console.log(resJSON)
            let dpid = resJSON["switch"]["dpid"]
            console.log("Es esta la DPID? " + dpid)
        })
    })
    .on('error', err => {
        console.log('Error: ', err.message)
    })
}


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
                        //Aqui se hace la consulta para autenticación
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
                                                pool_usuarios_autenticados.query(`INSERT INTO usuarios_autenticados.usuario_autenticado (idUsuario_Autenticado,Dispositivo_dispositivo_MAC,diferenciador,switch_MAC,IP,Facultad_facultad_ID,Rol_idROL) 
                                                                                VALUES ("${req.body.user}","${req.body.mac}","0","00:00:00:00:01:01","${req.body.ip}","${result[0]["Facultad_idFacultad"]}","${result[0]["Rol_idRol"]}")`,
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
                            "error":"debe ingresar su usuario y contraseña"
                        })
                    }
                }
                break
            case "sign out":
                if(req.body.user!=null){
                    pool_para_autenticar.query(`SELECT * FROM usuarios_autenticados.usuario_autenticado where idUsuario_Autenticado = "${req.body.user}"`,(err,result,fields)=>{
                        if(err == null){
                            if(result.length != 0){
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
                            }else{
                                res.json({
                                    "status":"error",
                                    "error":"El usuario no esta autenticado"
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
                } else {
                    res.json({
                        "status":"error",
                        "error":"debe ingresar el usuario que debe desloguearse"
                    })
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
    pool_servicios

})

app.post("/services",(req,res) => {

})

app.put("/services", (req,res) => {

})

app.delete("/services", (req,res) => {
    
})




app.listen(process.env.PORT, ()=>{
    console.log(`Se levanto un servidor API-REST en el puerto ${process.env.PORT}`)
})


