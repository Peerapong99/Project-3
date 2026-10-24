
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';

const PropertyMap = ({
  latitude,
  longitude,
  title = 'ตำแหน่งบ้าน',
  zoom = 16,
}) => {
  const html = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return '<html><body>ไม่มีพิกัดแผนที่</body></html>';
    }

    const safeTitle = JSON.stringify(String(title))
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    const safeZoom = Math.max(
      1,
      Math.min(19, Number(zoom) || 16),
    );

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />

          <style>
            html, body, #map {
              height: 100%;
              width: 100%;
              margin: 0;
              padding: 0;
            }

            #error {
              display: none;
              padding: 20px;
              color: #475569;
              font-family: sans-serif;
            }
          </style>
        </head>

        <body>
          <div id="map"></div>

          <div id="error">
            โหลดแผนที่ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต
          </div>

          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

          <script>
            try {
              const map = L.map('map', {
                scrollWheelZoom: false
              }).setView(
                [${lat}, ${lng}],
                ${safeZoom}
              );

              L.tileLayer(
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                {
                  maxZoom: 19,
                  attribution: '&copy; OpenStreetMap contributors'
                }
              ).addTo(map);

              L.marker([${lat}, ${lng}])
                .addTo(map)
                .bindPopup(Object.assign(document.createElement('span'), {textContent: ${safeTitle}}));

            } catch (error) {
              document.getElementById('map').style.display = 'none';
              document.getElementById('error').style.display = 'block';
            }
          </script>
        </body>
      </html>
    `;
  }, [latitude, longitude, title, zoom]);

  return (
    <View style={styles.container}>
      <WebView
        source={{
          html,
          baseUrl: 'https://localhost/',
        }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 210,
    backgroundColor: '#F1F5F9',
  },

  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default PropertyMap;
