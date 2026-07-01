"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Clock, CheckSquare, X, Map as MapIcon, Users, List, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Navbar from "@/components/shared/Navbar";
import { useRouter } from "next/navigation";

// Next.js dynamic import strictly disabling SSR for Leaflet Maps
const NgoMap = dynamic(() => import("../../components/Maps/NgoMap"), {
  ssr: false,
  loading: () => <div className="h-96 w-full animate-pulse bg-orange-100 flex items-center justify-center rounded-xl text-orange-400 font-bold tracking-widest">LOADING SATELLITE FEED...</div>
});

const NGOTab = () => {
  const router = useRouter();
  // State for active tab and expanded card indices
  const [activeTab, setActiveTab] = useState("donors");
  const [expandedDonorIndex, setExpandedDonorIndex] = useState(null);
  const [expandedVolunteerIndex, setExpandedVolunteerIndex] = useState(null);
  const [expandedPlantIndex, setExpandedPlantIndex] = useState(null);

  // State for donor data, loading and error management
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [volunteers, setVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);

  // Deliveries & Booking states
  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [bookingModal, setBookingModal] = useState({ isOpen: false, volunteerEmail: null });
  const [selectedDonation, setSelectedDonation] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userLocation, setUserLocation] = useState(null);

  // Track current user email and validate role
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      toast.error("Please login to access the NGO Dashboard");
      router.push("/login");
      return;
    }

    const u = JSON.parse(userStr);
    if (u.role !== "ngo") {
      toast.error("Unauthorized! This dashboard is for NGOs only.");
      router.push("/login"); // Force eviction if they spoofed the URL
      return;
    }

    setUserEmail(u.email);
    if (u.location && u.location.coordinates) {
      setUserLocation(u.location.coordinates);
    }
  }, [router]);

  // Fetch donors from the backend API
  const fetchDonors = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/donors");
      if (!response.ok) {
        throw new Error("Failed to fetch donors");
      }
      const data = await response.json();
      setDonors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "donors" || activeTab === "deliveries") {
      fetchDonors();
    }
  }, [activeTab]);

  // Fetch volunteers from backend when "volunteers" tab is active
  useEffect(() => {
    const fetchVolunteers = async () => {
      setLoadingVolunteers(true);
      try {
        const response = await fetch("http://localhost:5000/api/volunteers");
        if (!response.ok) {
          throw new Error("Failed to fetch volunteers");
        }
        const data = await response.json();
        setVolunteers(data);
      } catch (err) {
        console.error("Error fetching volunteers:", err);
      } finally {
        setLoadingVolunteers(false);
      }
    };

    if (activeTab === "volunteers") {
      fetchVolunteers();
    }
  }, [activeTab]);

  // Fetch deliveries with active polling every 10 seconds
  const fetchDeliveries = async () => {
    if (!userEmail) return;
    setLoadingDeliveries(true);
    try {
      const res = await fetch(`http://localhost:5000/api/deliveries/ngo/${userEmail}`);
      if (res.ok) {
        setDeliveries(await res.json());
      }
    } catch (err) {
      console.error("Error fetching deliveries:", err);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  useEffect(() => {
    let interval;
    if (activeTab === "deliveries") {
      fetchDeliveries(); // Initial fetch

      // Auto-poll to constantly get OTP updates if a Volunteer accepts
      interval = setInterval(() => {
        fetchDeliveries();
      }, 10000);
    }

    // Cleanup interval on unmount or tab switch
    return () => clearInterval(interval);
  }, [activeTab, userEmail]);

  // Booking Execution
  const handleBookVolunteer = async () => {
    if (!selectedDonation) {
      toast.error("Please select a donation to assign.");
      return;
    }

    const donor = donors.find(d => d._id === selectedDonation);
    if (!donor || !userLocation) {
      toast.error("Location data missing for booking.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/deliveries/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donationId: selectedDonation,
          ngoEmail: userEmail,
          volunteerEmail: bookingModal.volunteerEmail,
          donorLat: donor.location.coordinates.latitude,
          donorLon: donor.location.coordinates.longitude,
          ngoLat: userLocation.latitude,
          ngoLon: userLocation.longitude,
        })
      });

      if (res.ok) {
        toast.success("Volunteer booking request sent!");
        setBookingModal({ isOpen: false, volunteerEmail: null });
        setSelectedDonation("");
        setActiveTab("deliveries");
      } else {
        const errorData = await res.json();
        toast.error(`Error: ${errorData.error}` || "Failed to book volunteer");
      }
    } catch (err) {
      toast.error(`Network error during booking: ${err.message}`);
    }
  };


  const biogasPlants = [
    {
      name: "Biogas Plant 1",
      location: "Mumbai, Maharashtra",
    },
    {
      name: "Biogas Plant 2",
      location: "Delhi, Delhi",
    },
    {
      name: "Biogas Plant 3",
      location: "Bangalore, Karnataka",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-white shadow-2xl rounded-lg p-8 w-full max-w-4xl mt-4">
          <h1 className="text-4xl font-bold text-orange-600 mb-8 text-center">
            NGO Dashboard
          </h1>

          {/* Tab Navigation */}
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => setActiveTab("donors")}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "donors"
                ? "bg-orange-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-orange-100 hover:text-orange-600"
                }`}
            >
              List Donors
            </button>
            <button
              onClick={() => setActiveTab("volunteers")}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "volunteers"
                ? "bg-orange-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-orange-100 hover:text-orange-600"
                }`}
            >
              Volunteers
            </button>
            <button
              onClick={() => setActiveTab("deliveries")}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "deliveries"
                ? "bg-green-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700"
                }`}
            >
              Active Bookings
            </button>
            <button
              onClick={() => setActiveTab("biogasPlants")}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "biogasPlants"
                ? "bg-orange-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-orange-100 hover:text-orange-600"
                }`}
            >
              Biogas Plants
            </button>
          </div>

          {/* Dynamic Cards Container */}
          <div className="relative w-full min-h-[500px] bg-orange-50 rounded-2xl shadow-inner border border-orange-100 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === "donors" && (
                <motion.div
                  key="donors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 h-full flex flex-col"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-orange-700 flex items-center">
                      <MapIcon className="mr-2" /> Live Donation Radar
                    </h2>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">{donors.filter(d => d.bookingStatus !== 'assigned' && d.bookingStatus !== 'sos').length} Pending Pickups</span>
                    </div>
                  </div>

                  {donors.filter(d => d.bookingStatus !== 'assigned' && d.bookingStatus !== 'sos').length > 0 && (
                    <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border border-orange-100 overflow-x-auto flex space-x-4">
                      {donors.filter(d => d.bookingStatus !== 'assigned' && d.bookingStatus !== 'sos').map(donor => (
                        <div key={donor._id} className="flex-shrink-0 w-64 border rounded-lg p-3 bg-orange-50 relative">
                          <h4 className="font-bold text-gray-800 text-sm truncate">{donor.donorName}</h4>
                          <p className="text-xs text-gray-500 mb-2 truncate">{donor.location.address}</p>
                          <button
                            onClick={() => {
                              setSelectedDonation(donor._id);
                              setBookingModal({ isOpen: true, volunteerEmail: null });
                            }}
                            className="w-full mt-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold py-1.5 rounded flex items-center justify-center transition border border-blue-200"
                          >
                            <Users className="w-3 h-3 mr-1" /> Assign Volunteer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 w-full rounded-xl overflow-hidden min-h-[400px]">
                    <NgoMap donors={donors} volunteers={volunteers} ngoLocation={userLocation} />
                  </div>
                </motion.div>
              )}

              {activeTab === "volunteers" && (
                <motion.div
                  key="volunteers"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6"
                >
                  <h2 className="text-2xl font-bold text-orange-700 mb-6 flex items-center">
                    <Users className="mr-2" /> Available Volunteers fleet
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {volunteers.map((volunteer, index) => (
                      <li key={index} className="bg-white p-5 rounded-xl shadow-sm border border-orange-100 transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              {volunteer.name}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 mt-1">
                              {volunteer.availability || "Anytime"}
                            </span>
                            <p className="text-sm text-gray-500 mt-2 flex items-center"><MapIcon className="w-3 h-3 mr-1" /> {volunteer.location?.address || "Location unavailable"}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-orange-500 flex flex-col items-end">
                              <span className="text-xl font-bold">{volunteer.points || 0}</span>
                              Points
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2 pt-3 border-t border-gray-100">
                          <button
                            className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold border"
                            onClick={() => window.open(`https://www.google.com/maps?q=${volunteer.location?.coordinates?.latitude},${volunteer.location?.coordinates?.longitude}`)}
                          >
                            Map Pin
                          </button>
                          <button
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-bold flex items-center justify-center shadow-sm"
                            onClick={() => setBookingModal({ isOpen: true, volunteerEmail: volunteer.email })}
                          >
                            <Clock className="w-4 h-4 mr-1" /> Assign Route
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {activeTab === "deliveries" && (
                <motion.div
                  key="deliveries"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6"
                >
                  <h2 className="text-2xl font-bold text-orange-700 mb-6 flex items-center">
                    <CheckSquare className="mr-2" /> Traffic Control
                  </h2>

                  {loadingDeliveries && (
                    <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
                  )}

                  {!loadingDeliveries && deliveries.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                      <List className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900">No Active Runs</h3>
                      <p className="text-gray-500 mt-1">Assign a volunteer to a pending donation to start routing.</p>
                    </div>
                  )}

                  <ul className="space-y-4">
                    {deliveries.map((delivery) => (
                      <li key={delivery._id} className="bg-white p-5 rounded-xl shadow-sm border-l-4 overflow-hidden border-orange-500 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold mb-3 tracking-widest uppercase shadow-sm
                               ${delivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : ''}
                               ${delivery.status === 'accepted' && delivery.pickupStatus !== 'picked_up' ? 'bg-blue-100 text-blue-800 border border-blue-200' : ''}
                               ${delivery.status === 'accepted' && delivery.pickupStatus === 'picked_up' ? 'bg-blue-600 text-white shadow-blue-200' : ''}
                               ${delivery.status === 'completed' ? 'bg-green-500 text-white shadow-green-200' : ''}
                               ${delivery.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                               ${delivery.status === 'failed' ? 'bg-gray-800 text-white' : ''}
                            `}>
                              {delivery.status === 'accepted' && delivery.pickupStatus !== 'picked_up' ? 'Volunteer Dispatched' : ''}
                              {delivery.status === 'accepted' && delivery.pickupStatus === 'picked_up' ? 'Food En Route' : ''}
                              {delivery.status !== 'accepted' ? delivery.status : ''}
                            </span>
                            <h3 className="text-base font-bold text-gray-900">
                              Donor: {delivery.donationId?.donorName || "Unknown"}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 flex items-center">
                              <Users className="w-4 h-4 mr-1 text-gray-400" /> {delivery.volunteerEmail}
                            </p>
                          </div>
                          <div className="text-right bg-gray-50 px-3 py-2 rounded-lg border">
                            <span className="block text-xl font-black text-orange-600">{delivery.totalDistanceKm}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase">Kilometers</span>
                          </div>
                        </div>

                        {delivery.status === 'rejected' && (
                          <div className="mt-3 bg-red-50 p-3 rounded-lg text-sm text-red-800 border border-red-100">
                            <strong className="flex items-center"><XCircle className="w-4 h-4 mr-1" /> Rejection Reason:</strong>
                            <p className="mt-1">{delivery.rejectionReason}</p>
                          </div>
                        )}

                        {delivery.status === 'accepted' && delivery.pickupStatus !== 'picked_up' && (
                          <div className="mt-4 pt-4 border-t border-dashed border-gray-200 text-center">
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Awaiting Donor Verification</p>
                            <p className="text-xs text-gray-400">The volunteer must collect the food from the donor first to unlock the drop-off OTP.</p>
                          </div>
                        )}

                        {delivery.status === 'accepted' && delivery.pickupStatus === 'picked_up' && (
                          <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Secret Dropoff Verification Code</p>
                            <div className="bg-gray-900 text-center py-3 rounded-xl shadow-inner flex items-center justify-center space-x-4">
                              <span className="text-3xl font-mono font-black tracking-[0.5em] text-green-400">{delivery.otp}</span>
                            </div>
                            {delivery.failedAttempts > 0 && (
                              <p className="text-xs text-red-500 font-bold mt-2 text-center animate-pulse">Caution: {delivery.failedAttempts} incorrect attempts detected.</p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {activeTab === "biogasPlants" && (
                <motion.div
                  key="biogas"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6"
                >
                  <h2 className="text-2xl font-bold text-orange-700 mb-6">List of Biogas Plants</h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {biogasPlants.map((plant, index) => (
                      <li key={index} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">{plant.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center mt-2"><MapIcon className="w-4 h-4 mr-1" /> {plant.location}</p>
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="block text-xs text-gray-400 font-bold">CAPACITY</span>
                            <span className="font-semibold text-gray-700">50 tons/mo</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="block text-xs text-gray-400 font-bold">FOUNDED</span>
                            <span className="font-semibold text-gray-700">2022</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Booking Modal */}
        {bookingModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="bg-orange-600 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">Assign Donation Pickup</h3>
                <button onClick={() => setBookingModal({ isOpen: false, volunteerEmail: null })} className="hover:bg-orange-700 p-1 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Select a pending donation to assign for delivery.
                  {bookingModal.volunteerEmail && (
                    <> to Volunteer: <strong className="text-gray-900">{bookingModal.volunteerEmail}</strong>.</>
                  )}
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Available Donors Array</label>
                  <select
                    className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-orange-500 focus:ring-0 outline-none text-sm text-gray-900 bg-white"
                    value={selectedDonation}
                    onChange={(e) => setSelectedDonation(e.target.value)}
                  >
                    <option value="" className="text-gray-900">Select an Unassigned Donor...</option>
                    {donors.filter(d => d.bookingStatus !== 'assigned').map(donor => (
                      <option key={donor._id} value={donor._id} className="text-gray-900">
                        {donor.donorName} - {donor.donation.foodType} ({donor.location.address.split(',')[0]})
                      </option>
                    ))}
                    {donors.filter(d => d.bookingStatus !== 'assigned').length === 0 && (
                      <option disabled className="text-gray-900">No pending donations available</option>
                    )}
                  </select>
                </div>

                <button
                  onClick={handleBookVolunteer}
                  disabled={!selectedDonation || (bookingModal.volunteerEmail === null && !activeTab === 'volunteers')}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-4"
                >
                  Confirm & Send Booking
                </button>
                {bookingModal.volunteerEmail === null && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium">
                      Note: You are assigning this donor. Please go to the <strong>Volunteers</strong> tab to choose a specific volunteer for this donor, or select a donor from a volunteer card.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NGOTab;
