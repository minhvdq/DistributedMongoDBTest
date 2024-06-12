const express = require('express');
require('dotenv').config()
const app = express();
const axios = require('axios')
const serverVariables = require('./serverVariables')
const mongoose = require('mongoose')
const IdenFace = require('./models/IdenFace')
const UnknownFace = require('./models/UnknownFace')
const middlewares = require('./utils/middlewares')

const faceRouter = require('./controllers/Face');
const mainRouter = require('./controllers/Main');
const zkClient = require('./cluster/zooFunc')

const PORT = process.argv[2] || 3000;
serverVariables.port = PORT
const tableName = process.argv[3]
const mongodbPass = process.env.MONGODB_PASS

console.log('table name is ', tableName)
console.log('password is: ', mongodbPass)


const mongodbUrl = `mongodb+srv://fullstack:${mongodbPass}@cluster0.vzqds2z.mongodb.net/${tableName}?retryWrites=true&w=majority&appName=Cluster0`


// const role = PORT == 3000 ? "master" : "slave"
// serverVariables.role = role
// serverVariables.master = 'localhost:3000'

console.log(`running server on port ${PORT} as a ${serverVariables.role}`)
console.log(`connecting to MongoDB`)

mongoose.set('strictQuery', false)

mongoose.connect(mongodbUrl).then(result => {
    console.log(`connected to MongoDB`, mongodbUrl)
}).catch(error => console.log(error.message))


zkClient.connect()


// if( role  === 'slave' ){
//     console.log('connecting to master')
//     if( serverVariables.master === '' ){
//         console.log('master is null')
//     }

//     axios({
//         method: "post",
//         url: `http://${serverVariables.master}/connect`,
//         data: {
//             port: `${PORT}`,
//             // address: `${server.address().address}`
//         }
//     })
// }

app.use(express.json())
app.use(middlewares.requestLogger)
app.use(middlewares.tokenExtractor)

app.use('/face', faceRouter )

app.get( '/status', (req, res) => {
    res.status(200).send(`server is runnig stably on port ${serverVariables.port} as a ${serverVariables.role}`)
})

app.post( '/connect', async( req, res ) => {
    const reqPort = req.socket.remotePort
    const reqAddress = req.socket.remoteAddress

    const port = req.body.port
    const address = req.body.address

    // const ipAddress = req.ip
    //console.log(`the request: ${JSON.stringify(req)}`)

    // console.log(`ip address is ${ipAddress}`)

    const reqUrl = `http://localhost:${port}`

    serverVariables.slaves.push(reqUrl)

    console.log(`current slaves contain ${serverVariables.slaves}`)

    res.status(200).send(`${reqUrl} saved`)
})

app.get('/connect', (req, res) => {
    res.status(200).json(serverVariables.slaves)
})

app.get('/role', (req, res) => {
    res.status(200).send(serverVariables.role)
})

app.get('/master', (req, res) => {
    res.status(200).send(serverVariables.master)
})

app.use( '/', mainRouter)

app.post( '/clearall', async( req, res ) => {
    await IdenFace.deleteMany({})
    await UnknownFace.deleteMany({})
    res.status(200).send("successfully delete everything in table")
})

app.use(middlewares.unknownEndpoint)
app.use(middlewares.errorHandler)

let server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});