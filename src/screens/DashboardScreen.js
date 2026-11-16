import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fetchReports } from '../services/reportService';

export default function DashboardScreen({ onNavigate, userRole = 'GUEST', onOpenProfile }) {
  const [userProfile, setUserProfile] = useState(null);
  const [showSosModal, setShowSosModal] = useState(false);

  useEffect(() => {
    fetchDeviceProfile();
  }, [userRole]);

  const fetchDeviceProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) setUserProfile(data);
    } catch (err) {
      console.error('Unable to load guest profile:', err.message);
    }
  };

<<<<<<< HEAD
  const fetchLiveHazardFeed = async () => {
    setIsLoadingFeed(true);
    try {
      setLiveFeed((await fetchReports({ status: 'APPROVED' })).slice(0, 5));
    } catch (err) {
      console.error('Feed error:', err.message);
    } finally {
      setIsLoadingFeed(false);
    }
  };

=======
>>>>>>> 00f93ad (Admin Update)
  const handleNav = (screenKey) => {
    if (typeof onNavigate === 'function') {
      onNavigate(screenKey);
    }
  };

  const getGreetingUsername = () => {
    if (userProfile && userProfile.username) {
      const u = userProfile.username.trim();
      if (u !== 'Guest User' && !u.startsWith('Guest_') && !u.startsWith('DEV-') && !u.startsWith('GUEST-')) {
        return u;
      }
    }
    if (userProfile && userProfile.full_name) {
      const f = userProfile.full_name.trim();
      if (f !== 'Unverified Guest' && f !== 'Unverified Resident') {
        return f;
      }
    }
    return 'Visitor!';
  };

  const isGuest = !userProfile || userProfile.verification_status !== 'VERIFIED';

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <div style={styles.vibrantHeaderCard}>
        <div style={styles.headerTopRow}>
          <div>
            <span style={styles.brandSub}>PROJECT AGAP BATANGAS</span>
            <h2 style={styles.greetingTitle}>
              Mabuhay, {getGreetingUsername()}
            </h2>
          </div>

          <button
            style={styles.profileAvatarBtn}
            onClick={onOpenProfile}
            title="Open Profile"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>

        <div style={styles.headerBottomRow}>
          <span style={isGuest ? styles.guestPill : styles.citizenPill}>
            {isGuest ? 'GUEST VISITOR MODE' : 'VERIFIED CITIZEN'}
          </span>
          <span style={styles.locationText}>
            Location: {userProfile?.barangay || 'Batangas City Sector'}
          </span>
        </div>
      </div>

      {/* Emergency SOS Dispatch Banner */}
      <div style={styles.sectionHeader}>Emergency SOS Dispatch</div>
      <div style={styles.sosBanner}>
        <div style={styles.sosLeft}>
          <div style={styles.sosIconBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 3-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={styles.sosTitle}>IMMEDIATE CRISIS LINE</div>
            <div style={styles.sosSub}>Batangas City CDRRMO & Police</div>
          </div>
        </div>
        <button style={styles.sosButton} onClick={() => setShowSosModal(true)}>
          Call Hotline
        </button>
      </div>

      {/* Core Functions - 2x2 Grid */}
      <div style={styles.sectionHeader}>Core Functions</div>
      <div style={styles.grid2x2}>
        {/* 1. Submit Hazard Report */}
        <div style={styles.horizontalCardTeal} onClick={() => handleNav('submit-report')}>
          <div style={styles.cardIconSquareTeal}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div style={styles.cardContentRight}>
            <h3 style={styles.cardTitle}>Submit Hazard</h3>
            <p style={styles.cardDesc}>Report flooding, power lines, or road hazards.</p>
            <span style={styles.cardActionText}>Report Now &rarr;</span>
          </div>
        </div>

        {/* 2. Hotline Directory */}
        <div style={styles.horizontalCardWhite} onClick={() => handleNav('hotlines')}>
          <div style={styles.cardIconSquareGray}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div style={styles.cardContentRight}>
            <h3 style={styles.cardTitle}>Hotline Directory</h3>
            <p style={styles.cardDesc}>Direct lines for Police, Fire, Hospitals, CDRRMO.</p>
            <span style={styles.cardActionText}>View Numbers &rarr;</span>
          </div>
        </div>

        {/* 3. Danger Zone Map */}
        <div style={styles.horizontalCardWhite} onClick={() => handleNav('danger-map')}>
          <div style={styles.cardIconSquareGray}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
          </div>
          <div style={styles.cardContentRight}>
            <h3 style={styles.cardTitle}>Danger Zone Map</h3>
            <p style={styles.cardDesc}>View active pins, flood risks, and safe shelters.</p>
            <span style={styles.cardActionText}>View Map &rarr;</span>
          </div>
        </div>

        {/* 4. Report Tracker */}
        <div style={styles.horizontalCardWhite} onClick={() => handleNav('tracker')}>
          <div style={styles.cardIconSquareGray}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div style={styles.cardContentRight}>
            <h3 style={styles.cardTitle}>Report Tracker</h3>
            <p style={styles.cardDesc}>Check submitted report progress and LGU status.</p>
            <span style={styles.cardActionText}>Track Report &rarr;</span>
          </div>
        </div>
      </div>

      {/* Emergency Call List Modal */}
      {showSosModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowSosModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <span style={styles.modalSub}>DIRECT EMERGENCY DIAL</span>
                <h3 style={styles.modalTitle}>Batangas Crisis Hotlines</h3>
              </div>
              <button style={styles.closeBtn} onClick={() => setShowSosModal(false)}>✕</button>
            </div>

            <div style={styles.callList}>
              <a href="tel:161" style={styles.callRowRed}>
                <div style={styles.callLeft}>
                  <div style={styles.callIconRed}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={styles.callName}>CDRRMO Rescue Command</div>
                    <div style={styles.callNum}>Dial 161 or (043) 723-0000</div>
                  </div>
                </div>
                <span style={styles.callActionBtnRed}>Call 161</span>
              </a>

              <a href="tel:117" style={styles.callRowBlue}>
                <div style={styles.callLeft}>
                  <div style={styles.callIconBlue}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={styles.callName}>Batangas City Police PNP</div>
                    <div style={styles.callNum}>Dial 117 or (043) 723-2410</div>
                  </div>
                </div>
                <span style={styles.callActionBtnBlue}>Call 117</span>
              </a>

              <a href="tel:911" style={styles.callRowTeal}>
                <div style={styles.callLeft}>
                  <div style={styles.callIconTeal}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={styles.callName}>National Emergency Line</div>
                    <div style={styles.callNum}>Dial 911</div>
                  </div>
                </div>
                <span style={styles.callActionBtnTeal}>Call 911</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '440px', margin: '0 auto', padding: '16px', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' },
  vibrantHeaderCard: { background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)', borderRadius: '18px', padding: '16px', marginBottom: '18px', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(15, 118, 110, 0.2)' },
  headerTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  brandSub: { fontSize: '9px', fontWeight: '800', color: '#99F6E4', letterSpacing: '0.8px' },
  greetingTitle: { fontSize: '18px', fontWeight: '800', color: '#FFFFFF', margin: '2px 0 0 0' },
  profileAvatarBtn: { width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#FFFFFF', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
  headerBottomRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' },
  citizenPill: { fontSize: '9px', fontWeight: '800', backgroundColor: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: '6px' },
  guestPill: { fontSize: '9px', fontWeight: '800', backgroundColor: '#FFEDD5', color: '#C2410C', padding: '3px 8px', borderRadius: '6px' },
  locationText: { fontSize: '10px', color: '#E6FFFA', fontWeight: '600' },
  sectionHeader: { fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' },
  sosBanner: { backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '14px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
  sosLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  sosIconBox: { width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  sosTitle: { fontSize: '11px', fontWeight: '800', color: '#991B1B' },
  sosSub: { fontSize: '10px', color: '#B91C1C' },
  sosButton: { backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  grid2x2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' },
  horizontalCardTeal: { backgroundColor: '#F0FDF4', border: '1px solid #CCFBF1', borderRadius: '14px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '10px', boxSizing: 'border-box' },
  horizontalCardWhite: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '10px', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' },
  cardIconSquareTeal: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#CCFBF1', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardIconSquareGray: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F1F5F9', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardContentRight: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 },
  cardTitle: { fontSize: '12px', fontWeight: '800', color: '#0F172A', margin: '0 0 2px 0' },
  cardDesc: { fontSize: '9px', color: '#64748B', lineHeight: '1.3', margin: '0 0 6px 0' },
  cardActionText: { fontSize: '10px', fontWeight: '800', color: '#0F766E' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
  modalSub: { fontSize: '8px', fontWeight: '800', color: '#DC2626', letterSpacing: '0.8px' },
  modalTitle: { fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: '2px 0 0 0' },
  closeBtn: { backgroundColor: '#F1F5F9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', fontSize: '12px', fontWeight: '800', cursor: 'pointer', color: '#475569' },
  callList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  callRowRed: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '12px', borderRadius: '12px', textDecoration: 'none' },
  callRowBlue: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px', borderRadius: '12px', textDecoration: 'none' },
  callRowTeal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', border: '1px solid #CCFBF1', padding: '12px', borderRadius: '12px', textDecoration: 'none' },
  callLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  callIconRed: { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEE2E2', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  callIconBlue: { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#DBEAFE', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  callIconTeal: { width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#CCFBF1', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  callName: { fontSize: '12px', fontWeight: '800', color: '#0F172A' },
  callNum: { fontSize: '10px', color: '#64748B' },
  callActionBtnRed: { backgroundColor: '#DC2626', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' },
  callActionBtnBlue: { backgroundColor: '#1E40AF', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' },
  callActionBtnTeal: { backgroundColor: '#0F766E', color: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }
};
