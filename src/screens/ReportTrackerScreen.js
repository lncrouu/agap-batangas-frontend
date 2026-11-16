import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ReportTrackerScreen({ onBack }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');
  const [inspectImage, setInspectImage] = useState(null);

  useEffect(() => {
    const localDeviceId = localStorage.getItem('agap_device_id') || '';
    setDeviceId(localDeviceId);
    fetchUserSubmittedReports(localDeviceId);
  }, []);

  const fetchUserSubmittedReports = async (targetDeviceId) => {
    setIsLoading(true);
    try {
      let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

      if (targetDeviceId) {
        query = query.eq('device_id', targetDeviceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) setReports(data);
    } catch (err) {
      console.error('Tracker fetch error:', err.message);
    } finally {
      setIsLoading(false);
    }
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

  const getProgressSteps = (status) => {
    const s = (status || 'PENDING').toUpperCase();

    return [
      {
        stepNo: 1,
        title: 'Report Logged',
        subtitle: 'Submission received & geo-tagged via AGAP Mobile',
        completed: true
      },
      {
        stepNo: 2,
        title: 'Barangay & CDRRMO Triage',
        subtitle: 'LGU desk validated report location and details',
        completed: s === 'APPROVED' || s === 'DISPATCHED' || s === 'IN_PROGRESS' || s === 'RESOLVED'
      },
      {
        stepNo: 3,
        title: 'Response Unit Dispatched & In Progress',
        subtitle: 'Emergency team deployed & active on-site',
        completed: s === 'DISPATCHED' || s === 'IN_PROGRESS' || s === 'RESOLVED'
      },
      {
        stepNo: 4,
        title: 'Hazard Resolved & Cleared',
        subtitle: 'On-site clearing completed by LGU crew',
        completed: s === 'RESOLVED'
      }
    ];
  };

  return (
    <div style={styles.container}>
      <div style={styles.navHeader}>
        <button style={styles.backBtn} onClick={onBack}>&lt; Back</button>
        <div>
          <h2 style={styles.headerTitle}>My Report Tracker</h2>
          <div style={styles.headerSub}>Live Database Dispatch Progress</div>
        </div>
      </div>

      <div style={styles.refreshBar}>
        <span style={styles.deviceText}>Device ID: {deviceId || 'Detecting...'}</span>
        <button style={styles.refreshBtn} onClick={() => fetchUserSubmittedReports(deviceId)}>
          Refresh Status
        </button>
      </div>

      {isLoading ? (
        <div style={styles.emptyCard}>Fetching live report timeline from database...</div>
      ) : reports.length === 0 ? (
        <div style={styles.emptyCard}>
          No hazard reports found for this device. Submit a hazard report to track its live progress here.
        </div>
      ) : (
        reports.map((rep) => {
          const steps = getProgressSteps(rep.status);
          const userEvidencePhotos = parsePhotos(rep.proof_photos || rep.photos);
          const lguProgressPhotos = parsePhotos(rep.lgu_progress_photos);

          return (
            <div key={rep.id || rep.created_at || rep.ticket_no} style={styles.trackerCard}>
              <div style={styles.cardHeader}>
                <span style={styles.ticketBadge}>{rep.ticket_no || rep.id}</span>
                <span style={styles.statusPill}>{rep.status || 'PENDING'}</span>
              </div>

              <h3 style={styles.hazardTitle}>{rep.hazard_type || rep.category}</h3>
              <div style={styles.metaText}>Location: {rep.location}</div>
              <div style={styles.metaText}>Submitted: {rep.created_at ? new Date(rep.created_at).toLocaleString() : 'Recently'}</div>

              {/* Official CDRRMO Notice Directive */}
              {rep.notice_text && (
                <div style={styles.noticeCard}>
                  <div style={styles.noticeLabel}>📢 CDRRMO OFFICIAL NOTICE / DIRECTIVE:</div>
                  <p style={styles.noticeBody}>"{rep.notice_text}"</p>
                </div>
              )}

              {/* LGU On-Site Progress Photos */}
              {lguProgressPhotos.length > 0 && (
                <div style={styles.lguPhotoCard}>
                  <div style={styles.noticeLabel}>📸 LGU ON-SITE PROGRESS UPDATES ({lguProgressPhotos.length}):</div>
                  <div style={styles.photoGrid}>
                    {lguProgressPhotos.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`LGU Progress ${idx + 1}`}
                        style={styles.progressThumb}
                        onClick={() => setInspectImage(src)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vertical Logistics Timeline */}
              <div style={styles.verticalTimeline}>
                {steps.map((step, idx) => (
                  <div key={step.stepNo} style={styles.timelineItem}>
                    <div style={styles.lineCol}>
                      <div style={step.completed ? styles.dotCompleted : styles.dotPending}>
                        {step.completed ? '✓' : step.stepNo}
                      </div>
                      {idx < steps.length - 1 && (
                        <div style={step.completed ? styles.lineCompleted : styles.linePending}></div>
                      )}
                    </div>

                    <div style={styles.contentCol}>
                      <div style={step.completed ? styles.stepTitleDone : styles.stepTitlePending}>
                        {step.title}
                      </div>
                      <div style={styles.stepSubtitle}>{step.subtitle}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submitted User Photo Evidence Thumbnail */}
              {userEvidencePhotos.length > 0 && (
                <div style={styles.evidenceSection}>
                  <div style={styles.evidenceLabel}>ATTACHED EVIDENCE PHOTO ({userEvidencePhotos.length}):</div>
                  <div style={styles.photoGrid}>
                    {userEvidencePhotos.map((src, idx) => (
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
              )}
            </div>
          );
        })
      )}

      {/* Image Inspection Modal */}
      {inspectImage && (
        <div style={styles.modalBackdrop} onClick={() => setInspectImage(null)}>
          <div style={styles.modalImageCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>PHOTO PROOF PREVIEW</span>
              <button style={styles.closeBtn} onClick={() => setInspectImage(null)}>✕</button>
            </div>
            <img src={inspectImage} alt="Inspected Photo" style={styles.fullImg} />
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
  headerSub: { fontSize: '11px', color: '#64748B' },
  refreshBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '8px 12px', borderRadius: '10px', marginBottom: '14px' },
  deviceText: { fontSize: '10px', color: '#64748B', fontWeight: '600' },
  refreshBtn: { backgroundColor: '#CCFBF1', color: '#0F766E', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' },
  emptyCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12px' },
  trackerCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  ticketBadge: { fontSize: '10px', fontWeight: '800', backgroundColor: '#CCFBF1', color: '#0F766E', padding: '3px 8px', borderRadius: '6px' },
  statusPill: { fontSize: '9px', fontWeight: '800', backgroundColor: '#FEF3C7', color: '#D97706', padding: '3px 8px', borderRadius: '6px' },
  hazardTitle: { fontSize: '15px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' },
  metaText: { fontSize: '11px', color: '#64748B', margin: '2px 0' },
  
  noticeCard: { backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '10px', marginTop: '10px' },
  lguPhotoCard: { backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '10px', marginTop: '10px' },
  noticeLabel: { fontSize: '9px', fontWeight: '800', color: '#0F766E', marginBottom: '4px' },
  noticeBody: { fontSize: '11px', color: '#166534', margin: 0, fontStyle: 'italic' },
  
  verticalTimeline: { marginTop: '14px', paddingLeft: '4px' },
  timelineItem: { display: 'flex', gap: '12px', position: 'relative', marginBottom: '10px' },
  lineCol: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  dotCompleted: { width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#0F766E', color: '#FFFFFF', fontSize: '11px', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  dotPending: { width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#E2E8F0', color: '#64748B', fontSize: '10px', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  lineCompleted: { width: '2px', height: '28px', backgroundColor: '#0F766E', marginTop: '2px' },
  linePending: { width: '2px', height: '28px', backgroundColor: '#E2E8F0', marginTop: '2px' },
  contentCol: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  stepTitleDone: { fontSize: '12px', fontWeight: '800', color: '#0F172A' },
  stepTitlePending: { fontSize: '12px', fontWeight: '600', color: '#94A3B8' },
  stepSubtitle: { fontSize: '10px', color: '#64748B' },

  evidenceSection: { marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' },
  evidenceLabel: { fontSize: '9px', fontWeight: '800', color: '#64748B', marginBottom: '6px' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' },
  evidenceThumb: { width: '100%', height: '65px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #0F766E', cursor: 'pointer' },
  progressThumb: { width: '100%', height: '65px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #2563EB', cursor: 'pointer' },

  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalImageCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px', maxWidth: '380px', width: '100%' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  modalTitle: { fontSize: '11px', fontWeight: '800', color: '#0F172A' },
  closeBtn: { backgroundColor: '#F1F5F9', border: 'none', width: '24px', height: '24px', borderRadius: '50%', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  fullImg: { width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }
};
