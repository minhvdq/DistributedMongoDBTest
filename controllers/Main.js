const mainRouter = require('express').Router()
const IdenFace = require('../models/IdenFace')
const UnknownFace = require('../models/UnknownFace')

mainRouter.post('', async(req, res) => {
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

module.exports = mainRouter