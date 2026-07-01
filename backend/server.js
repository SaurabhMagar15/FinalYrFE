



const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const Donor = require("./database/schema/Donor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const DonorLogin = require("./database/schema/loginDonor");
const Ngo = require("./database/schema/ngo");
const Volunteer = require("./database/schema/volunteer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());


const mongoURI = 'mongodb+srv://saurabh:saurabh1771@cluster0.lq6uf.mongodb.net/?appName=Cluster0';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// API Endpoints
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key";

// Auth: Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, contact, password, role, registrationId, location } = req.body;
    if (!name || !email || !contact || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let Model;
    if (role === 'donor') Model = DonorLogin;
    else if (role === 'ngo') Model = Ngo;
    else if (role === 'volunteer') Model = Volunteer;
    else return res.status(400).json({ error: "Invalid role" });

    const existingUser = await Model.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists with this email" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = { name, email, contact, password: hashedPassword, role };
    if (role === 'ngo') {
      if (!registrationId) return res.status(400).json({ error: "Registration ID is required for NGOs" });
      userData.registrationId = registrationId;
      userData.location = location;
    }
    if (role === 'volunteer') {
      userData.location = location;
      userData.availability = req.body.availability || "Anytime";
    }

    const newUser = new Model(userData);
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// Auth: Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let Model;
    if (role === 'donor') Model = DonorLogin;
    else if (role === 'ngo') Model = Ngo;
    else if (role === 'volunteer') Model = Volunteer;
    else return res.status(400).json({ error: "Invalid role" });

    const user = await Model.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const payload = {
      userId: user._id,
      role: user.role,
      name: user.name,
      email: user.email
    };

    // Additional fields for frontend state
    if (role === 'donor') payload.points = user.points;
    if (role === 'ngo') payload.registrationId = user.registrationId;

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    const userObject = user.toObject();
    delete userObject.password;

    res.status(200).json({ message: "Login successful", token, user: userObject });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// GET: Fetch volunteers
app.get("/api/volunteers", async (req, res) => {
  try {
    const volunteers = await Volunteer.find().select("-password");
    res.status(200).json(volunteers);
  } catch (error) {
    console.error("Fetch volunteers error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Stats
app.get("/api/stats/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await DonorLogin.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const totalDonations = await Donor.countDocuments({ "donorName": user.name, "contactNumber": user.contact });

    res.status(200).json({ points: user.points, totalDonations });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Redeem
app.post("/api/redeem", async (req, res) => {
  try {
    const { email, cost } = req.body;
    const user = await DonorLogin.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.points < cost) return res.status(400).json({ error: "Insufficient points" });

    user.points -= cost;
    await user.save();
    res.status(200).json({ message: "Redeemed successfully", points: user.points });
  } catch (err) {
    console.error("Redeem error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Fetch all donors
app.get("/api/donors", async (req, res) => {
  try {
    const donors = await Donor.find({}).lean();

    // Convert image buffer to base64 string
    const processedDonors = donors.map(donor => ({
      ...donor,
      donation: {
        ...donor.donation,
        foodImage: donor.donation.foodImage ? {
          image: donor.donation.foodImage.image.toString("base64"),
          contentType: donor.donation.foodImage.contentType
        } : null
      },
      _id: donor._id.toString(),
      createdAt: donor.createdAt.toISOString()
    }));

    res.status(200).json(processedDonors);
  } catch (error) {
    console.error("Error fetching donors:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// POST: Create new donation
app.post("/api/donations", upload.single("foodImage"), async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = [
      'donorName',
      'contactNumber',
      'donorType',
      'foodFor',
      'address',
      'latitude',
      'longitude'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Process image upload if provided
    const foodImageData = req.file ? {
      image: req.file.buffer,
      contentType: req.file.mimetype
    } : null;

    // Construct donation data
    const donationData = {
      foodFor: req.body.foodFor,
      foodType: req.body.foodFor === "humans" ? req.body.foodType : "Not applicable",
      quantity: req.body.foodFor === "humans" ? req.body.quantity : "Not applicable",
      foodImage: foodImageData
    };

    // Add points to DonorLogin if email is provided
    if (req.body.email) {
      const donorLoginUser = await DonorLogin.findOne({ email: req.body.email });
      if (donorLoginUser) {
        donorLoginUser.points += 50; // Give 50 points per donation
        await donorLoginUser.save();
      }
    }

    // Create new donor document
    const newDonation = new Donor({
      donorName: req.body.donorName,
      donorEmail: req.body.email, // Explicitly linking to the logged-in Donor profile
      contactNumber: req.body.contactNumber,
      donorType: req.body.donorType,
      donation: donationData,
      location: {
        address: req.body.address,
        coordinates: {
          latitude: parseFloat(req.body.latitude),
          longitude: parseFloat(req.body.longitude)
        }
      }
    });

    // Save to MongoDB
    const savedDonation = await newDonation.save();

    // Convert image buffer to base64 string for response if needed
    const responseData = savedDonation.toObject();
    if (responseData.donation.foodImage) {
      responseData.donation.foodImage.image =
        responseData.donation.foodImage.image.toString("base64");
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error("Error saving donation:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// DELIVERIES & BOOKING SYSTEM
const Delivery = require("./database/schema/Delivery");

async function calculateDrivingDistance(lat1, lon1, lat2, lon2) {
  try {
    // OSRM Public API Format: {longitude},{latitude}
    const response = await fetch(`http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
    const data = await response.json();

    if (data.code === "Ok" && data.routes.length > 0) {
      // OSRM returns distance in meters, convert to KM
      return data.routes[0].distance / 1000;
    }
  } catch (err) {
    console.error("OSRM Route fetching failed, falling back to Haversine", err);
  }

  // Fallback Haversine if OSRM is down
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST: Book a volunteer
app.post("/api/deliveries/book", async (req, res) => {
  try {
    const { donationId, ngoEmail, volunteerEmail, donorLat, donorLon, ngoLat, ngoLon } = req.body;

    // Check if Donation is already assigned to prevent collision double-booking
    const donorRecord = await Donor.findById(donationId);
    if (!donorRecord) return res.status(404).json({ error: "Donor record not found" });
    if (donorRecord.bookingStatus === 'assigned') {
      return res.status(409).json({ error: "This donation has already been assigned to another pickup!" });
    }

    // Calculate REAL driving distance
    const totalDistanceKm = await calculateDrivingDistance(donorLat, donorLon, ngoLat, ngoLon) || 5;

    // Get NGO ID
    const ngo = await Ngo.findOne({ email: ngoEmail });
    if (!ngo) return res.status(404).json({ error: "NGO not found" });

    const newDelivery = new Delivery({
      donationId,
      ngoId: ngo._id,
      volunteerEmail,
      totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2))
    });

    await newDelivery.save();

    // Lock the donation
    donorRecord.bookingStatus = 'assigned';
    await donorRecord.save();

    res.status(201).json({ message: "Volunteer booked successfully", delivery: newDelivery });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ error: "Server error during booking" });
  }
});


// GET: Fetch deliveries for Volunteer
app.get("/api/deliveries/volunteer/:email", async (req, res) => {
  try {
    const deliveries = await Delivery.find({ volunteerEmail: req.params.email })
      .populate('donationId')
      .populate('ngoId', 'name contact location email')
      .sort({ createdAt: -1 });
    res.status(200).json(deliveries);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching deliveries" });
  }
});

// GET: Fetch deliveries for NGO
app.get("/api/deliveries/ngo/:email", async (req, res) => {
  try {
    const ngo = await Ngo.findOne({ email: req.params.email });
    if (!ngo) return res.status(404).json({ error: "NGO not found" });

    const deliveries = await Delivery.find({ ngoId: ngo._id })
      .populate('donationId')
      .sort({ createdAt: -1 });

    res.status(200).json(deliveries);
  } catch (err) {
    res.status(500).json({ error: "Server error fetching deliveries" });
  }
});

// GET: Fetch deliveries for a specific Donor
app.get("/api/deliveries/donor/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await DonorLogin.findOne({ email });
    if (!user) return res.status(404).json({ error: "Donor user not found" });

    // Find all donation records for this user based strictly on their exact registered email
    let donations = await Donor.find({ donorEmail: email }).lean();

    // Legacy fallback for donations made before the donorEmail field was added
    if (!donations || donations.length === 0) {
      donations = await Donor.find({ "donorName": user.name, "contactNumber": user.contact }).lean();
    }

    const donationIds = donations.map(d => d._id);

    const Delivery = require('./database/schema/Delivery');
    const Volunteer = require('./database/schema/volunteer');

    // Find all deliveries tied to these donations
    const deliveries = await Delivery.find({ donationId: { $in: donationIds } })
      .populate('donationId')
      .populate('ngoId', 'name contact location email')
      .sort({ createdAt: -1 })
      .lean();

    // Attach volunteer details since volunteerEmail is not an ObjectId
    for (let delivery of deliveries) {
      if (delivery.volunteerEmail) {
        const vol = await Volunteer.findOne({ email: delivery.volunteerEmail }).select('name contact');
        if (vol) {
          delivery.volunteerDetails = {
            name: vol.name,
            contact: vol.contact
          };
        }
      }
    }

    // Find donations that have NOT been assigned to any delivery yet
    const unassignedDonations = donations.filter(donorData =>
      !deliveries.some(del => del.donationId._id.toString() === donorData._id.toString())
    );

    // Map unassigned donations into a structure identical to a delivery so the frontend doesn't crash
    const mappedUnassigned = unassignedDonations.map(donorData => ({
      _id: donorData._id, // using the donation ID as the delivery ID temporarily
      donationId: donorData,
      status: 'unassigned', // custom status for the UI
      pickupStatus: 'pending',
      ngoId: { name: 'Awaiting NGO Acceptance' },
      createdAt: donorData.createdAt
    }));

    // Combine them, sort chronologically, and send back
    const combined = [...mappedUnassigned, ...deliveries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(combined);
  } catch (err) {
    console.error("Fetch donor deliveries error:", err);
    res.status(500).json({ error: "Server error fetching donor deliveries" });
  }
});

// POST: Donor verifies Pickup OTP
app.post("/api/deliveries/verify-pickup", async (req, res) => {
  try {
    const { deliveryId, pickupOtp } = req.body;
    const delivery = await Delivery.findById(deliveryId);

    if (!delivery) return res.status(404).json({ error: "Delivery not found" });
    if (delivery.pickupStatus === 'picked_up') return res.status(400).json({ error: "Already picked up" });
    if (delivery.status !== 'accepted') return res.status(400).json({ error: "Volunteer has not accepted this yet" });

    if (delivery.pickupOtp !== String(pickupOtp)) {
      return res.status(400).json({ error: "Invalid Pickup OTP." });
    }

    delivery.pickupStatus = 'picked_up';
    await delivery.save();

    res.status(200).json({ message: "Pickup Verified Successfully!" });
  } catch (error) {
    console.error("Pickup verification error:", error);
    res.status(500).json({ error: "Server error verifying pickup OTP" });
  }
});

// POST: Volunteer responds to booking (accept/reject)
app.post("/api/deliveries/respond", async (req, res) => {
  try {
    const { deliveryId, status, rejectionReason } = req.body;
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ error: "Booking not found" });

    if (status === 'rejected') {
      delivery.status = 'rejected';
      delivery.rejectionReason = rejectionReason;
    } else if (status === 'accepted') {
      delivery.status = 'accepted';
      // Generate 6-digit OTPs
      delivery.otp = Math.floor(100000 + Math.random() * 900000).toString();
      delivery.pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      delivery.pickupStatus = 'pending';
    }

    await delivery.save();
    res.status(200).json({ message: "Response recorded", delivery });
  } catch (error) {
    res.status(500).json({ error: "Server error responding to booking" });
  }
});

// POST: Volunteer verifies OTP & Uploads Proof of Delivery
app.post("/api/deliveries/verify-otp", upload.single("proofImage"), async (req, res) => {
  try {
    const { deliveryId, otp } = req.body;
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ error: "Booking not found" });

    if (delivery.status !== 'accepted') {
      return res.status(400).json({ error: "Booking is not in accepted state" });
    }

    if (delivery.failedAttempts >= 3) {
      delivery.status = 'failed';
      await delivery.save();
      return res.status(403).json({ error: "Maximum OTP attempts exceeded. Booking failed." });
    }

    if (delivery.otp !== String(otp)) {
      delivery.failedAttempts += 1;
      await delivery.save();
      return res.status(400).json({ error: `Invalid OTP. ${3 - delivery.failedAttempts} attempts remaining.` });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Proof of Delivery photo is required!" });
    }

    // OTP Correct & Photo provided! Complete delivery and award points
    delivery.status = 'completed';
    delivery.proofOfDelivery = {
      image: req.file.buffer.toString("base64"),
      contentType: req.file.mimetype
    };
    await delivery.save();

    const pointsEarned = Math.floor(delivery.totalDistanceKm * 10) || 50; // Fallback to 50 if somehow 0
    const volunteer = await Volunteer.findOne({ email: delivery.volunteerEmail });
    if (volunteer) {
      volunteer.points += pointsEarned;
      await volunteer.save();
    }

    res.status(200).json({
      message: "Delivery verified and photo uploaded! Points awarded.",
      pointsEarned,
      newTotalPoints: volunteer ? volunteer.points : 0
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ error: "Server error verifying OTP" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
