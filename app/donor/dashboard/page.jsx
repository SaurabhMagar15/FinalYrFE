"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Clock, CheckCircle, Search, BadgeCheck, Loader2, Award, Info } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";

export default function DonorDashboard() {
    const [user, setUser] = useState(null);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [otpInputs, setOtpInputs] = useState({});
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
            if (userData.role !== "donor") {
                toast.error("Unauthorized access.");
                router.push("/login");
                return;
            }
            setUser(userData);
            fetchDeliveries(userData.email);
        };

        fetchUserData();
    }, [router]);

    useEffect(() => {
        let interval;
        if (user) {
            interval = setInterval(() => {
                fetchDeliveries(user.email);
            }, 10000); // Poll every 10 seconds
        }
        return () => clearInterval(interval);
    }, [user]);

    const fetchDeliveries = async (email) => {
        try {
            const res = await fetch(`http://localhost:5000/api/deliveries/donor/${email}`);
            if (res.ok) {
                const data = await res.json();
                setDeliveries(data);
            }
        } catch (err) {
            console.error("Network error fetching donor deliveries:", err);
        } finally {
            setTimeout(() => setLoading(false), 300);
        }
    };

    const handleOtpChange = (deliveryId, value) => {
        setOtpInputs(prev => ({
            ...prev,
            [deliveryId]: value.replace(/[^0-9]/g, '')
        }));
    };

    const verifyPickupOTP = async (deliveryId) => {
        const otp = otpInputs[deliveryId];
        if (!otp || otp.length !== 6) {
            toast.error("OTP must be 6 digits");
            return;
        }

        toast.loading("Verifying Pickup...", { id: "verifyPickup" });

        try {
            const res = await fetch("http://localhost:5000/api/deliveries/verify-pickup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deliveryId, pickupOtp: otp })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || "Pickup Confirmed!", { id: "verifyPickup" });
                setOtpInputs(prev => ({ ...prev, [deliveryId]: "" }));
                fetchDeliveries(user.email);
            } else {
                toast.error(data.error || "Invalid OTP", { id: "verifyPickup" });
            }
        } catch (err) {
            toast.error("Network error", { id: "verifyPickup" });
        }
    };

    if (!user || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
        );
    }

    const activeDeliveries = deliveries.filter(d => ['unassigned', 'pending', 'accepted'].includes(d.status) && d.pickupStatus !== 'picked_up');
    const enRouteDeliveries = deliveries.filter(d => d.status === 'accepted' && d.pickupStatus === 'picked_up');
    const historyDeliveries = deliveries.filter(d => ["completed", "rejected", "failed"].includes(d.status));

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6 relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-100 rounded-bl-full -z-10 opacity-50"></div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900">Donor Dashboard</h1>
                                <p className="mt-2 text-lg text-gray-600">Thank you for contributing, {user.name}!</p>
                                <button
                                    onClick={() => router.push('/donor')}
                                    className="mt-4 px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition"
                                >
                                    + Donate Food
                                </button>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center space-x-2 justify-end">
                                    <Award className="h-8 w-8 text-green-500" />
                                    <span className="text-4xl font-black text-green-600">{user.points || 0}</span>
                                </div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Impact Points</p>
                                <button onClick={() => router.push('/redeem')} className="mt-2 text-sm text-green-600 hover:text-green-800 font-bold underline">
                                    Redeem Rewards
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">

                        {/* Active Pickups Panel */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <Clock className="mr-2 h-6 w-6 text-orange-500" /> Active Pickups
                            </h2>

                            {activeDeliveries.length === 0 ? (
                                <div className="bg-white rounded-xl shadow p-8 text-center border-2 border-dashed border-gray-200">
                                    <Info className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                    <p className="text-gray-500 font-medium">No active pickups right now. Your donations are either complete or picking up soon.</p>
                                </div>
                            ) : (
                                activeDeliveries.map(delivery => (
                                    <motion.div
                                        key={delivery._id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`bg-white rounded-xl shadow-lg border-l-4 overflow-hidden ${delivery.status === 'accepted' ? 'border-orange-500' : 'border-blue-500'}`}
                                    >
                                        <div className="p-5 border-b border-gray-100 pb-4 mb-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    {delivery.status === 'unassigned' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-800 mb-2 uppercase tracking-wide">Awaiting NGO Acceptance</span>
                                                    )}
                                                    {delivery.status === 'pending' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 mb-2 uppercase tracking-wide">Looking For Volunteer</span>
                                                    )}
                                                    {delivery.status === 'accepted' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 mb-2 uppercase tracking-wide">Volunteer En Route</span>
                                                    )}
                                                    <h3 className="font-bold text-gray-900 line-clamp-1">{delivery.donationId.foodType}</h3>
                                                    <p className="text-sm text-gray-500">To: {delivery.ngoId.name}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 pt-0">
                                            {delivery.status === 'unassigned' && (
                                                <div className="bg-gray-50 p-4 rounded-lg flex space-x-3 items-start border border-gray-200">
                                                    <Loader2 className="h-5 w-5 animate-spin text-gray-500 mt-1" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">Your donation is being reviewed.</p>
                                                        <p className="text-xs text-gray-500 mt-1">An NGO in your area will assign a volunteer shortly to pick this up.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {delivery.status === 'pending' && (
                                                <div className="bg-blue-50 p-4 rounded-lg flex space-x-3 items-start border border-blue-200">
                                                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 mt-1" />
                                                    <div>
                                                        <p className="text-sm font-medium text-blue-800">Waiting for a volunteer to accept this drop-off...</p>
                                                        <div className="mt-2 text-xs text-blue-700 bg-blue-100/50 p-2 rounded">
                                                            <p><strong>Dest. NGO:</strong> {delivery.ngoId.name}</p>
                                                            <p><strong>Contact:</strong> {delivery.ngoId.contact || 'N/A'}</p>
                                                            {delivery.ngoId.location && <p><strong>Email:</strong> {delivery.ngoId.email}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {delivery.status === 'accepted' && (
                                                <div className="bg-orange-50 p-4 rounded-lg">
                                                    <div className="flex flex-col md:flex-row justify-between items-start mb-3 gap-4">
                                                        <div>
                                                            <p className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-1">Pickup Action Required</p>
                                                            <p className="text-sm text-gray-700 font-medium">When the volunteer arrives, ask them for their 6-digit <b>Pickup OTP</b>.</p>
                                                        </div>

                                                        {delivery.volunteerDetails && (
                                                            <div className="text-left md:text-right text-xs text-orange-900 bg-orange-100 p-3 rounded shadow-sm min-w-[200px]">
                                                                <p className="font-black text-sm mb-1 text-orange-700">Volunteer Dispatched</p>
                                                                <p className="font-bold">{delivery.volunteerDetails.name}</p>
                                                                <p className="font-medium mt-0.5">📞 {delivery.volunteerDetails.contact}</p>
                                                                {delivery.totalDistanceKm && <p className="mt-1 font-bold text-orange-600 line-clamp-1">ETA: ~{Math.ceil(delivery.totalDistanceKm * 3)} mins away</p>}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                                        <input
                                                            type="text"
                                                            maxLength="6"
                                                            placeholder="Enter Volunteer OTP"
                                                            className="flex-1 px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center font-mono tracking-widest text-lg uppercase shadow-inner"
                                                            value={otpInputs[delivery._id] || ""}
                                                            onChange={(e) => handleOtpChange(delivery._id, e.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => verifyPickupOTP(delivery._id)}
                                                            disabled={(otpInputs[delivery._id] || "").length !== 6}
                                                            className={`px-6 py-3 rounded-lg font-bold transition flex items-center justify-center ${(otpInputs[delivery._id] || "").length === 6 ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' : 'bg-orange-200 text-orange-400 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            Verify
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}

                            {/* In Transit Panel */}
                            {enRouteDeliveries.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center"><Navigation className="w-5 h-5 mr-2 text-blue-500" /> Out for Delivery</h3>
                                    <div className="space-y-4">
                                        {enRouteDeliveries.map(delivery => (
                                            <div key={delivery._id} className="bg-white rounded-xl shadow-sm p-4 border border-blue-100 flex items-center space-x-4">
                                                <div className="p-3 bg-blue-50 rounded-full">
                                                    <Navigation className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{delivery.donationId.foodType}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {delivery.volunteerDetails ? <span className="font-medium text-blue-700">{delivery.volunteerDetails.name}</span> : 'Volunteer'} is transporting food to {delivery.ngoId.name}
                                                    </p>
                                                    {delivery.volunteerDetails && <p className="text-xs font-bold text-blue-500 mt-1 uppercase tracking-wider">Contact Number: {delivery.volunteerDetails.contact}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* History Panel */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                                <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> History
                            </h2>

                            {historyDeliveries.length === 0 ? (
                                <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
                                    <p>No history yet. Your completed donations will appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {historyDeliveries.map(delivery => (
                                        <div key={delivery._id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-gray-900">{delivery.donationId.foodType}</span>
                                                {delivery.status === 'completed' && <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded">Completed</span>}
                                                {delivery.status === 'failed' && <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2.5 py-1 rounded">Failed Delivery</span>}
                                                {delivery.status === 'rejected' && <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded">Volunteer Rejected</span>}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-1">To: {delivery.ngoId.name}</p>
                                            <p className="text-xs text-gray-400">{new Date(delivery.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
