"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Building2, Users, Eye, EyeOff, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const userTypes = [
  {
    id: "donor",
    title: "Donor",
    icon: Heart,
    color: "text-pink-500",
    description: "Support causes you care about",
  },
  {
    id: "ngo",
    title: "NGO",
    icon: Building2,
    color: "text-blue-500",
    description: "Create impact at scale",
  },
  {
    id: "volunteer",
    title: "Volunteer",
    icon: Users,
    color: "text-green-500",
    description: "Contribute your time and skills",
  },
];

export default function Home() {
  const [selectedType, setSelectedType] = useState("donor");
  const [tab, setTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
    registrationId: "", // Only for NGO
    address: "", // For NGO and Volunteer
    availability: "Anytime", // Only for Volunteer
    coordinates: null // dynamically fetched
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  // Regex validations
  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const validatePhone = (phone) => {
    return String(phone).match(/^[0-9]{10}$/);
  };

  const validatePassword = (password) => {
    // Minimum 8 characters, at least one letter and one number
    return String(password).match(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/);
  };

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.id]: e.target.value });
  };

  const handleSignupChange = (e) => {
    setSignupForm({ ...signupForm, [e.target.id]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSignupForm(prev => ({
          ...prev,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        toast.success("Location acquired successfully!");
        setLocating(false);
      },
      (error) => {
        toast.error("Failed to get location. Please allow location access.");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loginForm, role: selectedType }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        setLoading(false);
        return;
      }

      toast.success("Login successful!");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on role
      if (selectedType === "volunteer") {
        router.push("/volunteer"); // Make sure you have a volunteer page if needed
      } else if (selectedType === "ngo") {
        router.push("/ngo");
      } else {
        router.push("/donor");
      }
    } catch (err) {
      toast.error("Server error. Please try again later.");
      console.error(err);
    }
    setLoading(false);
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.contact || !signupForm.confirmPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (selectedType === 'ngo' && !signupForm.registrationId) {
      toast.error("Registration ID is required for NGOs.");
      return;
    }
    if (!validateEmail(signupForm.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!validatePhone(signupForm.contact)) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!validatePassword(signupForm.password)) {
      toast.error("Password must be at least 8 characters long and contain both letters and numbers.");
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...signupForm, role: selectedType };

      // Ensure address and coordinates are strictly handled
      if (selectedType === 'ngo' || selectedType === 'volunteer') {
        if (!signupForm.address) {
          toast.error("Please enter your address text.");
          setLoading(false);
          return;
        }
        if (!signupForm.coordinates) {
          toast.error("Please click 'Get My Location' to pinpoint your exact coordinates.");
          setLoading(false);
          return;
        }

        payload.location = {
          address: signupForm.address,
          coordinates: signupForm.coordinates
        };
      }

      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      toast.success("Account created successfully! Please login.");
      setTab("login");
      setSignupForm({ name: "", email: "", contact: "", password: "", confirmPassword: "", registrationId: "", coordinates: null });
    } catch (err) {
      toast.error("Server error. Please try again later.");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-300 flex text-black items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-6">
        <div className="grid md:grid-cols-5 gap-6">

          <div className="md:col-span-2 space-y-6">
            <h1 className="text-2xl font-bold text-orange-400">Welcome</h1>
            <p className="text-black">Choose your role to continue</p>
            <div className="space-y-4">
              {userTypes.map((type) => (
                <motion.div
                  key={type.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    type="button"
                    className={`w-full flex items-center p-4 border rounded-lg space-x-4 transition ${selectedType === type.id
                      ? "border-orange-500 bg-orange-100 shadow-md"
                      : "border-gray-300 hover:bg-gray-50"
                      }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                    <div className="text-left">
                      <div className="font-medium text-gray-800">{type.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {type.description}
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="flex w-full border-b text-black">
              <button
                type="button"
                className={`w-1/2 p-2 text-center transition ${tab === "login"
                  ? "border-b-2 border-orange-500 font-bold text-orange-600"
                  : "text-gray-500 hover:text-gray-800"
                  }`}
                onClick={() => setTab("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={`w-1/2 p-2 text-center transition ${tab === "signup"
                  ? "border-b-2 border-orange-500 font-bold text-orange-600"
                  : "text-gray-500 hover:text-gray-800"
                  }`}
                onClick={() => setTab("signup")}
              >
                Sign Up
              </button>
            </div>

            <div className="mt-4 p-4">
              {tab === "login" ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="w-full p-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                    />
                  </div>
                  <div className="space-y-2 relative text-black">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="w-full p-2 pr-10 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button type="button" className="text-sm text-orange-500 hover:underline">
                      Forgot password?
                    </button>
                    <button type="button" onClick={() => setTab('signup')} className="text-sm text-gray-500 hover:text-orange-500 transition">
                      Don't have an account? Sign up
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg shadow-md transition disabled:opacity-50 mt-4"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignupSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 pl-2 pb-2">
                  <div className="space-y-2 text-black">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full p-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition"
                      value={signupForm.name}
                      onChange={handleSignupChange}
                    />
                  </div>
                  <div className="space-y-2 text-black">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="w-full p-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition"
                      value={signupForm.email}
                      onChange={handleSignupChange}
                    />
                  </div>
                  <div className="space-y-2 text-black">
                    <label
                      htmlFor="contact"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Mobile Number
                    </label>
                    <input
                      id="contact"
                      type="tel"
                      placeholder="Enter your 10-digit mobile number"
                      className="w-full p-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition"
                      value={signupForm.contact}
                      onChange={handleSignupChange}
                    />
                  </div>

                  {(selectedType === 'ngo' || selectedType === 'volunteer') && (
                    <div className="space-y-2 text-black border p-4 border-orange-200 bg-orange-50/50 rounded-lg">
                      <label
                        htmlFor="address"
                        className="block text-sm font-bold text-gray-700"
                      >
                        Location Tracking Requirement
                      </label>
                      <p className="text-xs text-gray-500 mb-2">We need your real location to properly route deliveries and award points accurately.</p>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={locating}
                          className={`w-full flex items-center justify-center p-3 rounded-lg border-2 transition font-bold 
                              ${signupForm.coordinates
                              ? "bg-green-100 border-green-500 text-green-700"
                              : "bg-white border-orange-300 text-orange-600 hover:bg-orange-100"}`}
                        >
                          <MapPin className="w-5 h-5 mr-2" />
                          {locating ? "Acquiring Signal..." : signupForm.coordinates ? "Coordinates Locked ✓" : "Detect My Auto-Coordinates"}
                        </button>

                        <input
                          id="address"
                          type="text"
                          placeholder="Type your localized Street Address context here..."
                          className="w-full p-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition"
                          value={signupForm.address}
                          onChange={handleSignupChange}
                        />
                      </div>
                    </div>
                  )}

                  {selectedType === 'volunteer' && (
                    <div className="space-y-2 text-black">
                      <label
                        htmlFor="availability"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Preferred Delivery Time Slot
                      </label>
                      <select
                        id="availability"
                        className="w-full p-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition bg-white"
                        value={signupForm.availability}
                        onChange={handleSignupChange}
                      >
                        <option value="Anytime">Anytime</option>
                        <option value="Morning">Morning (8AM - 12PM)</option>
                        <option value="Afternoon">Afternoon (12PM - 4PM)</option>
                        <option value="Evening">Evening (4PM - 8PM)</option>
                      </select>
                    </div>
                  )}

                  {selectedType === 'ngo' && (
                    <div className="space-y-2 text-black">
                      <label
                        htmlFor="registrationId"
                        className="block text-sm font-medium text-gray-700"
                      >
                        NGO Registration ID
                      </label>
                      <input
                        id="registrationId"
                        type="text"
                        placeholder="Enter your NGO registration ID"
                        className="w-full p-2 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition"
                        value={signupForm.registrationId}
                        onChange={handleSignupChange}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-black">
                    <div className="space-y-2 relative">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          className="w-full p-2 pr-10 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition text-xs"
                          value={signupForm.password}
                          onChange={handleSignupChange}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 relative">
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          className="w-full p-2 pr-10 border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none rounded-lg transition text-xs"
                          value={signupForm.confirmPassword}
                          onChange={handleSignupChange}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg shadow-md transition disabled:opacity-50"
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
