
const mongoose = require("mongoose");

const ngoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    contact: {
        type: Number,
        required: true
    },
    registrationId: {
        type: String,
        required: true,
        unique: true
    },
    password: { // Changed to lowercase 'password' for consistency
        type: String,
        required: true
    },
    location: {
        address: { type: String },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        }
    },
    role: {
        type: String,
        default: 'ngo'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Ngo', ngoSchema);