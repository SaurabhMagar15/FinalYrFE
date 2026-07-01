"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, HandHeart, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function StatsPage() {
    const [stats, setStats] = useState({ points: 0, totalDonations: 0 });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const userStr = localStorage.getItem("user");
                if (!userStr) {
                    toast.error("Please login to view statistics.");
                    setLoading(false);
                    return;
                }

                const userData = JSON.parse(userStr);
                setUser(userData);

                const res = await fetch(`http://localhost:5000/api/stats/${userData.email}`);
                if (!res.ok) {
                    throw new Error("Failed to fetch stats");
                }

                const data = await res.json();
                setStats(data);
            } catch (err) {
                toast.error("Error loading statistics");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Please login to view this page.</p>
            </div>
        );
    }

    // Calculate generic impact metrics for visualization
    const peopleHelpedEstimate = stats.totalDonations * 5; // Rough estimate (e.g. 1 donation helps 5 people)

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-extrabold text-gray-900"
                    >
                        Your Impact Hub
                    </motion.h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Thank you, {user.name}! Here's a look at the difference you've made.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Points Card */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-orange-500"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <Award className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Reward Points</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.points}</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Total Donations */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <HandHeart className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Donations</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalDonations}</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* People Helped */}
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">People Helped (Est.)</p>
                                <p className="text-2xl font-bold text-gray-900">{peopleHelpedEstimate}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Milestone Progress Section */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-xl font-bold text-center text-gray-900 mb-6">Next Milestone</h2>
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-orange-600 bg-orange-200">
                                    Community Hero
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-orange-600">
                                    {Math.min((stats.points / 1000) * 100, 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                        <div className="overflow-hidden h-3 mb-4 text-xs flex rounded bg-orange-100">
                            <div style={{ width: `${Math.min((stats.points / 1000) * 100, 100)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500 transition-all duration-1000 ease-in-out"></div>
                        </div>
                        <p className="text-sm text-center text-gray-600">
                            Earn {Math.max(1000 - stats.points, 0)} more points to unlock the Community Hero badge!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
