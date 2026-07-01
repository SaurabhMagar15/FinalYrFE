const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
    donationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Donor",
        required: true
    },
    ngoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ngo",
        required: true
    },
    volunteerEmail: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "completed", "failed"],
        default: "pending"
    },
    rejectionReason: {
        type: String,
        default: ""
    },
    otp: {
        type: String,
        // Generated when accepted
    },
    pickupOtp: {
        type: String,
        // Generated when accepted, for the donor to verify pickup
    },
    pickupStatus: {
        type: String,
        enum: ["pending", "picked_up"],
        default: "pending"
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    totalDistanceKm: {
        type: Number,
        required: true
    },
    proofOfDelivery: {
        image: {
            type: String // Storing base64 encoded string
        },
        contentType: {
            type: String // Storing image MIME type
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.Delivery || mongoose.model("Delivery", deliverySchema);
