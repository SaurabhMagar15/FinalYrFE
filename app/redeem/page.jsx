"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Coffee, Shirt, Ticket, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const rewards = [
  {
    id: 1,
    title: "Free Coffee Voucher",
    points: 100,
    icon: Coffee,
    color: "bg-amber-100 text-amber-600",
    description: "Get a free coffee at our partner cafes.",
  },
  {
    id: 2,
    title: "NGO Supporter T-Shirt",
    points: 500,
    icon: Shirt,
    color: "bg-blue-100 text-blue-600",
    description: "Wear your support proudly with our exclusive merchandise.",
  },
  {
    id: 3,
    title: "Movie Ticket",
    points: 1000,
    icon: Ticket,
    color: "bg-purple-100 text-purple-600",
    description: "Relax, you earned it. 1 free standard movie ticket.",
  },
  {
    id: 4,
    title: "Special Dinner for 2",
    points: 2500,
    icon: Gift,
    color: "bg-rose-100 text-rose-600",
    description: "A premium dining experience at a 5-star partner restaurant.",
  }
];

export default function RedeemPage() {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          toast.error("Please login to view rewards.");
          setLoading(false);
          return;
        }

        const userData = JSON.parse(userStr);
        setUser(userData);

        const res = await fetch(`http://localhost:5000/api/stats/${userData.email}`);
        if (res.ok) {
          const data = await res.json();
          setPoints(data.points);

          // Update local storage points to keep synced
          const updatedUser = { ...userData, points: data.points };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (err) {
        toast.error("Error loading points");
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, []);

  const handleRedeem = async (reward) => {
    if (points < reward.points) {
      toast.error(`You need ${reward.points - points} more points to redeem this.`);
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await fetch("http://localhost:5000/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, cost: reward.points })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to redeem");
      } else {
        setPoints(data.points);
        toast.success(`Successfully redeemed: ${reward.title}! Check your email for details.`);

        // Sync local storage
        const updatedUser = { ...user, points: data.points };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      toast.error("Error during redemption request.");
    }
    setRedeemingId(null);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl font-extrabold text-gray-900"
          >
            Rewards Center
          </motion.h1>
          <p className="mt-4 text-xl text-gray-600">
            You currently have <span className="font-bold text-orange-600 text-2xl">{points}</span> points.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Earn 50 points for every donation you make!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {rewards.map((reward) => (
            <motion.div
              key={reward.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className={`p-6 flex items-center justify-center ${reward.color}`}>
                <reward.icon className="h-16 w-16" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{reward.title}</h3>
                <p className="text-gray-600 text-sm mb-6 flex-1">{reward.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-orange-500">{reward.points} pts</span>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={points < reward.points || redeemingId === reward.id}
                    className={`px-4 py-2 rounded-lg font-medium transition ${points >= reward.points
                        ? "bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                  >
                    {redeemingId === reward.id ? <Loader2 className="h-5 w-5 animate-spin" /> : "Redeem"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
