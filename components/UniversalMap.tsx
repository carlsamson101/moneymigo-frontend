import React, { useEffect, useRef, useState } from "react";
import { Platform, View, StyleSheet, Text } from "react-native";

let L: any;

type Deal = {
  _id: string;
  storeName: string;
  itemName: string;
  price: number;
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
};

// 👉 unified props type
export type UniversalMapProps = {
  deals: Deal[];
  onSelectLocation?: (coords: { lat: number; lng: number }) => void;
   editable?: boolean;
};

const UniversalMap: React.FC<UniversalMapProps> = ({
  deals,
  editable = false,
  onSelectLocation,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      (async () => {
        if (!L) {
          L = await import("leaflet");
          await import("leaflet/dist/leaflet.css");
        }

        if (mapRef.current && !leafletInstance.current) {
          leafletInstance.current = L.map(mapRef.current).setView([8.228, 124.245], 14);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
          }).addTo(leafletInstance.current);
        }

        const map = leafletInstance.current;

        // Clear existing markers
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });

        // Add markers for deals
        deals.forEach((deal) => {
          const [lng, lat] = deal.location.coordinates;
          L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`<b>${deal.storeName}</b><br/>${deal.itemName} - ₱${deal.price}`);
        });

        if (editable && onSelectLocation) {
          map.on("mousemove", (e: any) => {
            setHoverCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          });

          map.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) {
              map.removeLayer(markerRef.current);
            }
            markerRef.current = L.marker([lat, lng]).addTo(map);
            onSelectLocation({ lat, lng });
          });
        }
      })();
    }
  }, [deals, editable, onSelectLocation]);

  if (Platform.OS === "web") {
    return (
      <div style={{ position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "300px", borderRadius: 8 }} />
        {hoverCoords && editable && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              background: "rgba(0,0,0,0.7)",
              color: "white",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: "12px",
            }}
          >
            {hoverCoords.lat.toFixed(5)}, {hoverCoords.lng.toFixed(5)}
          </div>
        )}
      </div>
    );
  }

  // ✅ Native
  if (Platform.OS === "android" || Platform.OS === "ios") {
    const MapView = require("react-native-maps").default;
    const { Marker, PROVIDER_DEFAULT } = require("react-native-maps");

    return (
      <View style={styles.container}>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: 8.228,
            longitude: 124.245,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(e: any) => {
            if (editable && onSelectLocation) {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              onSelectLocation({ lat: latitude, lng: longitude });
            }
          }}
        >
          {deals.map((deal) => (
            <Marker
              key={deal._id}
              coordinate={{
                latitude: deal.location.coordinates[1],
                longitude: deal.location.coordinates[0],
              }}
              title={deal.storeName}
              description={`${deal.itemName} - ₱${deal.price}`}
            />
          ))}
        </MapView>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 400,
    borderRadius: 8,
    overflow: "hidden",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

export default UniversalMap;
