// components/UniversalMap.web.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";

type Deal = {
  _id: string;
  storeName: string;
  itemName: string;
  price: number;
  location: { type: string; coordinates: [number, number] }; // [lng, lat]
};

type Props = {
  deals: Deal[];
  editable?: boolean;
  onSelectLocation?: (coords: { lat: number; lng: number }) => void;
};

export default function UniversalMap({
  deals,
  editable = false,
  onSelectLocation,
}: Props) {
  const [isClient, setIsClient] = useState(false);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null; // Only render on client

  // Lazy load leaflet
  const L = require("leaflet");
  require("leaflet/dist/leaflet.css");
  const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = require("react-leaflet");

  // Fix default marker icons
  delete (L.Icon.Default as any).prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  // Default Iligan City center
  const iliganCenter: [number, number] = [8.228, 124.245];

  // Handle map events
  
  function LocationHandler() {
    useMapEvents({
      // @ts-ignore
      mousemove(e) {
        if (editable) {
          setHoverCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      },
      // @ts-ignore
      click(e) {
        if (editable) {
          const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
          setSelectedCoords(coords);
          if (onSelectLocation) onSelectLocation(coords);
        }
      },
    });
    return null;
  }

  return (
    <View style={styles.container}>
      <MapContainer center={iliganCenter} zoom={14} style={styles.map}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Permanent store markers */}
        {deals.map((deal) => (
          <Marker
            key={deal._id}
            position={[
              deal.location.coordinates[1],
              deal.location.coordinates[0],
            ]}
          >
            <Popup>
              <b>{deal.storeName}</b>
              <br />
              {deal.itemName} - ₱{deal.price}
            </Popup>
          </Marker>
        ))}

        {/* Editable marker (for store owner picking location) */}
        {selectedCoords && (
          <Marker position={[selectedCoords.lat, selectedCoords.lng]}>
            <Popup>📍 New store location</Popup>
          </Marker>
        )}

        {editable && <LocationHandler />}
      </MapContainer>

      {/* Show hover coords below map */}
      {editable && hoverCoords && (
        <Text style={styles.coordsText}>
          Hovering: {hoverCoords.lat.toFixed(5)}, {hoverCoords.lng.toFixed(5)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%", // full width in modal
    height: 450,   // fixed height
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 10,
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  coordsText: {
    marginTop: 6,
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
});
