import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const statusColors: Record<string, string> = {
  Pending: "#e88c30",
  "In Progress": "#1a7a8a",
  Resolved: "#3da854",
};

interface MapIssue {
  id: string;
  title: string;
  location: string;
  status: string;
  category: string;
}

const parseLocation = (loc: string): [number, number] | null => {
  const match = loc.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
};

const IssueMap = ({ issues }: { issues: MapIssue[] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markers: L.LatLng[] = [];

    issues.forEach((issue) => {
      const coords = parseLocation(issue.location);
      if (!coords) return;
      const [lat, lng] = coords;
      markers.push(L.latLng(lat, lng));

      const color = statusColors[issue.status] || "#666";

      L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        fillOpacity: 0.85,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif">
            <strong>${issue.title}</strong><br/>
            <span style="color:${color};font-weight:600">${issue.status}</span><br/>
            <small>${issue.category}</small>
          </div>`
        );
    });

    if (markers.length > 0) {
      map.fitBounds(L.latLngBounds(markers).pad(0.3));
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [issues]);

  return (
    <div className="rounded-xl overflow-hidden border bg-card shadow-card">
      <div ref={mapRef} style={{ height: 400, width: "100%" }} />
    </div>
  );
};

export default IssueMap;
