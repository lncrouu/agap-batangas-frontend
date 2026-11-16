import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ProfileScreen({ onBack, onAdminLogin, onNavigate }) {
  const [deviceId, setDeviceId] = useState('');
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [barangay, setBarangay] = useState('Brgy. Alangilan');
  const [idProofPhoto, setIdProofPhoto] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    let localDeviceId = localStorage.getItem('agap_device_id');
    if (!localDeviceId) {
      localDeviceId = 'DEV-' + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('agap_device_id', localDeviceId);
    }
    setDeviceId(localDeviceId);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Authenticated guest session is missing.');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setUsername(data.username || '');
        setFullName(data.full_name || '');
<<<<<<< HEAD
        setPhone(data.phone_number || '');
=======
        setPhone(data.phone || data.phone_number || '');
>>>>>>> 00f93ad (Admin Update)
        setBarangay(data.barangay || 'Brgy. Alangilan');
        setIdProofPhoto(data.id_proof_photo || '');
      }
    } catch (err) {
      console.error('Unable to load profile:', err.message);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setIdProofPhoto(reader.result);
    };
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (isPending) {
      return alert('VERIFICATION LOCKED: Your residency verification is currently pending review by CDRRMO Batangas. Submissions are locked until processed.');
    }

    if (!fullName.trim()) return alert('MISSING FULL NAME: Please enter your Full Name.');
    if (!username.trim()) return alert('MISSING USERNAME: Please enter a Username.');

    const cleanPhone = phone.trim();
    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return alert('INVALID MOBILE NUMBER: Please enter a valid Philippine mobile number (e.g., 09171234567 or +639171234567).');
    }

    if (!barangay.trim()) return alert('MISSING BARANGAY: Please enter your Barangay / Municipality in Batangas.');

    if (!idProofPhoto) {
      return alert('PROOF OF RESIDENCY REQUIRED: Please upload a photo of your Government ID or Barangay Certificate before submitting.');
    }

    if (!privacyConsent) {
      return alert('CONSENT REQUIRED: Please check the Privacy & Data Consent box before submitting your residency verification.');
    }

    setIsSubmitting(true);

    try {
      const payload = {
<<<<<<< HEAD
        username: username,
        full_name: fullName,
        phone_number: phone,
        barangay: barangay,
        verification_status: 'PENDING',
        ...(idProofPhoto ? { id_proof_photo: idProofPhoto } : {})
=======
        username: username.trim(),
        full_name: fullName.trim(),
        phone: cleanPhone,
        phone_number: cleanPhone,
        barangay: barangay.trim(),
        id_proof_photo: idProofPhoto,
        verification_status: 'PENDING'
>>>>>>> 00f93ad (Admin Update)
      };

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Authenticated guest session is missing.');

      if (profile) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('auth_user_id', user.id);
        if (error) throw error;

        alert('Residency Verification Request Sent to CDRRMO Batangas! Status: PENDING');
        setProfile({ ...profile, ...payload });
        setIsEditing(false);
      } else {
        const insertPayload = {
          id: `USER-${user.id}`,
          auth_user_id: user.id,
          device_id: deviceId,
<<<<<<< HEAD
          username: username,
          full_name: fullName,
          phone_number: phone,
          barangay: barangay,
          user_role: 'GUEST',
          verification_status: 'PENDING',
          id_proof_photo: idProofPhoto
        };

        const { error } = await supabase.from('profiles').insert([insertPayload]);
=======
          user_role: 'RESIDENT',
          ...payload
        };

        const { data, error } = await supabase
          .from('profiles')
          .insert([insertPayload])
          .select()
          .single();

>>>>>>> 00f93ad (Admin Update)
        if (error) throw error;

        alert('Residency Verification Request Sent to CDRRMO Batangas! Status: PENDING');
        setProfile(data);
        setIsEditing(false);
      }
    } catch (err) {
      alert(`Profile update failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVerified = (profile?.verification_status || profile?.status || '').toUpperCase() === 'VERIFIED';
  const isPending = (profile?.verification_status || profile?.status || '').toUpperCase() === 'PENDING';
  const isRejected = (profile?.verification_status || profile?.status || '').toUpperCase() === 'REJECTED';

  const toggleSection = (sectionKey) => {
    setOpenSection(prev => prev === sectionKey ? null : sectionKey);
  };

  return (
    <div style={styles.container}>
      {/* Top Header Bar with Discrete SVG Lock Icon */}
      <div style={styles.navHeader}>
        <button style={styles.backBtn} onClick={onBack}>&lt; Back</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 style={styles.headerTitle}>Citizen Profile</h2>
          <div style={styles.headerSub}>Project AGAP Resident System</div>
        </div>
        <button 
          style={styles.headerLockBtn} 
          onClick={onAdminLogin}
          title="CDRRMO Admin Gateway"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
      </div>

      {/* Main Single-Page Vertical Scrolling Stack */}
      <div style={styles.scrollStack}>
        
        {/* Notice Banners */}
        {isRejected && (
          <div style={styles.rejectedNoticeCard}>
            <div style={styles.rejectedTitle}>PREVIOUS APPLICATION REJECTED</div>
            <p style={styles.rejectedBody}>
              Your previous residency verification request was rejected by CDRRMO Admin. Please review your information, attach a valid Government ID or Barangay Certificate, and resubmit below.
            </p>
          </div>
        )}

        {isPending && (
          <div style={styles.pendingNoticeCard}>
            <div style={styles.pendingTitle}>VERIFICATION IN PROGRESS</div>
            <p style={styles.pendingBody}>
              Your residency verification request and ID proof have been transmitted to CDRRMO Batangas. Submissions are locked until your application is processed (accepted or rejected).
            </p>
          </div>
        )}

        {!isVerified && !isPending && !isRejected && (
          <div style={styles.guestNoticeCard}>
            <div style={styles.noticeCardTitle}>BATANGAS RESIDENCY NOTICE</div>
            <p style={styles.noticeCardBody}>
              Residency verification is strictly intended for official citizens of Batangas Province to unlock direct SMS alerts and verified citizen status. Visitors operate in Guest Mode without needing to verify.
            </p>
          </div>
        )}

        {/* User Identity Card */}
        <div style={styles.profileCard}>
          <div style={styles.rowBetween}>
            <span style={isVerified ? styles.badgeVerified : isPending ? styles.badgePending : isRejected ? styles.badgeRejected : styles.badgeGuest}>
              {isVerified ? 'VERIFIED BATANGAS RESIDENT' : isPending ? 'VERIFICATION PENDING' : isRejected ? 'APPLICATION REJECTED' : 'UNVERIFIED GUEST DEVICE'}
            </span>
            <span style={styles.deviceIdTag}>Device ID: {deviceId}</span>
          </div>

<<<<<<< HEAD
          <h3 style={styles.userName}>Username: @{profile.username || 'User'}</h3>
          <div style={styles.userMeta}>Full Legal Name: {profile.full_name}</div>
          <div style={styles.userMeta}>Barangay Residency: {profile.barangay}</div>
          <div style={styles.userMeta}>Phone Number: {profile.phone_number || 'Not provided'}</div>
=======
          {profile && profile.username && (
            <h3 style={styles.highlightUsername}>@{profile.username}</h3>
          )}
          <h4 style={styles.userName}>{fullName || profile?.full_name || 'Guest Citizen'}</h4>
          <p style={styles.userMeta}>Barangay: {barangay || profile?.barangay || 'Not Specified'}</p>
          <p style={styles.userMeta}>Mobile: {phone || profile?.phone || 'Not Specified'}</p>
>>>>>>> 00f93ad (Admin Update)

          {!isEditing && (
            <button 
              style={isPending ? styles.editBtnDisabled : styles.editBtn} 
              onClick={() => {
                if (isPending) {
                  alert('VERIFICATION LOCKED: Application is currently pending review by CDRRMO Admin.');
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isPending}
            >
              {isPending ? 'Verification Pending Review (Locked)' : isRejected ? 'Resubmit Residency Proof' : profile ? 'Edit Profile / Resubmit Proof' : 'Request Residency Verification'}
            </button>
          )}
        </div>

        {/* Field Responder Portal Card */}
        <div style={styles.responderLauncherCard} onClick={() => onNavigate && onNavigate('responder')}>
          <div style={styles.responderLeft}>
            <div style={styles.responderIconSquare}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="12 8 12 12 15 15"/>
              </svg>
            </div>
            <div>
              <div style={styles.responderCardTitle}>CDRRMO Field Responder Portal</div>
              <div style={styles.responderCardSub}>Dedicated portal for active rescue squads & BFP field units</div>
            </div>
          </div>
          <span style={styles.responderActionText}>Open Portal &rarr;</span>
        </div>

        {/* Verification Form (Expanded when editing) */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} style={styles.formCard}>
            <h3 style={styles.formTitle}>Batangas Residency Verification Form</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>1. FULL LEGAL NAME *</label>
              <input
                type="text"
                style={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Juan Delacruz"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>2. USERNAME *</label>
              <input
                type="text"
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. JuanBatangas2026"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>3. PHILIPPINE MOBILE NUMBER *</label>
              <input
                type="tel"
                style={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 09171234567 or +639171234567"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>4. BARANGAY / MUNICIPALITY IN BATANGAS *</label>
              <input
                type="text"
                style={styles.input}
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                placeholder="e.g. Brgy. Alangilan, Batangas City"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>5. PROOF OF CITIZENSHIP / RESIDENCY (MANDATORY ID) *</label>
              {idProofPhoto && (
                <div style={styles.previewBox}>
                  <img src={idProofPhoto} alt="ID Proof" style={styles.previewImg} />
                </div>
              )}
              <label style={styles.fileDropzone}>
                <span>{idProofPhoto ? 'Change Attached ID Photo' : '+ Upload Govt ID / Barangay Certificate'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={styles.consentBox}>
              <input
                type="checkbox"
                id="privacyConsent"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              <label htmlFor="privacyConsent" style={styles.consentLabel}>
                I certify that I am an official resident/citizen of Batangas and consent to secure verification under the Data Privacy Act.
              </label>
            </div>

            <div style={styles.btnRow}>
              <button type="button" style={styles.cancelBtn} onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" style={isSubmitting ? styles.submitBtnDisabled : styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Transmitting...' : 'Submit Verification Request'}
              </button>
            </div>
          </form>
        )}

        {/* Collapsible Titled Accordion Sections */}
        <div style={styles.accordionContainer}>
          <div style={styles.accordionCard}>
            <div style={styles.accordionHeader} onClick={() => toggleSection('PROFILE')}>
              <span style={styles.accordionTitle}>Profile & Residency Verification Details</span>
              <span style={styles.accordionArrow}>{openSection === 'PROFILE' ? '▲' : '▼'}</span>
            </div>
            {openSection === 'PROFILE' && (
              <div style={styles.accordionBody}>
                <p style={styles.accordionText}>Identity verification provides direct CDRRMO SMS emergency dispatches and priority triage status during provincial crisis events.</p>
              </div>
            )}
          </div>

          <div style={styles.accordionCard}>
            <div style={styles.accordionHeader} onClick={() => toggleSection('ALERTS')}>
              <span style={styles.accordionTitle}>System Notification Preferences</span>
              <span style={styles.accordionArrow}>{openSection === 'ALERTS' ? '▲' : '▼'}</span>
            </div>
            {openSection === 'ALERTS' && (
              <div style={styles.accordionBody}>
                <p style={styles.accordionText}>Real-time disaster push notifications and emergency broadcast alerts are active for this registered device fingerprint.</p>
              </div>
            )}
          </div>

          <div style={styles.accordionCard}>
            <div style={styles.accordionHeader} onClick={() => toggleSection('PRIVACY')}>
              <span style={styles.accordionTitle}>Data Privacy & Security Policy Terms</span>
              <span style={styles.accordionArrow}>{openSection === 'PRIVACY' ? '▲' : '▼'}</span>
            </div>
            {openSection === 'PRIVACY' && (
              <div style={styles.accordionBody}>
                <p style={styles.accordionText}>Your device fingerprint and residency proof documents are encrypted and stored in compliance with the Philippines Data Privacy Act of 2012.</p>
              </div>
            )}
          </div>

          <div style={styles.accordionCard}>
            <div style={styles.accordionHeader} onClick={() => toggleSection('LOCATION')}>
              <span style={styles.accordionTitle}>Reset Location Access Choice</span>
              <span style={styles.accordionArrow}>{openSection === 'LOCATION' ? '▲' : '▼'}</span>
            </div>
            {openSection === 'LOCATION' && (
              <div style={styles.accordionBody}>
                <button 
                  style={styles.resetChoiceBtn} 
                  onClick={() => {
                    localStorage.removeItem('agap_user_access_type');
                    alert('Startup Location Access Choice Reset! Next app launch will prompt location verification.');
                  }}
                >
                  Reset Saved Startup Access Choice
                </button>
              </div>
            )}
          </div>
        </div>

<<<<<<< HEAD
      <div style={styles.adminAccessBox}>
        <span style={styles.adminLabel}>CDRRMO OFFICIAL ACCESS</span>
        <button style={styles.adminPortalBtn} onClick={onAdminLogin}>
          Administrator Sign In
        </button>
=======
>>>>>>> 00f93ad (Admin Update)
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '440px', margin: '0 auto', padding: '16px', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' },
  navHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: '#0F766E', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  headerTitle: { fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 },
  headerSub: { fontSize: '11px', color: '#64748B' },
  headerLockBtn: { backgroundColor: '#F0FDF4', border: '1px solid #99F6E4', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },
  scrollStack: { display: 'flex', flexDirection: 'column', gap: '14px' },
  guestNoticeCard: { backgroundColor: '#FFEDD5', border: '1px solid #FDBA74', borderRadius: '12px', padding: '12px' },
  noticeCardTitle: { fontSize: '11px', fontWeight: '800', color: '#C2410C', marginBottom: '4px' },
  noticeCardBody: { fontSize: '10px', color: '#9A3412', lineHeight: '1.4', margin: 0 },
  pendingNoticeCard: { backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '12px', padding: '12px' },
  pendingTitle: { fontSize: '11px', fontWeight: '800', color: '#D97706', marginBottom: '4px' },
  pendingBody: { fontSize: '10px', color: '#B45309', lineHeight: '1.4', margin: 0 },
  rejectedNoticeCard: { backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '12px' },
  rejectedTitle: { fontSize: '11px', fontWeight: '800', color: '#DC2626', marginBottom: '4px' },
  rejectedBody: { fontSize: '10px', color: '#991B1B', lineHeight: '1.4', margin: 0 },
  profileCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  badgeVerified: { fontSize: '9px', fontWeight: '800', backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px' },
  badgePending: { fontSize: '9px', fontWeight: '800', backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '6px' },
  badgeRejected: { fontSize: '9px', fontWeight: '800', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px' },
  badgeGuest: { fontSize: '9px', fontWeight: '800', backgroundColor: '#FFEDD5', color: '#C2410C', padding: '4px 8px', borderRadius: '6px' },
  deviceIdTag: { fontSize: '9px', color: '#64748B', fontWeight: '700' },
  highlightUsername: { fontSize: '16px', fontWeight: '900', color: '#0F766E', margin: '4px 0 2px 0' },
  userName: { fontSize: '14px', fontWeight: '800', color: '#0F172A', margin: '2px 0' },
  userMeta: { fontSize: '11px', color: '#475569', margin: '2px 0' },
  editBtn: { width: '100%', padding: '10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '12px' },
  editBtnDisabled: { width: '100%', padding: '10px', backgroundColor: '#94A3B8', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'not-allowed', marginTop: '12px' },
  responderLauncherCard: { backgroundColor: '#F0FDF4', border: '1px solid #CCFBF1', borderRadius: '14px', padding: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  responderLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  responderIconSquare: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#CCFBF1', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  responderCardTitle: { fontSize: '12px', fontWeight: '800', color: '#0F172A' },
  responderCardSub: { fontSize: '9px', color: '#64748B' },
  responderActionText: { fontSize: '10px', fontWeight: '800', color: '#0F766E' },
  formCard: { backgroundColor: '#FFFFFF', border: '2px solid #0F766E', borderRadius: '14px', padding: '16px' },
  formTitle: { fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' },
  formGroup: { marginBottom: '12px' },
  label: { fontSize: '9px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' },
  previewBox: { width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #0F766E', marginBottom: '6px' },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  fileDropzone: { border: '2px dashed #0F766E', backgroundColor: '#F0FDF4', padding: '10px', borderRadius: '8px', display: 'block', textAlign: 'center', fontSize: '11px', fontWeight: '800', color: '#0F766E', cursor: 'pointer' },
  consentBox: { display: 'flex', gap: '8px', alignItems: 'flex-start', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '8px', marginBottom: '12px' },
  consentLabel: { fontSize: '10px', color: '#334155', lineHeight: '1.4' },
  btnRow: { display: 'flex', gap: '8px' },
  cancelBtn: { flex: 1, padding: '10px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  submitBtn: { flex: 1, padding: '10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' },
  submitBtnDisabled: { flex: 1, padding: '10px', backgroundColor: '#94A3B8', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'not-allowed' },
  accordionContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
  accordionCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' },
  accordionHeader: { padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: '#F8FAFC' },
  accordionTitle: { fontSize: '11px', fontWeight: '800', color: '#0F172A' },
  accordionArrow: { fontSize: '10px', color: '#64748B' },
  accordionBody: { padding: '12px 14px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' },
  accordionText: { fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: 0 },
  resetChoiceBtn: { width: '100%', padding: '9px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }
};
