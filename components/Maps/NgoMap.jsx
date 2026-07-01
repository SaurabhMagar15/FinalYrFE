"use client";

import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

const NgoMap = ({ donors, volunteers, ngoLocation }) => {
    const [mounted, setMounted] = useState(false);
    const [leafletParams, setLeafletParams] = useState(null);

    useEffect(() => {
        // Prevent mapping errors during Next.js SSR by dynamically importing Leaflet
        // ONLY on the client side.
        import("react-leaflet").then((ReactLeaflet) => {
            import("leaflet").then((L) => {
                delete L.Icon.Default.prototype._getIconUrl;

                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
                    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                });

                // Custom Icons for Donor vs Volunteer
                const donorIcon = new L.Icon({
                    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                const volunteerIcon = new L.Icon({
                    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                setLeafletParams({
                    MapContainer: ReactLeaflet.MapContainer,
                    TileLayer: ReactLeaflet.TileLayer,
                    Marker: ReactLeaflet.Marker,
                    Popup: ReactLeaflet.Popup,
                    donorIcon,
                    volunteerIcon
                });
                setMounted(true);
            });
        });
    }, []);

    useEffect(() => {
        // Prevent mapping errors during Next.js SSR
        setMounted(true);
    }, []);

    if (!mounted || !leafletParams) return <div className="h-full w-full bg-orange-50 animate-pulse rounded-lg flex items-center justify-center text-orange-400 font-bold">Loading Interactive Map...</div>;

    const { MapContainer, TileLayer, Marker, Popup, donorIcon, volunteerIcon } = leafletParams;

    // Default Center to NGO if available, else fallback to Mumbai Default
    const centerLat = ngoLocation?.latitude || 19.0760;
    const centerLon = ngoLocation?.longitude || 72.8777;

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border-2 border-orange-200">
            <MapContainer
                center={[centerLat, centerLon]}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render Donor Markers */}
                {donors && donors.map((donor) => {
                    if (!donor.location || !donor.location.coordinates) return null;
                    return (
                        <Marker
                            key={donor._id}
                            position={[donor.location.coordinates.latitude, donor.location.coordinates.longitude]}
                            icon={donorIcon}
                        >
                            <Popup>
                                <div className="font-sans">
                                    <strong className="text-red-600 block text-lg">{donor.donorName}</strong>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{donor.donorType}</span>
                                    <p className="mt-2 text-sm">Providing <strong>{donor.donation.quantity}</strong> of {donor.donation.foodType} food.</p>
                                    {donor.bookingStatus === 'assigned' && <p className="text-xs font-bold text-red-500 mt-1">Status: Pickup In-Progress</p>}
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}

                {/* Render Volunteer Markers */}
                {volunteers && volunteers.map((vol) => {
                    if (!vol.location || !vol.location.coordinates) return null;
                    return (
                        <Marker
                            key={vol._id || vol.email}
                            position={[vol.location.coordinates.latitude, vol.location.coordinates.longitude]}
                            icon={volunteerIcon}
                        >
                            <Popup>
                                <div className="font-sans">
                                    <strong className="text-green-700 block text-lg">{vol.name}</strong>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Available: {vol.availability || "Anytime"}</span>
                                    <p className="mt-2 text-sm text-gray-700">Contact: {vol.contact}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    );
};

export default NgoMap;
