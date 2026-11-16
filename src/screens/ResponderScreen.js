import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ResponderScreen({ onBack }) {
  const [selectedTeam, setSelectedTeam] = useState('CDRRMO Rescue Alpha');
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [fieldRemarks, setFieldRemarks] = useState('');
  const [resolutionPhoto, setResolutionPhoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TEAMS = [
    'CDRRMO Rescue Alpha',
    'BFP Fire Squad 1',
    'PNP Emergency Unit',
    'City Engineering'
  ];

  useEffect(() => {
    fetchAssignedReports();
    const subscription = supabase
      .channel('responder_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchAssignedReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedTeam]);

  const fetchAssignedReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.log('Fetch error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    setIsSubmitting(true);
    try {
      const updateData = { status: newStatus };
      if (newStatus === 'RESOLVED') {
        if (fieldRemarks) updateData.admin_notes = fieldRemarks;
        if (resolutionPhoto) updateData.response_photo = resolutionPhoto;
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      alert(`Report ${reportId} updated to ${newStatus}.`);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updateData } : r));
      if (newStatus === 'RESOLVED') {
        setSelectedReport(null);
        setFieldRemarks('');
        setResolutionPhoto('');
      }
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setResolutionPhoto(reader.result);
    };
  };

  const assignedReports = reports.filter(r => {
    const st = (r.status || '').toUpperCase();
    return st === 'DISPATCHED' || st === 'EN_ROUTE' || st === 'ON_SCENE' || r.assigned_team === selectedTeam;
  });

  return (
    <div style={styles.container}>
      {/* Global Typography Reset */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * {
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        button, input, select, textarea, option {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
      `}</style>

      <div style={styles.navHeader}>
        <button style={styles.backBtn} onClick={onBack}>&lt; Back</button>
        <div>
          <h2 style={styles.headerTitle}>Field Responder Portal</h2>
          <div style={styles.headerSub}>CDRRMO Mobile Response Network</div>
        </div>
      </div>

      {/* Team Selection Tabs */}
      <div style={styles.teamTabContainer}>
        {TEAMS.map(team => (
          <button
            key={team}
            style={selectedTeam === team ? styles.teamTabActive : styles.teamTabInactive}
            onClick={() => setSelectedTeam(team)}
          >
            {team}
          </button>
        ))}
      </div>

      <div style={styles.statusBanner}>
        ACTIVE SQUAD: <strong>{selectedTeam}</strong> &bull; Assigned Incident Dispatches ({assignedReports.length})
      </div>

      {isLoading ? (
        <div style={styles.loadingBox}>Loading assigned field dispatches...</div>
      ) : assignedReports.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyTitle}>NO ACTIVE DISPATCHES</div>
          <div style={styles.emptySub}>All reported hazards for this squad are cleared or standing by in queue.</div>
        </div>
      ) : (
        <div style={styles.reportsStack}>
          {assignedReports.map(rep => {
            const st = (rep.status || 'DISPATCHED').toUpperCase();
            return (
              <div key={rep.id} style={styles.reportCard}>
                <div style={styles.rowBetween}>
                  <span style={st === 'ON_SCENE' ? styles.badgeOnScene : st === 'EN_ROUTE' ? styles.badgeEnRoute : styles.badgeDispatched}>
                    {st === 'ON_SCENE' ? 'ON SCENE' : st === 'EN_ROUTE' ? 'EN ROUTE' : 'DISPATCHED TO SQUAD'}
                  </span>
                  <span style={styles.ticketTag}>{rep.ticket_no || rep.id}</span>
                </div>

                <h3 style={styles.reportTitle}>{rep.hazard_type || rep.category || 'Hazard Alert'}</h3>
                <p style={styles.reportMeta}><strong>Location:</strong> {rep.location || 'Batangas City'}</p>
                <p style={styles.reportMeta}><strong>Urgency Level:</strong> <span style={{ color: rep.severity === 'CRITICAL' ? '#DC2626' : '#0F766E', fontWeight: '800' }}>{rep.severity || 'HIGH'}</span></p>

                {rep.description && (
                  <div style={styles.descriptionBox}>{rep.description}</div>
                )}

                {/* Quick Field Status Buttons */}
                <div style={styles.actionRow}>
                  {st !== 'EN_ROUTE' && st !== 'ON_SCENE' && (
                    <button
                      style={styles.btnEnRoute}
                      onClick={() => handleUpdateStatus(rep.id, 'EN_ROUTE')}
                      disabled={isSubmitting}
                    >
                      Acknowledge & En Route
                    </button>
                  )}
                  {st !== 'ON_SCENE' && (
                    <button
                      style={styles.btnOnScene}
                      onClick={() => handleUpdateStatus(rep.id, 'ON_SCENE')}
                      disabled={isSubmitting}
                    >
                      Arrived On Scene
                    </button>
                  )}
                  <button
                    style={styles.btnResolveModal}
                    onClick={() => setSelectedReport(rep)}
                  >
                    Submit Resolution & Proof
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution & Photo Proof Upload Modal */}
      {selectedReport && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedReport(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Field Resolution & Completion Proof</span>
              <button style={styles.closeBtn} onClick={() => setSelectedReport(null)}>✕</button>
            </div>

            <div style={styles.modalTicket}>Ticket Ref: {selectedReport.ticket_no || selectedReport.id}</div>
            <div style={styles.modalHazard}>{selectedReport.hazard_type || selectedReport.category}</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>ON-SCENE RESOLUTION REMARKS</label>
              <textarea
                style={styles.textarea}
                rows="3"
                placeholder="Type details on how the hazard was cleared or mitigated..."
                value={fieldRemarks}
                onChange={e => setFieldRemarks(e.target.value)}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>ATTACH FIELD PROOF PHOTO</label>
              {resolutionPhoto && (
                <div style={styles.previewBox}>
                  <img src={resolutionPhoto} alt="Proof" style={styles.previewImg} />
                </div>
              )}
              <label style={styles.fileDropzone}>
                <span>{resolutionPhoto ? 'Change Photo Proof' : '+ Upload On-Scene Clear Photo'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={styles.modalBtnRow}>
              <button style={styles.cancelBtn} onClick={() => setSelectedReport(null)}>Cancel</button>
              <button
                style={styles.confirmBtn}
                onClick={() => handleUpdateStatus(selectedReport.id, 'RESOLVED')}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Transmitting...' : 'Mark Incident as RESOLVED'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '480px', margin: '0 auto', padding: '16px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", boxSizing: 'border-box' },
  navHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: '#0F766E', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  headerTitle: { fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: 0, letterSpacing: '-0.2px' },
  headerSub: { fontSize: '12px', color: '#64748B', fontWeight: '500' },
  teamTabContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' },
  teamTabActive: { padding: '10px 12px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  teamTabInactive: { padding: '10px 12px', backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  statusBanner: { backgroundColor: '#F0FDF4', border: '1px solid #99F6E4', color: '#0F766E', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', marginBottom: '16px', lineHeight: '1.4' },
  loadingBox: { padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' },
  emptyCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' },
  emptyTitle: { fontSize: '14px', fontWeight: '700', color: '#0F766E', marginBottom: '4px' },
  emptySub: { fontSize: '12px', color: '#64748B' },
  reportsStack: { display: 'flex', flexDirection: 'column', gap: '14px' },
  reportCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  badgeDispatched: { fontSize: '11px', fontWeight: '700', backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' },
  badgeEnRoute: { fontSize: '11px', fontWeight: '700', backgroundColor: '#DBEAFE', color: '#1D4ED8', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' },
  badgeOnScene: { fontSize: '11px', fontWeight: '700', backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' },
  ticketTag: { fontSize: '12px', fontWeight: '700', color: '#0F766E', backgroundColor: '#CCFBF1', padding: '3px 8px', borderRadius: '6px' },
  reportTitle: { fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px 0', lineHeight: '1.3' },
  reportMeta: { fontSize: '12px', color: '#475569', margin: '3px 0', lineHeight: '1.4', fontWeight: '500' },
  descriptionBox: { backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#334155', margin: '10px 0', lineHeight: '1.5' },
  actionRow: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' },
  btnEnRoute: { padding: '10px', backgroundColor: '#1D4ED8', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  btnOnScene: { padding: '10px', backgroundColor: '#15803D', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  btnResolveModal: { padding: '10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  modalTitle: { fontSize: '15px', fontWeight: '700', color: '#0F172A' },
  closeBtn: { backgroundColor: '#F1F5F9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', fontSize: '12px', fontWeight: '700', color: '#64748B', cursor: 'pointer' },
  modalTicket: { fontSize: '12px', fontWeight: '700', color: '#0F766E' },
  modalHazard: { fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '14px' },
  formGroup: { marginBottom: '14px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#0F766E', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.5' },
  previewBox: { width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #0F766E', marginBottom: '8px' },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  fileDropzone: { border: '2px dashed #0F766E', backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '8px', display: 'block', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#0F766E', cursor: 'pointer' },
  modalBtnRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  cancelBtn: { flex: 1, padding: '10px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: '10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }
};