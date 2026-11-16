import React, { useState } from 'react';

export default function LandingScreen({ onResidentAccess, onGuestAccess }) {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingChoice, setPendingChoice] = useState(null); // 'resident' | 'guest'

  const handleSelectChoice = (choice) => {
    setPendingChoice(choice);
    setShowConfirmModal(true);
  };

  const confirmChoiceExecution = () => {
    setShowConfirmModal(false);
    if (pendingChoice === 'resident') {
      localStorage.setItem('agap_user_access_type', 'resident');
      setSelectedStatus('resident');
      onResidentAccess();
    } else if (pendingChoice === 'guest') {
      localStorage.setItem('agap_user_access_type', 'guest');
      setSelectedStatus('guest');
      onGuestAccess();
    }
  };

  return (
    <div style={styles.pageBackground}>
      <div style={styles.cardContainer}>
        <div style={styles.logoWrapper}>
          <div style={styles.logoBox}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
          </div>
          <div style={styles.logoText}>PROJECT AGAP</div>
          <div style={styles.logoSubtext}>BATANGAS EMERGENCY NETWORK</div>
        </div>

        <h1 style={styles.mainTitle}>Community Safety Portal</h1>
        <p style={styles.subtitle}>
          Direct emergency reporting, hazard monitoring, and LGU dispatch system for Batangas City residents.
        </p>

        <div style={styles.verificationCard}>
          <div style={styles.sectionHeader}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span style={styles.cardQuestion}>Location & Access Check</span>
          </div>
          <p style={styles.cardBodyText}>
            Are you currently residing in or located within Batangas Province?
          </p>

          <div style={styles.buttonStack}>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => handleSelectChoice('resident')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Yes, I am in Batangas</span>
            </button>

            <button
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={() => handleSelectChoice('guest')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>No, I am Outside Batangas</span>
            </button>
          </div>
        </div>

        <div style={styles.footerInfo}>
          Official LGU Emergency Hotlines | <strong>(043) 723-0000</strong>
        </div>
      </div>

      {/* 2nd Verification Confirmation Modal */}
      {showConfirmModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowConfirmModal(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>CONFIRM ACCESS TYPE</span>
              <button style={styles.closeBtn} onClick={() => setShowConfirmModal(false)}>✕</button>
            </div>
            <p style={styles.modalBodyText}>
              Are you sure you want to enter Project AGAP as a <strong>{pendingChoice === 'resident' ? 'Batangas Resident' : 'Guest Visitor'}</strong>?
            </p>
            <p style={styles.modalSubNote}>
              {pendingChoice === 'resident'
                ? 'Residents can file hazard reports and request full profile verification.'
                : 'Guest visitors can view hazard maps and call hotlines. Incident reporting requires profile verification.'}
            </p>

            <div style={styles.modalBtnRow}>
              <button style={styles.cancelBtn} onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button style={styles.confirmSendBtn} onClick={confirmChoiceExecution}>Confirm & Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageBackground: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#E2E8F0', padding: '20px 16px', fontFamily: "'Inter', sans-serif" },
  cardContainer: { backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '36px 24px', maxWidth: '420px', width: '100%', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)', textAlign: 'center', boxSizing: 'border-box' },
  logoWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' },
  logoBox: { width: '64px', height: '64px', borderRadius: '18px', backgroundColor: '#CCFBF1', border: '2px solid #0F766E', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px' },
  logoText: { fontSize: '18px', fontWeight: '900', color: '#0F172A', letterSpacing: '1px' },
  logoSubtext: { fontSize: '10px', fontWeight: '700', color: '#0F766E', letterSpacing: '0.8px', marginTop: '2px' },
  mainTitle: { color: '#0F172A', fontSize: '22px', fontWeight: '800', margin: '0 0 8px 0', lineHeight: '1.2' },
  subtitle: { color: '#334155', fontSize: '13px', lineHeight: '1.5', margin: '0 0 28px 0', padding: '0 8px' },
  verificationCard: { backgroundColor: '#F8FAFC', borderRadius: '18px', padding: '20px', border: '1px solid #E2E8F0', textAlign: 'left' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  cardQuestion: { color: '#0F172A', fontSize: '14px', fontWeight: '700' },
  cardBodyText: { color: '#475569', fontSize: '12px', lineHeight: '1.5', margin: '0 0 20px 0' },
  buttonStack: { display: 'flex', flexDirection: 'column', gap: '12px' },
  btn: { width: '100%', padding: '14px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  btnPrimary: { backgroundColor: '#0F766E', color: '#FFFFFF', boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' },
  btnSecondary: { backgroundColor: '#E2E8F0', color: '#334155' },
  footerInfo: { marginTop: '28px', fontSize: '11px', color: '#475569' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', maxWidth: '360px', width: '100%', textAlign: 'left' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  modalTitle: { fontSize: '12px', fontWeight: '800', color: '#0F172A' },
  closeBtn: { backgroundColor: '#F1F5F9', border: 'none', width: '24px', height: '24px', borderRadius: '50%', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  modalBodyText: { fontSize: '12px', color: '#334155', lineHeight: '1.4', margin: '0 0 6px 0' },
  modalSubNote: { fontSize: '11px', color: '#334155', lineHeight: '1.4', margin: '0 0 16px 0', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '8px' },
  modalBtnRow: { display: 'flex', gap: '8px' },
  cancelBtn: { flex: 1, padding: '10px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  confirmSendBtn: { flex: 1, padding: '10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }
};
