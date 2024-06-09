const UnknownFace = require('../models/UnknownFace')
const IdenFace = require('../models/IdenFace')

const faceRouter = require('express').Router()

faceRouter.get('/iden', async(req, res) => {
    const data = await IdenFace.find({})
    res.json(data)
})

faceRouter.get('/unknown', async(req, res) => {
    const data = await UnknownFace.find({})
    res.json(data)
})

module.exports = faceRouter