const mainRouter = require('express').Router()
const IdenFace = require('../models/IdenFace')
const UnknownFace = require('../models/UnknownFace')
const serverVariables = require('../serverVariables')
const axios = require('axios')

mainRouter.post('', async(req, res) => {
    // if( !serverVariables.role || !serverVariables.slaves || serverVariables.slaves.isEmpty()){
    //     res.status(400).send('server is not ready or unavailable')
    // }
    const body = req.body
    if( ! body.Track_ID ) {
        res.status(400).send( "track ID is undefined" )
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

    if( serverVariables.role === "master" ){
        const receiveAddress = req.socket.remoteAddress
        const receivePort = req.socket.remotePort

        const receiveUrl = body.from ? `http://localhost:${body.from}` : 'nothing'

        for( let slave of serverVariables.slaves ){
            const slaveUrl = `http://${slave}`
            if( slaveUrl !== receiveUrl ){
                const newBody = {...body, from: 'master'}
                console.log('sending to slaves', newBody)
                await axios.post( slaveUrl, {...body, from: "master"} )
            }
        }
    }else{
        if( !( body.from && body.from === 'master') ){
            await axios.post( `http://${serverVariables.master}`, {...body, from: serverVariables.port } )
        }
    }

    res.status(200).json(savedFace)
})

module.exports = mainRouter