"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown, Mail, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        router.push("/login"); // or "/"
    };

    if (!user) return null; // Don't render if no user

    return (
        <nav className="bg-white shadow-sm border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-50">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white font-black">F</span>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-400 bg-clip-text text-transparent">FoodRescue</span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-3 py-2 px-3 rounded-full hover:bg-gray-50 transition border border-transparent hover:border-gray-200"
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-400 to-red-400 flex items-center justify-center shadow-inner">
                            <span className="text-white font-bold text-lg">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-bold text-gray-700 leading-tight">{user.name}</p>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{user.role}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {dropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                            >
                                <div className="p-4 bg-gray-50 border-b border-gray-100 text-center">
                                    <p className="font-bold text-gray-900 text-lg mb-1">{user.name}</p>
                                    <span className="inline-flex m-auto items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 uppercase tracking-wider">
                                        {user.role} Status Active
                                    </span>
                                </div>
                                <div className="p-2">
                                    <div className="flex items-center gap-3 px-3 py-3 text-sm text-gray-700 border-b border-gray-50">
                                        <Mail className="w-5 h-5 text-gray-400" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-3 text-sm text-gray-700">
                                        <Shield className="w-5 h-5 text-gray-400" />
                                        <span className="capitalize">{user.role} Profile</span>
                                    </div>
                                </div>
                                <div className="p-2 border-t border-gray-100 bg-gray-50">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-100 rounded-lg transition font-bold"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </nav>
    );
}
