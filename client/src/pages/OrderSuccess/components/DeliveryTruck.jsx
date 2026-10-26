import React from 'react';

const spin = (running) => ({
  transformBox: 'fill-box',
  transformOrigin: 'center',
  animation: 'ww-spin 0.45s linear infinite',
  animationPlayState: running ? 'running' : 'paused',
});

/** Side-view delivery truck, drawn in SVG with the storefront palette. Faces right. */
const DeliveryTruck = ({ width = 180, moving = false }) => (
  <svg
    viewBox="0 0 220 116"
    width={width}
    height={(width * 116) / 220}
    role="img"
    aria-label="WinterWear delivery truck"
    style={{ overflow: 'visible' }}
  >
    <defs>
      <linearGradient id="ww-cargo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8F394C" />
        <stop offset="1" stopColor="#612130" />
      </linearGradient>
      <linearGradient id="ww-cab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#EDE7DC" />
        <stop offset="1" stopColor="#CFC6B6" />
      </linearGradient>
    </defs>

    {/* shadow */}
    <ellipse cx="112" cy="108" rx="100" ry="5" fill="#000" opacity="0.35" />

    {/* cargo box */}
    <rect x="4" y="10" width="140" height="78" rx="6" fill="url(#ww-cargo)" />
    <rect x="4" y="10" width="140" height="78" rx="6" fill="none" stroke="#000" strokeOpacity="0.25" />
    <rect x="12" y="18" width="124" height="62" rx="3" fill="none" stroke="#F8F7F4" strokeOpacity="0.14" />
    <text
      x="74"
      y="54"
      textAnchor="middle"
      fontFamily="Cinzel, serif"
      fontSize="13"
      letterSpacing="3"
      fill="#F8F7F4"
      opacity="0.9"
    >
      WINTERWEAR
    </text>
    <line x1="22" y1="63" x2="126" y2="63" stroke="#F8F7F4" strokeOpacity="0.35" />

    {/* chassis */}
    <rect x="4" y="86" width="208" height="8" rx="2" fill="#25292E" />

    {/* cab */}
    <path
      d="M144 30h36c5 0 9 2 12 6l16 22c2 2 3 5 3 8v22H144z"
      fill="url(#ww-cab)"
      stroke="#000"
      strokeOpacity="0.2"
    />
    <path d="M154 38h24c3 0 5 1 7 3l11 15h-42z" fill="#17191C" opacity="0.88" />
    <path d="M154 38h24c3 0 5 1 7 3l11 15h-42z" fill="#C9DDE8" opacity="0.18" />
    <rect x="204" y="70" width="8" height="6" rx="1.5" fill="#F5D98A" />
    <rect x="160" y="68" width="16" height="3" rx="1.5" fill="#000" opacity="0.2" />

    {/* wheels */}
    {[44, 170].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy="94" r="15" fill="#0F1012" />
        <g style={spin(moving)}>
          <circle cx={cx} cy="94" r="9" fill="#363B42" />
          <circle cx={cx} cy="94" r="3" fill="#A9ADB3" />
          <rect x={cx - 1} y="86" width="2" height="16" fill="#A9ADB3" opacity="0.55" />
          <rect x={cx - 8} y="93" width="16" height="2" fill="#A9ADB3" opacity="0.55" />
        </g>
      </g>
    ))}
  </svg>
);

/** Sealed cardboard parcel, used while loading and after delivery. */
export const ParcelIcon = ({ size = 56 }) => (
  <svg viewBox="0 0 60 52" width={size} height={(size * 52) / 60} aria-hidden>
    <rect x="2" y="12" width="56" height="38" rx="3" fill="#D8D0C2" />
    <rect x="1" y="6" width="58" height="10" rx="2" fill="#E4DCCD" />
    <rect x="26" y="6" width="8" height="44" fill="#762B3D" opacity="0.92" />
    <rect x="2" y="12" width="56" height="38" rx="3" fill="none" stroke="#000" strokeOpacity="0.15" />
  </svg>
);

export default DeliveryTruck;
