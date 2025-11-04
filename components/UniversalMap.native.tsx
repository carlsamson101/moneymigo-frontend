import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { WebView } from "react-native-webview";

type Deal = {
  _id: string;
  storeName: string;
  itemName: string;
  price: number;
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
};

type Props = {
  deals: Deal[];
  editable?: boolean;
  onSelectLocation?: (coords: { lat: number; lng: number }) => void;

};

export default function UniversalMapAndroid({ deals }: Props) {
  // Center map on Iligan City
  const iliganCenter = [8.228, 124.245]; // lat, lng

  // Generate markers from deals
  const markers = deals
  .map(
    (deal) => `
      L.marker([${deal.location.coordinates[1]}, ${deal.location.coordinates[0]}])
        .addTo(map)
        .bindPopup(\`
          <b>${deal.storeName}</b><br>
          ${deal.itemName} - ₱${deal.price}<br>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${deal.location.coordinates[1]},${deal.location.coordinates[0]}" 
             target="_blank"
             style="color:#2563eb;text-decoration:none;font-weight:600;">
             📍 Get Directions
          </a>
        \`);
    `
  )
  .join("\n");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <style>
        html, body, #map {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
        }
      </style>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          var map = L.map('map').setView([${iliganCenter[0]}, ${iliganCenter[1]}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          ${markers}
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 300, marginVertical: 0, borderRadius: 8 },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});
