"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Clock, CheckCircle, XCircle, Search, BadgeCheck, Loader2, Award, AlertTriangle, Camera, Upload, Radio } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "@/components/shared/Navbar";
import { useRouter } from "next/navigation";

const ExpiryTimer = ({ donation }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!donation || !donation.createdAt) return;

    // Default to 12 if not provided by older documents
    const hours = donation.expiryHours || 12;
    const expiryTime = new Date(donation.createdAt).getTime() + hours * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("EXPIRED");
        setExpired(true);
      } else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [donation]);

  return (
    <div className={`mt-3 py-2 px-3 rounded-lg flex items-center justify-center space-x-2 border font-mono font-bold ${expired ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' : 'bg-orange-50 text-orange-800 border-orange-200'}`}>
      <Clock className={`h-4 w-4 ${expired ? 'text-red-600' : 'text-orange-500'}`} />
      <span>{expired ? 'FOOD DONATION EXPIRED' : `Expires in: ${timeLeft}`}</span>
    </div>
  );
};

export default function VolunteerDashboard() {
  const [user, setUser] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        toast.error("Please login first.");
        router.push("/login");
        return;
      }
      const userData = JSON.parse(userStr);
      if (userData.role !== "volunteer") {
        toast.error("Unauthorized access.");
        router.push("/login");
        return;
      }
      setUser(userData);
      fetchDeliveries(userData.email);
    };

    fetchUserData();
  }, [router]);

  // Set up 10-second polling for live updates on SOS and Active runs
  useEffect(() => {
    let interval;
    if (user) {
      interval = setInterval(() => {
        fetchDeliveries(user.email);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [user]);

  const fetchDeliveries = async (email) => {
    try {
      // 1. Fetch personal deliveries
      const res = await fetch(`http://localhost:5000/api/deliveries/volunteer/${email}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data);
      }

    } catch (err) {
      console.error("Network error sync:", err);
    } finally {
      // Small timeout to prevent loading flicker on fast intervals
      setTimeout(() => setLoading(false), 300);
    }
  };

  const activeDeliveries = deliveries.filter(d => d.status === "accepted");
  const pendingDeliveries = deliveries.filter(d => d.status === "pending");
  const historyDeliveries = deliveries.filter(d => ["completed", "rejected", "failed"].includes(d.status));

  const respondToBooking = async (deliveryId, status) => {
    if (status === "rejected" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/deliveries/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId, status, rejectionReason })
      });

      if (res.ok) {
        toast.success(`Booking ${status}!`);
        setRejectingId(null);
        setRejectionReason("");
        fetchDeliveries(user.email);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to respond");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };


  const verifyOTP = async (deliveryId) => {
    if (otpInput.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }
    if (!proofImage) {
      toast.error("Please provide a Proof of Delivery photo!");
      return;
    }

    const formData = new FormData();
    formData.append("deliveryId", deliveryId);
    formData.append("otp", otpInput);
    formData.append("proofImage", proofImage);

    toast.loading("Verifying Dropoff...", { id: "verifyOTP" });

    try {
      const res = await fetch("http://localhost:5000/api/deliveries/verify-otp", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Delivery Completed! Earned ${data.pointsEarned} points.`, { id: "verifyOTP" });
        setOtpInput("");
        setProofImage(null);
        const updatedUser = { ...user, points: data.newTotalPoints };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser)); // Sync state
        fetchDeliveries(user.email);
      } else {
        toast.error(data.error || "Invalid OTP", { id: "verifyOTP" });
        fetchDeliveries(user.email); // Refresh to update failed attempts tracker
      }
    } catch (err) {
      toast.error("Network error", { id: "verifyOTP" });
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header Dashboard Map */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 rounded-bl-full -z-10 opacity-50"></div>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Volunteer Hub</h1>
                <p className="mt-2 text-lg text-gray-600">Welcome back, {user.name}!</p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <Award className="h-8 w-8 text-orange-500" />
                  <span className="text-3xl font-bold text-orange-600">{user.points || 0}</span>
                </div>
                <p className="text-sm font-medium text-gray-500">Total Points</p>
                <button
                  onClick={() => router.push('/redeem')}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Redeem Store
                </button>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">

            {/* Active Run / Action Center */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Navigation className="mr-2" /> Active Deliveries
              </h2>

              {activeDeliveries.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500 border-2 border-dashed border-gray-200">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>You have no active runs right now.</p>
                </div>
              ) : (
                activeDeliveries.map(delivery => (
                  <motion.div
                    key={delivery._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-lg border-l-4 border-green-500 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-2">
                            In Progress
                          </span>
                          <h3 className="text-lg font-bold">Delivery to {delivery.ngoId.name}</h3>
                          <p className="text-sm text-gray-500">{delivery.totalDistanceKm} km trip</p>

                          {/* Live Expiry Countdown */}
                          <ExpiryTimer donation={delivery.donationId} />
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${delivery.donationId.location.coordinates.latitude},${delivery.donationId.location.coordinates.longitude}&destination=${delivery.ngoId.location.coordinates.latitude},${delivery.ngoId.location.coordinates.longitude}`}
                          target="_blank"
                          className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium transition"
                        >
                          <Navigation className="h-4 w-4 mr-1" /> Navigate
                        </a>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pickup (Donor)</p>
                          <p className="font-medium">{delivery.donationId.donorName}</p>
                          <p className="text-sm text-gray-600 truncate">{delivery.donationId.location.address}</p>
                          <p className="text-sm text-gray-600 font-mono mt-1">{delivery.donationId.contactNumber}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <p className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">Dropoff (NGO)</p>
                          <p className="font-medium text-orange-900">{delivery.ngoId.name}</p>
                          <p className="text-sm text-orange-700 truncate">{delivery.ngoId.location.address}</p>
                          <p className="text-sm text-orange-700 font-mono mt-1">{delivery.ngoId.contact}</p>
                        </div>
                      </div>

                      {delivery.pickupStatus === 'pending' ? (
                        <div className="bg-blue-50 mt-6 p-6 rounded-xl border border-blue-200 text-center shadow-inner">
                          <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2">Drive to Donor Pickup</h4>
                          <p className="text-gray-700 mb-4 text-sm font-medium">When you arrive, provide this secure Pickup OTP to the Donor. They will verify it on their dashboard to release the food.</p>
                          <div className="bg-white px-6 py-4 rounded-lg shadow-sm inline-block">
                            <span className="text-4xl font-black text-blue-600 tracking-[0.2em]">{delivery.pickupOtp}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 mt-6 p-6 rounded-xl border border-green-200 text-center shadow-inner">
                          <h4 className="text-sm font-bold text-green-800 mb-3 uppercase tracking-widest">Arrived at NGO? Verifying Dropoff...</h4>

                          {/* Camera Upload Section */}
                          <div className="mb-4">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-green-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-green-100 transition">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                <svg className="w-8 h-8 mb-2 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                </svg>
                                <p className="mb-1 text-sm font-bold text-green-700">
                                  {proofImage ? proofImage.name : "Click to Upload Photo Proof"}
                                </p>
                                <p className="text-xs text-green-600">Capture the handover (PNG, JPG)</p>
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                capture="environment" /* Suggests mobile back camera */
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setProofImage(e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>

                          <div className="flex justify-center flex-wrap gap-2">
                            <input
                              type="text"
                              maxLength="6"
                              placeholder="Enter NGO Dropoff OTP"
                              className="px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center font-mono tracking-widest text-lg w-64 uppercase bg-white"
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                            />
                            <button
                              onClick={() => verifyOTP(delivery._id)}
                              className={`px-6 py-3 rounded-lg font-bold transition flex items-center shadow-md ${(!proofImage || otpInput.length !== 6) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                              disabled={!proofImage || otpInput.length !== 6}
                            >
                              <BadgeCheck className="mr-2" /> Verify OTP & Photo
                            </button>
                          </div>
                          {delivery.failedAttempts > 0 && (
                            <p className="text-red-500 text-sm mt-3 font-bold bg-white inline-block px-3 py-1 rounded">Warning: {delivery.failedAttempts}/3 failed attempts.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Incoming Bookings Panel */}
            <div className="space-y-6">


              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="mr-2 h-5 w-5" /> Pending Requests
              </h2>

              {pendingDeliveries.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
                  <p className="text-sm">No incoming booking requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDeliveries.map(delivery => (
                    <div key={delivery._id} className="bg-white rounded-xl shadow p-5 border border-orange-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded">New Request</span>
                        <span className="text-xs text-gray-500">{delivery.totalDistanceKm} km</span>
                      </div>
                      <h4 className="font-bold text-gray-900 line-clamp-1">{delivery.ngoId.name}</h4>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-1">Pickup from: {delivery.donationId.location.address}</p>

                      {rejectingId === delivery._id ? (
                        <div className="space-y-2 mt-2">
                          <input
                            type="text"
                            placeholder="Reason for rejection (e.g. Too far, Busy)"
                            className="w-full text-sm border p-2 rounded focus:ring-1 focus:ring-red-500 outline-none"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => respondToBooking(delivery._id, "rejected")}
                              className="flex-1 bg-red-600 text-white text-xs py-2 rounded font-bold hover:bg-red-700"
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                              className="flex-1 bg-gray-200 text-gray-700 text-xs py-2 rounded font-bold hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => respondToBooking(delivery._id, "accepted")}
                            className="flex-1 bg-green-600 text-white flex items-center justify-center text-sm py-2 rounded hover:bg-green-700 transition"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Accept
                          </button>
                          <button
                            onClick={() => setRejectingId(delivery._id)}
                            className="flex-1 bg-red-100 text-red-700 flex items-center justify-center text-sm py-2 rounded hover:bg-red-200 transition"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* History Mini-Panel */}
              {historyDeliveries.length > 0 && (
                <div className="mt-8 mb-8">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Recent History</h3>
                  <div className="space-y-4">
                    {historyDeliveries.slice(0, 5).map(delivery => (
                      <div key={delivery._id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-gray-900 truncate pr-2">{delivery.ngoId.name}</p>
                            <p className="text-xs text-gray-500">{new Date(delivery.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            {delivery.status === 'completed' && <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">Completed</span>}
                            {delivery.status === 'rejected' && <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md">Rejected</span>}
                            {delivery.status === 'failed' && <span className="px-2.5 py-1 bg-gray-800 text-gray-100 text-xs font-bold rounded-md">Failed</span>}
                          </div>
                        </div>

                        {/* Visionary Feature: Biogas Deflection */}
                        {(delivery.status === 'failed' || delivery.status === 'rejected') && (
                          <div className="mt-2 pt-3 border-t border-dashed border-gray-200">
                            <p className="text-xs font-bold text-gray-500 mb-2">Food Viability Lost. Route waste to sustainable disposal:</p>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${delivery.donationId.location.coordinates.latitude},${delivery.donationId.location.coordinates.longitude}&destination=${19.0760},${72.8777}`}
                              target="_blank"
                              className="w-full flex items-center justify-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 p-2 rounded-lg text-sm font-bold transition border border-green-200"
                            >
                              <MapPin className="w-4 h-4" />
                              <span>Navigate to Nearest Biogas Plant</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}