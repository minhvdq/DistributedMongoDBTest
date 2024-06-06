const express = require('express');
require('dotenv').config()
const app = express();
const axios = require('axios')
const serverVariables = require('./serverVariables')
const mongoose = require('mongoose')

const PORT = process.argv[2] || 3000;
const tableName = process.argv[3]
const mongodbPass = process.env.MONGODB_PASS
const IdenFace = require('./models/IdenFace')
const UnknownFace = require('./models/UnknownFace')
const middlewares = require('./utils/middlewares')
console.log('table name is ', tableName)
console.log('password is: ', mongodbPass)
const mongodbUrl = `mongodb+srv://fullstack:${mongodbPass}@cluster0.vzqds2z.mongodb.net/${tableName}?retryWrites=true&w=majority&appName=Cluster0`


const role = PORT == 3000 ? "master" : "slave"

console.log(`running server on port ${PORT} as a ${role}`)
console.log(`connecting to MongoDB`)

mongoose.set('strictQuery', false)

mongoose.connect(mongodbUrl).then(result => {
    console.log(`connected to MongoDB`, mongodbUrl)
}).catch(error => console.log(error.message))



let server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

if( role  === 'slave' ){
    console.log('connecting to master')

    axios({
        method: "post",
        url: "http://localhost:3000/connect",
        data: {
            port: `${PORT}`,
            address: `${server.address().address}`
        }
    })
}

app.use(express.json())
app.use(middlewares.requestLogger)
app.use(middlewares.tokenExtractor)

app.get('/iden', async (req, res) => {
    const data = await IdenFace.find({})
    res.json(data)
});

app.get('/unknown', async (req, res) => {
    const data = await UnknownFace.find({})
    res.json(data)
});

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

app.post( '/', async( req, res ) => {
    const body = req.body
    if( ! body.Track_ID ) {
        res.status(400).send( "track ID is needed")
    }
    let findIden = await IdenFace.findOneAndUpdate({Track_ID: body.Track_ID }, {Atribute: body.Atribute})
    let findUnknown = await UnknownFace.findOneAndUpdate({Track_ID: body.Track_ID }, {Atribute: body.Atribute})

    console.log(`the iden face is ${findIden}`)
    console.log(`the unknown face is ${findUnknown}`)
    let savedFace
    if(!findIden && !findUnknown ){    
        if( body.FacesVector ){
            //save to the Identify_Face db
            const newFace = new IdenFace ({
                Track_ID: body.Track_ID,
                Name: body.Name,
                FacesVector: body.FacesVector,
                Atribute: body.Atribute
            })

            savedFace = await newFace.save()
        }else{
            const newFace = new UnknownFace({
                Track_ID: body.Track_ID,
                Name: body.Name,
                Atribute: body.Atribute
            })

            savedFace = await newFace.save()
        }
    }

    if( role === "master" ){
        const receiveAddress = req.socket.remoteAddress
        const receivePort = req.socket.remotePort

        const receiveUrl = body.from ? `http://localhost:${body.from}` : 'nothing'

        for( let slaveUrl of serverVariables.slaves ){
            if( slaveUrl !== receiveUrl ){
                await axios.post( slaveUrl, {...body, from: "master"} )
            }
        }
    }else{
        if( !( body.from && body.from === 'master') ){
            await axios.post( `http://localhost:${serverVariables.master}`, {...body, from: {PORT} } )
        }
    }

    res.status(200).json(savedFace)
    
})

app.post( '/clearall', async( req, res ) => {
    await IdenFace.deleteMany({})
    await UnknownFace.deleteMany({})
    res.status(200).send("successfully delete everything in table")
})

app.use(middlewares.unknownEndpoint)
app.use(middlewares.errorHandler)