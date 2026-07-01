// const mongoose = require("mongoose");
// // import mongoose from "mongoose";

// const DonorSchema = new mongoose.Schema({
//   donorName: { type: String, required: true },
//   contactNumber: { type: String, required: true },
//   donorType: {
//     type: String,
//     enum: ["individual", "restaurant", "event_organization"],
//     required: true,
//   },
//   donation: {
//     foodFor: {
//       type: String,
//       enum: ["humans", "animals"],
//       required: true,
//     },
//     foodType: {
//       type: String,
//       enum: ["veg", "nonveg"],
//       default: "Not applicable",
//     },
//     quantity: {
//       type: String,
//       default: "Not applicable",
//     },
//     foodImage: {
//       image: Buffer, // Store image as binary data
//       contentType: String, // URL or file path after upload
//     },
//   },
//   location: {
//     address: { type: String, required: true },
//     coordinates: {
//       latitude: { type: Number, required: true },
//       longitude: { type: Number, required: true },
//     },
//   },
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model("Donor", DonorSchema);

const mongoose = require("mongoose");

const DonorSchema = new mongoose.Schema({
  donorName: { type: String, required: true },
  donorEmail: { type: String },
  contactNumber: { type: String, required: true },
  donorType: {
    type: String,
    enum: ["individual", "restaurant", "event_organization"],
    required: true,
  },
  donation: {
    foodFor: {
      type: String,
      enum: ["humans", "animals"],
      required: true,
    },
    foodType: {
      type: String,
      enum: ["veg", "nonveg"],
      default: "Not applicable",
    },
    quantity: {
      type: String,
      default: "Not applicable",
    },
    foodImage: {
      image: Buffer, // Stores binary data
      contentType: String, // MIME type
    },
  },
  location: {
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
  },
  bookingStatus: {
    type: String,
    enum: ["pending", "assigned"],
    default: "pending",
  },
  expiryHours: {
    type: Number, // Donors can specify how long food is valid
    default: 12, // Defaulting to 12 hours if unspecified
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Donor", DonorSchema);
