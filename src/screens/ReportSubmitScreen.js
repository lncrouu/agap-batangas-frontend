import React, { useState, useEffect, useRef } from 'react';
import { submitHazardReport } from '../services/reportService';

export default function ReportSubmitScreen({ onBack, onSubmitSuccess }) {
  const [hazardTitle, setHazardTitle] = useState('');
  const [severityLevel, setSeverityLevel] = useState(''); // Starts empty/unselected
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState(13.7565);
  const [longitude, setLongitude] = useState(121.0583);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [photosList, setPhotosList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // System Pop-up Notification State
  const [systemPopupNotice, setSystemPopupNotice] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

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
      const map = L.map(mapContainerRef.current).setView([latitude, longitude], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
      const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      map.on('click', (e) => {
        const lat = parseFloat(e.latlng.lat.toFixed(5));
        const lng = parseFloat(e.latlng.lng.toFixed(5));
        setLatitude(lat);
        setLongitude(lng);
        marker.setLatLng([lat, lng]);
        if (!locationName) setLocationName(`Pinned Location (${lat} N, ${lng} E)`);
      });
    };

    loadLeaflet();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const triggerSystemPopup = (title, message) => {
    setSystemPopupNotice({ title, message });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      triggerSystemPopup('GPS UNSUPPORTED', 'GPS location positioning is not supported on this device.');
      return;
    }
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lng = parseFloat(pos.coords.longitude.toFixed(5));
        setLatitude(lat);
        setLongitude(lng);
        setLocationName(`Near ${lat} N, ${lng} E`);
        setIsGpsLoading(false);
        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerInstanceRef.current.setLatLng([lat, lng]);
        }
      },
      () => {
        setIsGpsLoading(false);
        triggerSystemPopup('LOCATION NOTICE', 'Could not fetch current GPS position. Tap map to pin location manually.');
      }
    );
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > h ? w > MAX : h > MAX) {
            if (w > h) { h *= MAX / w; w = MAX; } else { w *= MAX / h; h = MAX; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          setPhotosList((prev) => [...prev, { id: Date.now() + Math.random(), base64: canvas.toDataURL('image/jpeg', 0.75) }]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePreSubmitCheck = (e) => {
    e.preventDefault();

    if (!hazardTitle.trim()) {
      triggerSystemPopup(
        'MISSING HAZARD TITLE',
        'Please enter a Hazard / Issue Title (e.g., Flash Flooding, Fallen Electric Pole) before submitting.'
      );
      return;
    }

    if (!severityLevel) {
      triggerSystemPopup(
        'SEVERITY LEVEL REQUIRED',
        'Please select a Severity Urgency Level (LOW, MODERATE, SEVERE, or CRITICAL) before submitting your hazard report.'
      );
      return;
    }

    if (!locationName.trim()) {
      triggerSystemPopup(
        'LOCATION LANDMARK REQUIRED',
        'Please specify or pin the Location Landmark on the map before submitting.'
      );
      return;
    }

    if (photosList.length === 0) {
      triggerSystemPopup(
        'MANDATORY EVIDENCE PHOTO REQUIRED',
        'Please attach at least 1 evidence photo of the hazard before submitting.'
      );
      return;
    }

    if (!description.trim()) {
      triggerSystemPopup(
        'REMARKS REQUIRED',
        'Please enter descriptive remarks and situation details before submitting.'
      );
      return;
    }

    setShowConfirmModal(true);
  };

  const executeFinalSubmission = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
<<<<<<< HEAD

=======
      const { count, error: countErr } = await supabase.from('reports').select('*', { count: 'exact', head: true });
      const seq = (countErr || count === null) ? 1 : count + 1;
      const ticketNo = `#AGAP-2026-${String(seq).padStart(4, '0')}`;
>>>>>>> 00f93ad (Admin Update)
      const localDeviceId = localStorage.getItem('agap_device_id') || 'GUEST-DEV';
      const photoPayload = JSON.stringify(photosList.map((p) => p.base64));

      const payload = {
<<<<<<< HEAD
        category: hazardType,
        hazard_type: hazardType,
=======
        id: ticketNo,
        ticket_no: ticketNo,
        category: hazardTitle,
        hazard_type: hazardTitle,
>>>>>>> 00f93ad (Admin Update)
        severity: severityLevel,
        location: locationName,
        coordinates: `${latitude}, ${longitude}`,
        description,
        status: 'PENDING',
        device_id: localDeviceId,
        proof_photos: photoPayload,
        photos: photoPayload
      };

      const savedReport = await submitHazardReport(payload);

<<<<<<< HEAD
      alert(`✓ Hazard Report Transmitted!\nTicket Ref: ${savedReport.ticket_no}\nStatus: PENDING TRIAGE`);
=======
      alert(`✅ Hazard Report Transmitted!\nTicket Ref: ${ticketNo}\nStatus: PENDING TRIAGE`);
>>>>>>> 00f93ad (Admin Update)
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err) {
      triggerSystemPopup('SUBMISSION FAILED', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBtnStyle = (s) => {
    if (severityLevel === s) {
      if (s === 'CRITICAL') return styles.sevBtnCriticalActive;
      if (s === 'SEVERE') return styles.sevBtnSevereActive;
      if (s === 'MODERATE') return styles.sevBtnModerateActive;
      return styles.sevBtnLowActive;
    }
    return styles.sevBtnInactive;
  };

  return (
    <div style={styles.container}>
      <div style={styles.navHeader}>
        <button style={styles.backBtn} onClick={onBack}>&lt; Back</button>
        <div>
          <h2 style={styles.headerTitle}>Submit Hazard Report</h2>
          <div style={styles.headerSub}>Project AGAP Direct Alert System</div>
        </div>
      </div>

      <form noValidate onSubmit={handlePreSubmitCheck} style={styles.formCard}>
        <div style={styles.formGroup}>
          <label style={styles.label}>1. HAZARD / ISSUE TITLE *</label>
          <input
            type="text"
            style={styles.input}
            placeholder="e.g. Flash Flooding at Rizal Ave, Fallen Electric Pole..."
            value={hazardTitle}
            onChange={(e) => setHazardTitle(e.target.value)}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>2. SEVERITY URGENCY LEVEL *</label>
          <div style={styles.grid4}>
            {['LOW', 'MODERATE', 'SEVERE', 'CRITICAL'].map((s) => (
              <button
                key={s}
                type="button"
                style={getSeverityBtnStyle(s)}
                onClick={() => setSeverityLevel(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.formGroup}>
          <div style={styles.rowBetween}>
            <label style={styles.label}>3. LOCATION (TAP MAP TO PIN) *</label>
            <button type="button" style={styles.gpsBtn} onClick={handleGetLocation} disabled={isGpsLoading}>
              {isGpsLoading ? 'Locating...' : 'GPS Position'}
            </button>
          </div>
          <input
            type="text"
            style={styles.input}
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Landmark / Street Address..."
          />
          <div style={styles.mapBox}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '170px' }}></div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>4. ATTACH EVIDENCE PHOTOS ({photosList.length}) *</label>
          {photosList.length > 0 && (
            <div style={styles.grid3}>
              {photosList.map((p) => (
                <div key={p.id} style={styles.thumbCard}>
                  <img src={p.base64} alt="Thumb" style={styles.thumbImg} />
                  <button type="button" style={styles.removeBtn} onClick={() => setPhotosList((prev) => prev.filter((item) => item.id !== p.id))}>✕</button>
                </div>
              ))}
            </div>
          )}
          <label style={styles.dropzone}>
            <span style={styles.dropText}>+ Upload 1 or More Photos</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>5. REMARKS & SITUATION DETAILS *</label>
          <textarea
            style={styles.textarea}
            rows="3"
            placeholder="Describe current situation details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button type="submit" style={isSubmitting ? styles.submitBtnDisabled : styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Transmitting Alert...' : 'Submit Report to LGU Command Center'}
        </button>
      </form>

      {/* SYSTEM POP-UP NOTIFICATION MODAL */}
      {systemPopupNotice && (
        <div style={styles.modalBackdrop} onClick={() => setSystemPopupNotice(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitleRed}>⚠️ {systemPopupNotice.title}</span>
              <button style={styles.closeBtn} onClick={() => setSystemPopupNotice(null)}>✕</button>
            </div>
            <p style={styles.modalBodyText}>
              {systemPopupNotice.message}
            </p>
            <button style={styles.popupCloseBtn} onClick={() => setSystemPopupNotice(null)}>
              Understand & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 2nd Verification Confirmation Modal */}
      {showConfirmModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowConfirmModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>SUBMISSION VERIFICATION</span>
              <button style={styles.closeBtn} onClick={() => setShowConfirmModal(false)}>✕</button>
            </div>
            <p style={styles.modalBodyText}>
              Are you sure you are ready to transmit this hazard report to the <strong>CDRRMO Batangas Command Center</strong>?
            </p>
            <div style={styles.confirmSummaryBox}>
              <div><strong>Hazard:</strong> {hazardTitle}</div>
              <div><strong>Severity:</strong> {severityLevel}</div>
              <div><strong>Location:</strong> {locationName}</div>
              <div><strong>Evidence Photos:</strong> {photosList.length} photo(s) attached</div>
            </div>
            <div style={styles.modalBtnRow}>
              <button style={styles.cancelBtn} onClick={() => setShowConfirmModal(false)}>Review</button>
              <button style={styles.confirmSendBtn} onClick={executeFinalSubmission} disabled={isSubmitting}>
                {isSubmitting ? 'Transmitting...' : 'Confirm & Transmit Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '440px', margin: '0 auto', padding: '16px', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' },
  navHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  backBtn: { backgroundColor: '#F1F5F9', border: 'none', color: '#0F766E', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  headerTitle: { fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 },
  headerSub: { fontSize: '11px', color: '#64748B' },
  formCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  formGroup: { marginBottom: '14px' },
  label: { fontSize: '10px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '6px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' },
  grid4: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' },
  sevBtnLowActive: { padding: '8px 4px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  sevBtnModerateActive: { padding: '8px 4px', backgroundColor: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  sevBtnSevereActive: { padding: '8px 4px', backgroundColor: '#EA580C', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  sevBtnCriticalActive: { padding: '8px 4px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  sevBtnInactive: { padding: '8px 4px', backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '10px', fontWeight: '600', cursor: 'pointer' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  gpsBtn: { backgroundColor: '#CCFBF1', border: '1px solid #99F6E4', color: '#0F766E', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit' },
  mapBox: { borderRadius: '10px', overflow: 'hidden', border: '2px solid #0F766E', marginTop: '6px' },
  thumbCard: { position: 'relative', width: '100%', paddingTop: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #0F766E' },
  thumbImg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
  removeBtn: { position: 'absolute', top: '2px', right: '2px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '9px', cursor: 'pointer' },
  dropzone: { border: '2px dashed #0F766E', backgroundColor: '#F0FDF4', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'center', cursor: 'pointer' },
  dropText: { fontSize: '11px', fontWeight: '800', color: '#0F766E' },
  submitBtn: { width: '100%', padding: '12px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', marginTop: '8px' },
  submitBtnDisabled: { width: '100%', padding: '12px', backgroundColor: '#94A3B8', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'not-allowed', marginTop: '8px' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', maxWidth: '360px', width: '100%' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  modalTitle: { fontSize: '12px', fontWeight: '800', color: '#0F172A' },
  modalTitleRed: { fontSize: '12px', fontWeight: '800', color: '#DC2626' },
  closeBtn: { backgroundColor: '#F1F5F9', border: 'none', width: '24px', height: '24px', borderRadius: '50%', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  modalBodyText: { fontSize: '12px', color: '#334155', lineHeight: '1.4', margin: '0 0 10px 0' },
  confirmSummaryBox: { backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#0F172A', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' },
  modalBtnRow: { display: 'flex', gap: '8px' },
  cancelBtn: { flex: 1, padding: '9px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  confirmSendBtn: { flex: 1, padding: '9px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  popupCloseBtn: { width: '100%', padding: '10px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }
};
