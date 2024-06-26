const mongoose = require('mongoose')

const idenFaceSchema = new mongoose.Schema({
    Track_ID: {
        type: Number,
        required: true,
        unique: true
    },
    Name: {
        type: String, 
        required: true
    },
    FacesVector: {
        type: String,
        required: true
    },
    Atribute: {
        type: String,
        required: true
    },
    Version:{
        type: Number,
        required: true
    }
})

mongoose.set('toJSON', {
    transform: (doc,ret)=> {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
    }
})


module.exports = mongoose.model('IdenFace', idenFaceSchema)