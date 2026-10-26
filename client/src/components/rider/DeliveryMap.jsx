import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = (letter, color, extraClass = '') =>
  L.divIcon({
    className: `ww-pin ${extraClass}`,
    html: `<span style="background:${color}">${letter}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

const ICONS = {
  pickup: pinIcon('P', '#B45309'),
  drop: pinIcon('D', '#762B3D'),
  rider: pinIcon('R', '#2563EB', 'ww-pin-rider'),
};

const valid = (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

const FitBounds = ({ points }) => {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng])),
      { padding: [40, 40], maxZoom: 16 }
    );
  }, [key, map]);

  return null;
};

/**
 * Map for one delivery: P = pickup (warehouse), D = drop-off (customer), R = the rider right now.
 */
const DeliveryMap = ({ pickup, drop, rider, heightClass = 'h-72 lg:h-[420px]' }) => {
  const pickupPoint = valid(pickup) ? pickup : null;
  const dropPoint = valid(drop) ? drop : null;
  const riderPoint = valid(rider) ? rider : null;

  const points = useMemo(
    () => [pickupPoint, dropPoint, riderPoint].filter(Boolean),
    [pickupPoint, dropPoint, riderPoint]
  );

  if (points.length === 0) {
    return (
      <div
        className={`${heightClass} flex items-center justify-center rounded border border-white/10 bg-[#17191C] px-6 text-center text-xs text-silver/70`}
      >
        We could not locate this address on the map yet. Use the Navigate button to open it in Google Maps.
      </div>
    );
  }

  return (
    <div className={`${heightClass} rounded overflow-hidden border border-white/10`}>
      <MapContainer
        center={[points[0].lat, points[0].lng]}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <FitBounds points={points} />

        {pickupPoint && dropPoint && (
          <Polyline
            positions={[
              [pickupPoint.lat, pickupPoint.lng],
              [dropPoint.lat, dropPoint.lng],
            ]}
            pathOptions={{ color: '#EDE7DC', weight: 2, opacity: 0.5, dashArray: '6 8' }}
          />
        )}

        {pickupPoint && (
          <Marker position={[pickupPoint.lat, pickupPoint.lng]} icon={ICONS.pickup}>
            <Popup>
              <strong>Pickup</strong>
              <br />
              {pickup.name || 'Warehouse'}
              {pickup.address && (
                <>
                  <br />
                  {pickup.address}
                </>
              )}
            </Popup>
          </Marker>
        )}

        {dropPoint && (
          <Marker position={[dropPoint.lat, dropPoint.lng]} icon={ICONS.drop}>
            <Popup>
              <strong>Drop-off</strong>
              <br />
              {drop.name}
              {drop.address && (
                <>
                  <br />
                  {drop.address}
                </>
              )}
            </Popup>
          </Marker>
        )}

        {riderPoint && (
          <Marker position={[riderPoint.lat, riderPoint.lng]} icon={ICONS.rider}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;
