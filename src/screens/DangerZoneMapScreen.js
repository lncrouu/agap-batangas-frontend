import React, { useState, useEffect, useRef } from 'react';
import { fetchReports } from '../services/reportService';

export default function DangerZoneMapScreen({ onBack }) {
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activePinId, setActivePinId] = useState(null);
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [activeHazards, setActiveHazards] = useState([]);
  const [userGps, setUserGps] = useState({ lat: 13.7565, lng: 121.0583 });
  const [inspectImage, setInspectImage] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    fetchActiveHazards();
    
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newGps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserGps(newGps);
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([newGps.lat, newGps.lng]);
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const fetchActiveHazards = async () => {
    try {
<<<<<<< HEAD
      setActiveHazards(await Promise.all(
        ['APPROVED', 'IN_PROGRESS', 'DISPATCHED']
          .map((status) => fetchReports({ status }))
      ).then((reports) => reports.flat()));
=======
      const { data, error } = await supabase.from('reports').select('*');
      if (error) throw error;
      if (data) {
        const approved = data.filter((h) => {
          const s = (h.status || '').toUpperCase();
          return s === 'APPROVED' || s === 'IN_PROGRESS' || s === 'DISPATCHED' || s === 'RESOLVED';
        });
        setActiveHazards(approved);
      }
>>>>>>> 00f93ad (Admin Update)
    } catch (err) {
      console.error('Map fetch error:', err.message);
    }
  };

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const getDistanceNumber = (item) => {
    if (!item || !item.coordinates) return null;
    const parts = item.coordinates.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parseFloat(calculateDistanceKm(userGps.lat, userGps.lng, parts[0], parts[1]));
    }
    return null;
  };

  const parsePhotos = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
      return [trimmed];
    }
    return [];
  };

  const filtered = selectedFilter === 'ALL'
    ? activeHazards
    : activeHazards.filter((h) => (h.severity || '').toUpperCase() === selectedFilter || (h.category || '').toUpperCase().includes(selectedFilter));

  useEffect(() => {
    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        initMap();
      }
    };

    const initMap = () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      const L = window.L;
      const map = L.map(mapContainerRef.current).setView([userGps.lat, userGps.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

      const greenIcon = L.divIcon({
        className: 'custom-pin-green',
        html: `<div style="background-color: #166534; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const uMarker = L.marker([userGps.lat, userGps.lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup('<strong>Your Live GPS Position</strong>');
      
      userMarkerRef.current = uMarker;

      const redIcon = L.divIcon({
        className: 'custom-pin-red',
        html: `<div style="background-color: #DC2626; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      activeHazards.forEach((haz) => {
        if (haz.coordinates) {
          const parts = haz.coordinates.split(',').map((s) => parseFloat(s.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const m = L.marker([parts[0], parts[1]], { icon: redIcon })
              .addTo(map)
              .bindPopup(`<strong>${haz.hazard_type || haz.category}</strong><br/>Ref: ${haz.id || haz.ticket_no}<br/>Severity: ${haz.severity || 'HIGH'}`);

            m.on('click', () => {
              handleSelectPin(haz);
            });

            markersRef.current[haz.id] = m;
          }
        }
      });

      mapInstanceRef.current = map;
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeHazards]);

  const handleSelectPin = (item) => {
    setActivePinId(item.id);
    setSelectedHazard(item);

    if (mapInstanceRef.current && item.coordinates) {
      const parts = item.coordinates.split(',').map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        mapInstanceRef.current.panTo([parts[0], parts[1]]);
        if (markersRef.current[item.id]) {
          markersRef.current[item.id].openPopup();
        }
      }
    }
  };

  const handleRecenterGps = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userGps.lat, userGps.lng], 15);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.navHeader}>
        <button style={styles.backBtn} onClick={onBack}>&lt; Back</button>
        <div>
          <h2 style={styles.headerTitle}>Batangas Danger Zone Map</h2>
          <div style={styles.headerSub}>Browse Active Hazard Pins & Explore Local Threats</div>
        </div>
      </div>

      <div style={styles.mapCard}>
        <div style={styles.rowBetween}>
          <span style={styles.badgeGreen}>LIVE GPS MAP (FREE BROWSE)</span>
          <div style={styles.legendBox}>
            <span style={styles.legendGreen}>• You</span>
            <span style={styles.legendRed}>• Hazards</span>
          </div>
        </div>
        <div style={styles.mapFrame}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '240px' }}></div>
        </div>
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#334155' }}>Pan or zoom freely to locate active hazards</span>
          <button style={styles.recenterBtn} onClick={handleRecenterGps}>
            📍 Recenter My GPS
          </button>
        </div>
      </div>

      {selectedHazard && (
        <div style={styles.detailPanel}>
          <div style={styles.panelHeaderRow}>
            <div>
              <span style={styles.badgeTeal}>{selectedHazard.id || selectedHazard.ticket_no}</span>
              <span style={{ ...styles.badgeRed, marginLeft: '6px' }}>{selectedHazard.severity || 'ACTIVE'}</span>
            </div>
            <button style={styles.closePanelBtn} onClick={() => setSelectedHazard(null)}>Close X</button>
          </div>

          <h3 style={styles.panelTitle}>{selectedHazard.hazard_type || selectedHazard.category}</h3>
          <p style={styles.panelLoc}>Location: {selectedHazard.location}</p>

          {(() => {
            const dist = getDistanceNumber(selectedHazard);
            const isNear = dist !== null && dist <= 1.5;
            return (
              <div style={styles.rowBetweenMargin}>
                <span style={styles.distanceBadge}>
                  {dist !== null ? `≈ ${dist} km from your live position` : 'Distance unavailable'}
                </span>
                {dist !== null && (
                  <span style={isNear ? styles.nearBadge : styles.safeBadge}>
                    {isNear ? 'HIGH PROXIMITY (NEAR)' : 'LOW PROXIMITY (SAFE DISTANCE)'}
                  </span>
                )}
              </div>
            );
          })()}

          {parsePhotos(selectedHazard.proof_photos || selectedHazard.photos).length > 0 ? (
            <div style={styles.photoContainer}>
              <div style={styles.fieldLabel}>HAZARD ISSUE EVIDENCE PHOTO (Tap to inspect):</div>
              <div style={styles.photoGrid}>
                {parsePhotos(selectedHazard.proof_photos || selectedHazard.photos).map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`Evidence ${idx + 1}`}
                    style={styles.evidenceThumb}
                    onClick={() => setInspectImage(src)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.noPhotoNotice}>No evidence photo uploaded for this report.</div>
          )}

          {selectedHazard.notice_text && (
            <div style={styles.noticeBox}>
              <span style={styles.fieldLabel}>CDRRMO DIRECTIVE:</span>
              <p style={styles.noticeTextVal}>"{selectedHazard.notice_text}"</p>
            </div>
          )}

          <div style={styles.panelDescBox}>
            <span style={styles.fieldLabel}>SITUATION DESCRIPTION:</span>
            <p style={styles.descText}>"{selectedHazard.description || 'Active hazard logged by resident.'}"</p>
          </div>
        </div>
      )}

      <div style={styles.chipRow}>
        {['ALL', 'CRITICAL', 'SEVERE', 'MODERATE', 'LOW'].map((cat) => (
          <button key={cat} style={selectedFilter === cat ? styles.chipActive : styles.chipInactive} onClick={() => setSelectedFilter(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.stack}>
        {filtered.length === 0 ? (
          <div style={styles.emptyCard}>No active hazard pins in this category. Map is clear!</div>
        ) : (
          filtered.map((item) => {
            const photos = parsePhotos(item.proof_photos || item.photos);
            const dist = getDistanceNumber(item);
            return (
              <div key={item.id} style={activePinId === item.id ? styles.cardActive : styles.card} onClick={() => handleSelectPin(item)}>
                <div style={styles.rowBetween}>
                  <span style={styles.badgeTeal}>{item.id || item.ticket_no}</span>
                  <span style={styles.badgeRed}>{item.severity || 'HIGH'}</span>
                </div>
                <h4 style={styles.cardTitle}>{item.hazard_type || item.category}</h4>
                <p style={styles.cardMeta}>Location: {item.location}</p>
                <div style={styles.cardDistanceRow}>
                  <span style={styles.distanceText}>
                    {dist !== null ? `≈ ${dist} km from current loc` : 'Distance N/A'}
                  </span>
                  {photos.length > 0 && <span style={styles.photoBadge}>{photos.length} Photo Attached</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {inspectImage && (
        <div style={styles.modalBackdrop} onClick={() => setInspectImage(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>HAZARD ISSUE PHOTO PREVIEW</span>
              <button style={styles.closeBtn} onClick={() => setInspectImage(null)}>✕</button>
            </div>
            <img src={inspectImage} alt="Inspected Hazard" style={styles.fullImg} />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '440px', margin: '0 auto', padding: '16px', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' },
  navHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: '#0F766E', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  headerTitle: { fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 },
  headerSub: { fontSize: '11px', color: '#334155' },
  mapCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '8px', marginBottom: '10px' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  rowBetweenMargin: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' },
  legendBox: { display: 'flex', gap: '8px' },
  legendGreen: { fontSize: '9px', fontWeight: '800', color: '#166534' },
  legendRed: { fontSize: '9px', fontWeight: '800', color: '#DC2626' },
  recenterBtn: { backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  badgeGreen: { fontSize: '9px', fontWeight: '800', backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px' },
  badgeTeal: { fontSize: '9px', fontWeight: '800', backgroundColor: '#CCFBF1', color: '#0F766E', padding: '2px 6px', borderRadius: '4px' },
  badgeRed: { fontSize: '9px', fontWeight: '800', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '2px 6px', borderRadius: '4px' },
  nearBadge: { fontSize: '8px', fontWeight: '800', backgroundColor: '#FEF2F2', color: '#991B1B', padding: '2px 6px', borderRadius: '4px' },
  safeBadge: { fontSize: '8px', fontWeight: '800', backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px' },
  mapFrame: { borderRadius: '6px', overflow: 'hidden', border: '1px solid #CBD5E1', marginTop: '4px' },
  detailPanel: { backgroundColor: '#FFFFFF', border: '2px solid #0F766E', borderRadius: '12px', padding: '12px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.12)' },
  panelHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  closePanelBtn: { backgroundColor: '#F1F5F9', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', color: '#475569', cursor: 'pointer' },
  panelTitle: { fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: '2px 0' },
  panelLoc: { fontSize: '11px', color: '#475569', margin: '2px 0' },
  distanceBadge: { fontSize: '10px', fontWeight: '800', color: '#0F766E', backgroundColor: '#F0FDF4', padding: '3px 6px', borderRadius: '6px' },
  photoContainer: { marginTop: '6px' },
  fieldLabel: { fontSize: '9px', fontWeight: '800', color: '#334155', display: 'block' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '4px' },
  evidenceThumb: { width: '100%', height: '65px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #0F766E', cursor: 'pointer' },
  noPhotoNotice: { fontSize: '10px', color: '#475569', fontStyle: 'italic', margin: '6px 0' },
  noticeBox: { marginTop: '6px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '6px 8px', borderRadius: '6px' },
  noticeTextVal: { fontSize: '10px', color: '#166534', margin: '2px 0 0 0', fontStyle: 'italic' },
  panelDescBox: { marginTop: '8px', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' },
  descText: { fontSize: '11px', color: '#334155', margin: '2px 0 0 0', lineHeight: '1.3' },
  chipRow: { display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px' },
  chipActive: { padding: '6px 12px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  chipInactive: { padding: '6px 12px', backgroundColor: '#E2E8F0', color: '#475569', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' },
  stack: { display: 'flex', flexDirection: 'column', gap: '8px' },
  emptyCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#334155', fontSize: '11px' },
  card: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px', cursor: 'pointer' },
  cardActive: { backgroundColor: '#F0FDF4', border: '2px solid #0F766E', borderRadius: '8px', padding: '10px', cursor: 'pointer' },
  cardTitle: { fontSize: '13px', fontWeight: '800', color: '#0F172A', margin: '2px 0' },
  cardMeta: { fontSize: '10px', color: '#334155', margin: '2px 0' },
  cardDistanceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' },
  distanceText: { fontSize: '9px', fontWeight: '700', color: '#0F766E' },
  photoBadge: { fontSize: '8px', fontWeight: '800', backgroundColor: '#CCFBF1', color: '#0F766E', padding: '2px 5px', borderRadius: '4px' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px', maxWidth: '380px', width: '100%' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  modalTitle: { fontSize: '11px', fontWeight: '800', color: '#0F172A' },
  closeBtn: { backgroundColor: '#F1F5F9', border: 'none', width: '24px', height: '24px', borderRadius: '50%', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  fullImg: { width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }
};
