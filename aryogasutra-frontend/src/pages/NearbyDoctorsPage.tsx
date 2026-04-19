import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = new L.DivIcon({
  html: `<div style="background:#4f7942;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #4f794266"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: "",
});

const doctorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const selectedDoctorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -40], shadowSize: [41, 41],
});

type DoctorRow = {
  id: number; name?: string; specialization?: string;
  distanceKm: number; latitude?: number; longitude?: number;
};
type BookingState = {
  doctorId: number; datetime: string; notes: string;
  status: "idle" | "loading" | "success" | "error"; message?: string;
};
type RouteInfo = {
  doctorId: number; coords: [number, number][];
  distanceKm: number; durationMin: number;
};

// ── Haversine ─────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Decode polyline ───────────────────────────────────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// ── Popular Indian cities for quick search ────────────────────────────────────
const CITIES = [
  { name: "New Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
];

function RecenterMap({ lat, lng, zoom = 13 }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], zoom); }, [lat, lng, zoom, map]);
  return null;
}

export default function NearbyDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [bookings, setBookings] = useState<Record<number, BookingState>>({});
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<"street" | "satellite">("street");
  const [searchRadius, setSearchRadius] = useState(10);
  const [citySearch, setCitySearch] = useState("");
  const [showCities, setShowCities] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  const filteredCities = CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()));

  // ── Routing via OSRM ─────────────────────────────────────────────────────────
  async function getRoute(doc: DoctorRow) {
    if (!userPos || !doc.latitude || !doc.longitude) return;
    if (route?.doctorId === doc.id) { setRoute(null); return; }
    setRouteLoading(doc.id);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userPos.lng},${userPos.lat};${doc.longitude},${doc.latitude}?overview=full&geometries=polyline`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === "Ok" && json.routes?.[0]) {
        const r = json.routes[0];
        setRoute({ doctorId: doc.id, coords: decodePolyline(r.geometry), distanceKm: r.distance / 1000, durationMin: Math.round(r.duration / 60) });
      } else {
        const dist = haversineKm(userPos.lat, userPos.lng, doc.latitude, doc.longitude);
        setRoute({ doctorId: doc.id, coords: [[userPos.lat, userPos.lng], [doc.latitude, doc.longitude]], distanceKm: dist, durationMin: Math.round((dist / 30) * 60) });
      }
    } catch {
      const dist = haversineKm(userPos.lat, userPos.lng, doc.latitude!, doc.longitude!);
      setRoute({ doctorId: doc.id, coords: [[userPos.lat, userPos.lng], [doc.latitude!, doc.longitude!]], distanceKm: dist, durationMin: Math.round((dist / 30) * 60) });
    } finally { setRouteLoading(null); }
  }

  async function fetchDoctors(lat: number, lng: number) {
    setErr(null); setLoading(true); setUserPos({ lat, lng }); setRoute(null); setDoctors([]);
    try {
      const { data } = await api.post<DoctorRow[]>("/nearest-doctors", { latitude: lat, longitude: lng, limit: 10 });
      setDoctors(data);
      if (data.length === 0) setErr("No doctors found nearby. Try increasing the search radius or a different location.");
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setErr(ax.response?.data?.message ?? ax.message ?? "Failed to fetch doctors");
    } finally { setLoading(false); }
  }

  function locate() {
    setErr(null); setLoading(true);
    if (!navigator.geolocation) { setErr("Geolocation not supported."); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchDoctors(pos.coords.latitude, pos.coords.longitude),
      () => { setLoading(false); setErr("Location access denied. Use city search or enter coordinates."); }
    );
  }

  function manualSearch(e: React.FormEvent) {
    e.preventDefault();
    const lat = parseFloat(manualLat), lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) { setErr("Enter valid coordinates."); return; }
    fetchDoctors(lat, lng);
  }

  function initBooking(doctorId: number) {
    setBookings(prev => ({ ...prev, [doctorId]: { doctorId, datetime: "", notes: "", status: "idle" } }));
  }

  async function confirmBooking(doctorId: number) {
    const booking = bookings[doctorId];
    if (!booking?.datetime) return;
    setBookings(prev => ({ ...prev, [doctorId]: { ...prev[doctorId], status: "loading" } }));
    try {
      const iso = new Date(booking.datetime).toISOString().slice(0, 19);
      await api.post("/appointments", { doctorId, appointmentDate: iso, notes: booking.notes || null });
      setBookings(prev => ({ ...prev, [doctorId]: { ...prev[doctorId], status: "success", message: "Appointment booked! Confirmation sent." } }));
    } catch (e) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      setBookings(prev => ({ ...prev, [doctorId]: { ...prev[doctorId], status: "error", message: ax.response?.data?.message ?? ax.message ?? "Booking failed" } }));
    }
  }

  const tileUrl = mapMode === "satellite"
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttr = mapMode === "satellite"
    ? "Tiles &copy; Esri"
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-ayur-leaf">🗺️ Nearby Ayurvedic Doctors</h2>
        <p className="text-sm text-stone-500 mt-1">Find doctors near you with real-time routing and directions.</p>
      </div>

      {/* Search panel */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
        {/* GPS button */}
        <button type="button" onClick={locate} disabled={loading}
          className="w-full py-2.5 rounded-xl bg-ayur-moss text-white font-semibold hover:bg-ayur-leaf transition disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "📍"}
          {loading ? "Detecting location…" : "Use My GPS Location"}
        </button>

        {/* City quick-select */}
        <div className="relative" ref={cityRef}>
          <label className="block text-xs text-stone-500 mb-1 font-medium">Quick city search</label>
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
            placeholder="Search city (e.g. Mumbai, Delhi…)"
            value={citySearch}
            onChange={(e) => { setCitySearch(e.target.value); setShowCities(true); }}
            onFocus={() => setShowCities(true)}
          />
          {showCities && filteredCities.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-stone-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredCities.map(c => (
                <button key={c.name} type="button"
                  onClick={() => { fetchDoctors(c.lat, c.lng); setCitySearch(c.name); setShowCities(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-ayur-moss/10 hover:text-ayur-leaf transition border-b border-stone-50 last:border-0">
                  📍 {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Manual coordinates */}
        <details className="group">
          <summary className="text-xs text-stone-500 cursor-pointer hover:text-ayur-moss select-none">
            ⚙️ Enter coordinates manually
          </summary>
          <form onSubmit={manualSearch} className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Latitude</label>
                <input className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  placeholder="e.g. 28.6139" value={manualLat} onChange={(e) => setManualLat(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Longitude</label>
                <input className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                  placeholder="e.g. 77.2090" value={manualLng} onChange={(e) => setManualLng(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="w-full py-2 rounded-lg border border-ayur-moss text-ayur-moss text-sm font-medium hover:bg-ayur-moss/5 transition">
              Search
            </button>
          </form>
        </details>

        {/* Radius slider */}
        <div>
          <label className="block text-xs text-stone-500 mb-1 font-medium">
            Search radius: <span className="text-ayur-moss font-semibold">{searchRadius} km</span>
          </label>
          <input type="range" min={1} max={50} value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="w-full accent-ayur-moss" />
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <span>⚠️</span><span>{err}</span>
        </div>
      )}

      {/* Stats bar */}
      {userPos && doctors.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
            <p className="text-2xl font-bold text-ayur-leaf">{doctors.length}</p>
            <p className="text-xs text-stone-500">Doctors found</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
            <p className="text-2xl font-bold text-ayur-leaf">{Math.min(...doctors.map(d => d.distanceKm)).toFixed(1)}</p>
            <p className="text-xs text-stone-500">Nearest (km)</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
            <p className="text-2xl font-bold text-ayur-leaf">{route ? `${route.durationMin}m` : "—"}</p>
            <p className="text-xs text-stone-500">Drive time</p>
          </div>
        </div>
      )}

      {/* Map */}
      {userPos && (
        <div className="space-y-2">
          {/* Map controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
              {(["street", "satellite"] as const).map(m => (
                <button key={m} type="button" onClick={() => setMapMode(m)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${mapMode === m ? "bg-white text-ayur-leaf shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
                  {m === "street" ? "🗺️ Street" : "🛰️ Satellite"}
                </button>
              ))}
            </div>
            {route && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-800 flex items-center gap-2">
                <span>🗺️ <strong>{route.distanceKm.toFixed(1)} km</strong> · ~<strong>{route.durationMin} min</strong></span>
                <button type="button" onClick={() => setRoute(null)} className="text-blue-400 hover:text-blue-600 ml-1">✕</button>
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-md" style={{ height: 420 }}>
            <MapContainer center={[userPos.lat, userPos.lng]} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer attribution={tileAttr} url={tileUrl} />
              <ZoomControl position="bottomright" />
              <RecenterMap lat={userPos.lat} lng={userPos.lng} />

              {/* User pulse circle */}
              <Circle center={[userPos.lat, userPos.lng]} radius={searchRadius * 1000}
                pathOptions={{ color: "#4f7942", fillColor: "#4f7942", fillOpacity: 0.05, dashArray: "6 4" }} />
              <Circle center={[userPos.lat, userPos.lng]} radius={200}
                pathOptions={{ color: "#4f7942", fillColor: "#4f7942", fillOpacity: 0.3 }} />
              <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
                <Popup><strong>📍 Your Location</strong><br />{userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</Popup>
              </Marker>

              {/* Route */}
              {route && <Polyline positions={route.coords} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85, lineCap: "round" }} />}

              {/* Doctor markers */}
              {doctors.map(doc => doc.latitude && doc.longitude ? (
                <Marker key={doc.id} position={[doc.latitude, doc.longitude]}
                  icon={route?.doctorId === doc.id ? selectedDoctorIcon : doctorIcon}>
                  <Popup>
                    <div className="text-sm">
                      <strong>Dr. {doc.name}</strong><br />
                      <span className="text-stone-500">{doc.specialization}</span><br />
                      <span className="text-green-700 font-medium">{doc.distanceKm.toFixed(2)} km away</span>
                      {route?.doctorId === doc.id && <><br /><span className="text-blue-700">🗺️ {route.distanceKm.toFixed(1)} km · ~{route.durationMin} min</span></>}
                    </div>
                  </Popup>
                </Marker>
              ) : null)}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Doctor cards */}
      {doctors.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
            {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} found nearby
          </h3>
          {doctors.map((doc) => {
            const booking = bookings[doc.id];
            return (
              <div key={doc.id} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ayur-moss/10 flex items-center justify-center text-lg">👨‍⚕️</div>
                    <div>
                      <p className="font-semibold text-stone-800">Dr. {doc.name ?? "Doctor"}</p>
                      <p className="text-sm text-stone-500">{doc.specialization ?? "Ayurvedic Practitioner"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-ayur-moss">{doc.distanceKm.toFixed(2)} km</span>
                    <p className="text-xs text-stone-400">away</p>
                  </div>
                </div>

                {!booking ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => initBooking(doc.id)}
                      className="flex-1 py-2 rounded-xl border border-ayur-moss text-ayur-moss text-sm font-medium hover:bg-ayur-moss/5 transition">
                      📅 Book Appointment
                    </button>
                    {doc.latitude && doc.longitude && (
                      <button type="button" onClick={() => getRoute(doc)} disabled={routeLoading === doc.id}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition flex items-center gap-1.5 ${
                          route?.doctorId === doc.id ? "border-blue-500 bg-blue-500 text-white" : "border-blue-300 text-blue-600 hover:bg-blue-50"
                        }`}>
                        {routeLoading === doc.id
                          ? <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          : "🗺️"}
                        {route?.doctorId === doc.id ? "Hide" : "Directions"}
                      </button>
                    )}
                  </div>
                ) : booking.status === "success" ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                    ✅ {booking.message}
                  </div>
                ) : (
                  <div className="space-y-2 bg-stone-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-stone-600">Select date & time:</p>
                    <input type="datetime-local"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      value={booking.datetime}
                      onChange={(e) => setBookings(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], datetime: e.target.value } }))} />
                    <input type="text" placeholder="Notes (optional)"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-moss"
                      value={booking.notes}
                      onChange={(e) => setBookings(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], notes: e.target.value } }))} />
                    {booking.status === "error" && <p className="text-xs text-red-600">{booking.message}</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => confirmBooking(doc.id)}
                        disabled={!booking.datetime || booking.status === "loading"}
                        className="flex-1 py-2 rounded-lg bg-ayur-moss text-white text-sm font-medium disabled:opacity-50 hover:bg-ayur-leaf transition flex items-center justify-center gap-1">
                        {booking.status === "loading" && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Confirm Booking
                      </button>
                      <button type="button"
                        onClick={() => setBookings(prev => { const n = { ...prev }; delete n[doc.id]; return n; })}
                        className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!userPos && !loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3">
          <p className="text-4xl">🗺️</p>
          <p className="text-stone-600 font-medium">Find Ayurvedic doctors near you</p>
          <p className="text-sm text-stone-400">Use GPS, search by city, or enter coordinates to get started.</p>
        </div>
      )}
    </div>
  );
}
