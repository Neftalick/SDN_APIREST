const express = require('express')
const path = require("path")
const dotenv = require("dotenv")
const bodyParser = require("body-parser")
const pool = require("./pools")
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
        switch(req.body.msg){
            case "status":
                if(req.body.ip != null && req.body.mac != null){
                    //Aqui se hace la consulta a la base de datos 

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
            "error":"la accion establecida no esta disponible o "
        })
    }
})
app.listen(process.env.PORT, ()=>{
    console.log(`Se levanto un servidor API-REST en el puerto ${process.env.PORT}`)
})


