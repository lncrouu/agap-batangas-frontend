import React, { useState, useEffect } from 'react';
import { adminSupabase } from '../supabaseClient';
import {
  deleteRejectedReportsInDb,
  fetchAdminReports,
  updateReportStatusInDb,
} from '../services/adminService';

// Hoisted Helper Functions
function parsePhotos(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === 'string') return item;
      if (item && item.base64) return item.base64;
      if (item && item.url) return item.url;
      return null;
    }).filter(Boolean);
  }
  if (typeof raw === 'object') {
    if (raw.base64) return [raw.base64];
    if (raw.url) return [raw.url];
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            if (typeof item === 'string') return item;
            if (item && item.base64) return item.base64;
            if (item && item.url) return item.url;
            return null;
          }).filter(Boolean);
        }
      } catch (e) {}
    }
    return [trimmed];
  }
  return [];
}

function getSubmitterInfo(reportObj, profiles = []) {
  if (!reportObj) return { username: 'Device User', deviceId: 'N/A', status: 'GUEST', profile: null, phone: null };
  const matchedProfile = profiles.find((p) => p.device_id && p.device_id === reportObj.device_id);
  if (matchedProfile) {
    return {
      username: matchedProfile.username || matchedProfile.full_name || `Device ID: ${matchedProfile.device_id}`,
      deviceId: matchedProfile.device_id,
      status: matchedProfile.verification_status || 'GUEST',
      phone: matchedProfile.phone_number || null,
      profile: matchedProfile
    };
  }
  return {
    username: `Device ID: ${reportObj.device_id || 'DEV-UNKNOWN'}`,
    deviceId: reportObj.device_id || 'DEV-UNKNOWN',
    status: 'GUEST',
    phone: null,
    profile: { device_id: reportObj.device_id || 'DEV-UNKNOWN', verification_status: 'GUEST', phone_number: null }
  };
}

function getUserSubmissions(userObj, reports = []) {
  if (!userObj) return [];
  return reports.filter((r) => 
    (userObj.auth_user_id && r.auth_user_id === userObj.auth_user_id) ||
    (userObj.device_id && r.device_id === userObj.device_id) ||
    (userObj.username && (r.sender_name === userObj.username || r.username === userObj.username))
  );
}

function dispatchSmsNotification(profile, messageText) {
  if (!profile) {
    return { sent: false, reason: 'GUEST_DEVICE', notice: 'In-app update sent to guest device.' };
  }
  const status = (profile.verification_status || '').toUpperCase();
  if (status === 'VERIFIED') {
    const phone = profile.phone_number || 'Registered Mobile';
    return {
      sent: true,
      reason: 'VERIFIED_CITIZEN',
      notice: `SMS Alert Dispatched to Verified Citizen (${phone})`
    };
  }
  return {
    sent: false,
    reason: 'UNVERIFIED_GUEST',
    notice: 'In-app update sent to resident device tracker.'
  };
}

export default function AdminScreen({ onBack }) {
  const [currentView, setCurrentView] = useState('DASHBOARD'); 
  const [submittedSubTab, setSubmittedSubTab] = useState('PENDING'); 
  const [activeSubTab, setActiveSubTab] = useState('TRACKER'); 
  const [userSubTab, setUserSubTab] = useState('VERIFIED'); 
  const [memoSubTab, setMemoSubTab] = useState('PART1'); 
  const [archiveSubTab, setArchiveSubTab] = useState('RESOLVED');

  const [showSubmittedFilter, setShowSubmittedFilter] = useState(false);
  const [showArchiveFilter, setShowArchiveFilter] = useState(false);

  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const [reports, setReports] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [inspectImage, setInspectImage] = useState(null);

  const [tagInputMap, setTagInputMap] = useState({});
  const [selectedBulkCategory, setSelectedBulkCategory] = useState('');
  const [bulkStatus, setBulkStatus] = useState('IN_PROGRESS');
  const [bulkNotice, setBulkNotice] = useState('');
  const [bulkPhoto, setBulkPhoto] = useState(null);
  const [bulkTeam, setBulkTeam] = useState('CDRRMO Rescue Alpha Team');

  const [selectedMemoReport, setSelectedMemoReport] = useState(null);
  const [selectedMemoCategoryGroup, setSelectedMemoCategoryGroup] = useState(null);

  const [submittedSeverityFilter, setSubmittedSeverityFilter] = useState('ALL');
  const [archiveSeverityFilter, setArchiveSeverityFilter] = useState('ALL');

  const [customStartDate, setCustomStartDate] = useState('2026-10-24');
  const [customEndDate, setCustomEndDate] = useState('2026-10-31');

  const [smsLogs, setSmsLogs] = useState([]);

  const responderTeams = [
    { id: 'CDRRMO_ALPHA', name: 'CDRRMO Rescue Alpha Team', category: 'Medical & Disaster Rescue' },
    { id: 'BFP_FIRE_UNIT1', name: 'BFP Fire Station Unit 1', category: 'Fire & Explosion Hazards' },
    { id: 'PNP_PATROL3', name: 'Batangas PNP Patrol Unit 3', category: 'Crime & Security Interventions' },
    { id: 'RED_CROSS_AMB', name: 'Philippine Red Cross Ambulance', category: 'Medical Transport & First Aid' }
  ];

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const fetchedReports = await fetchAdminReports();
      if (fetchedReports) setReports(fetchedReports);

      const { data: profData, error: profileError } = await adminSupabase
        .from('profiles')
        .select('*');
      if (profileError) throw profileError;
      if (profData) setProfiles(profData);
    } catch (err) {
      console.error('Error fetching admin data:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReportStatus = async (reportId, newStatus, extraPayload = {}) => {
    try {
      const updatedReport = await updateReportStatusInDb(reportId, newStatus, extraPayload);

      const targetRep = reports.find((r) => r.id === reportId);
      const submitterProf = profiles.find((p) => p.device_id && p.device_id === targetRep?.device_id);
      
      const smsResult = dispatchSmsNotification(
        submitterProf,
        "Progress Update for Report #" + reportId + ": Status changed to " + newStatus + "."
      );

      setSmsLogs((prev) => [
        {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          text: "[Report #" + reportId + "] " + smsResult.notice,
          type: smsResult.sent ? 'SUCCESS' : 'SKIPPED'
        },
        ...prev
      ]);

      alert("Report Update Saved!\nTicket #" + reportId + " Status: " + newStatus + "\n\n" + smsResult.notice);

      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport({ ...selectedReport, status: newStatus, ...extraPayload });
      }
      fetchAdminData();
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const handleCategorizeReport = async (reportId, categoryName) => {
    if (!categoryName || !categoryName.trim()) return alert('Please type a category name.');
    try {
      const { error } = await adminSupabase
        .from('reports')
        .update({ category: categoryName.trim() })
        .eq('id', reportId);

      if (error) throw error;

      alert('Category tag saved: "' + categoryName.trim() + '" for Report #' + reportId);
      setTagInputMap({ ...tagInputMap, [reportId]: '' });
      fetchAdminData();
    } catch (err) {
      alert("Tagging failed: " + err.message);
    }
  };

  const generateAutomatedDirectiveNotice = (catName, status, teamName, count) => {
    const matching = activeTrackerReports.filter(
      (r) => (r.category || r.hazard_type || '').toUpperCase() === (catName || '').toUpperCase()
    );
    let highestSev = 'HIGH';
    if (matching.some(r => (r.severity || '').toUpperCase() === 'CRITICAL')) highestSev = 'CRITICAL';
    else if (matching.some(r => (r.severity || '').toUpperCase() === 'HIGH')) highestSev = 'HIGH';
    else if (matching.some(r => (r.severity || '').toUpperCase() === 'MEDIUM')) highestSev = 'MEDIUM';
    else if (matching.some(r => (r.severity || '').toUpperCase() === 'LOW')) highestSev = 'LOW';

    const locCount = count || matching.length || 1;
    const catUpper = (catName || 'HAZARD INCIDENT').toUpperCase();

    if (status === 'DISPATCHED') {
      return "[" + catUpper + " - " + highestSev + " SEVERITY]: Response unit (" + teamName + ") deployed to " + locCount + " reported location(s). Perimeter safety active.";
    } else if (status === 'IN_PROGRESS') {
      return "[" + catUpper + " - " + highestSev + " SEVERITY]: Active mitigation and intervention in progress by " + teamName + " across " + locCount + " site(s).";
    } else if (status === 'RESOLVED') {
      return "[" + catUpper + " - " + highestSev + " SEVERITY]: Hazard incident resolved and cleared by " + teamName + ". Area verified safe.";
    }
    return "[" + catUpper + " - " + highestSev + " SEVERITY]: Field operations active by " + teamName + ". Maintain safety distance.";
  };

  useEffect(() => {
    if (selectedBulkCategory && bulkStatus && bulkTeam) {
      const matchingCount = reports.filter(
        (r) => (r.category || '').toUpperCase() === selectedBulkCategory.toUpperCase()
      ).length;
      const autoText = generateAutomatedDirectiveNotice(selectedBulkCategory, bulkStatus, bulkTeam, matchingCount);
      setBulkNotice(autoText);
    }
  }, [selectedBulkCategory, bulkStatus, bulkTeam]);

  const handleBulkBroadcast = async () => {
    if (!selectedBulkCategory) return alert('Please select an active category group.');

    if (bulkStatus === 'RESOLVED' && !bulkPhoto) {
      return alert('Mandatory Completion Photo Proof Required!\nPlease attach an on-site completion photo proof before marking this category group as RESOLVED.');
    }

    const matching = reports.filter(
      (r) => (r.category || '').toUpperCase() === selectedBulkCategory.toUpperCase()
    );

    if (matching.length === 0) return alert('No active reports found in selected category.');

    try {
      const updatePayload = {
        status: bulkStatus,
        notice_text: bulkNotice || '',
        assigned_responder: bulkTeam
      };

      if (bulkPhoto) {
        updatePayload.progress_photo = bulkPhoto;
      }

      const ids = matching.map((r) => r.id);
      const { error } = await adminSupabase
        .from('reports')
        .update(updatePayload)
        .in('id', ids);

      if (error) throw error;

      let verifiedSentCount = 0;
      let guestSkippedCount = 0;

      matching.forEach((rep) => {
        const prof = profiles.find((p) => p.device_id && p.device_id === rep.device_id);
        const res = dispatchSmsNotification(
          prof,
          "BULK ADVISORY [" + selectedBulkCategory + "]: " + (bulkNotice || 'Operations active on site.')
        );
        if (res.sent) verifiedSentCount++;
        else guestSkippedCount++;
      });

      const bulkNoticeSummary = "Bulk SMS Broadcast: " + verifiedSentCount + " Verified Citizens notified via SMS. " + guestSkippedCount + " Guest Devices updated in-app.";

      setSmsLogs((prev) => [
        { id: Date.now(), timestamp: new Date().toLocaleTimeString(), text: bulkNoticeSummary, type: 'SUCCESS' },
        ...prev
      ]);

      alert("Category Bulk Broadcast Executed!\nCategory: " + selectedBulkCategory + "\nUpdated Status: " + bulkStatus + "\n\n" + bulkNoticeSummary);

      setBulkNotice('');
      setBulkPhoto(null);
      fetchAdminData();
    } catch (err) {
      alert("Bulk update failed: " + err.message);
    }
  };

  const handlePhotoUpload = (e, callback) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        if (callback) callback(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateUserStatus = async (deviceId, newStatus) => {
    try {
      const { error } = await adminSupabase
        .from('profiles')
        .update({ verification_status: newStatus })
        .eq('device_id', deviceId);

      if (error) throw error;

      let msgText = "Account status updated to " + newStatus + ".";

      setSmsLogs((prev) => [
        { id: Date.now(), timestamp: new Date().toLocaleTimeString(), text: "[User " + deviceId + "] " + msgText, type: 'SUCCESS' },
        ...prev
      ]);

      alert("User Moderation Update Saved!\nDevice ID: " + deviceId + "\nNew Status: " + newStatus);
      fetchAdminData();
    } catch (err) {
      alert("Moderation failed: " + err.message);
    }
  };

  const handlePurgeAllRejectedData = async () => {
    const rejectedList = reports.filter((r) => ['REJECTED', 'DELETED'].includes((r.status || '').toUpperCase()));
    if (rejectedList.length === 0) {
      alert('No rejected or deleted reports found in archive.');
      return;
    }

    if (window.confirm("Are you sure you want to permanently delete all " + rejectedList.length + " rejected report records from the archive? This action cannot be undone.")) {
      try {
        await deleteRejectedReportsInDb();
        alert('All rejected archive records permanently deleted.');
        setSelectedReport(null);
        fetchAdminData();
      } catch (err) {
        alert("Purge failed: " + err.message);
      }
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleDownloadDocxTemplate = () => {
    const item = selectedMemoCategoryGroup || selectedMemoReport;
    if (!item) return alert('Please select a report or category group first.');

    const title = selectedMemoCategoryGroup
      ? "GROUP ENDORSEMENT: " + selectedMemoCategoryGroup.category
      : "INCIDENT ENDORSEMENT: " + (selectedMemoReport.hazard_type || selectedMemoReport.category);

    const content = `
================================================================================
REPUBLIC OF THE PHILIPPINES
PROVINCE OF BATANGAS • CITY OF BATANGAS
CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE (CDRRMO)
BATANGAS COMMAND CENTER & INCIDENT ENDORSEMENT NETWORK
================================================================================

MEMORANDUM REF NO: MEMO-AGAP-2026-\${(item.id || '001').toString().replace('#', '')}
DATE & TIMESTAMP: \${new Date().toLocaleString()}
SUBJECT: \${title}

I. INCIDENT SPECIFICATION & CITIZEN REPORT SUMMARY
Category Title: \${selectedMemoCategoryGroup ? selectedMemoCategoryGroup.category : (selectedMemoReport.hazard_type || selectedMemoReport.category)}
Report Count: \${selectedMemoCategoryGroup ? selectedMemoCategoryGroup.reports.length : 1} Report(s)
Severity / Urgency Level: HIGH / URGENT - Action Required Within 24 Hours
Location Sector: \${selectedMemoCategoryGroup ? selectedMemoCategoryGroup.locations.join(', ') : selectedMemoReport.location}

II. CITIZEN STATEMENT & INDIVIDUAL INCIDENT BREAKDOWN
\${selectedMemoCategoryGroup ? selectedMemoCategoryGroup.reports.map((r, i) => \`• Ticket #\${r.id || r.ticket_no} - [\${r.hazard_type || r.category || 'Incident'}]: "\${r.description || 'Verified hazard entry.'}" (📍 Location: \${r.location})\`).join('\n') : \`• Ticket #\${selectedMemoReport.id || selectedMemoReport.ticket_no} - [\${selectedMemoReport.hazard_type || selectedMemoReport.category}]: "\${selectedMemoReport.description || 'Verified hazard entry.'}" (📍 Location: \${selectedMemoReport.location})\`}

III. VERIFIED CITIZEN EVIDENCE & PHOTOGRAPHIC PROOF ATTACHMENTS
Total Evidence Photos Attached: \${selectedMemoCategoryGroup ? selectedMemoCategoryGroup.photos.length : parsePhotos(selectedMemoReport.proof_photos || selectedMemoReport.photos).length}

IV. MANDATED ACTION & TRANSMITTAL DIRECTIVE
This official memorandum endorses the above incident to relevant municipal emergency agencies for field verification, site intervention, and resolution.

________________________________________        ________________________________________
CDRRMO COMMAND OFFICER                          RECIPIENT RECEIVING OFFICER
Project AGAP Operations Portal                  Signature & Date / Time Received
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MEMO-AGAP-2026-\${(item.id || '001').toString().replace('#', '')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingSubmittedReports = reports.filter((r) => 
    (r.status || 'PENDING').toUpperCase() === 'PENDING'
  );

  const investigatedSubmittedReports = reports.filter((r) => 
    (r.status || '').toUpperCase() === 'UNDER_INVESTIGATION'
  );

  const activeTrackerReports = reports.filter((r) => 
    ['APPROVED', 'DISPATCHED', 'IN_PROGRESS'].includes((r.status || '').toUpperCase())
  );

  const resolvedReports = reports.filter((r) => 
    (r.status || '').toUpperCase() === 'RESOLVED'
  );

  const rejectedDataReports = reports.filter((r) => 
    ['REJECTED', 'DELETED'].includes((r.status || '').toUpperCase())
  );

  const filteredPendingReports = pendingSubmittedReports.filter((r) => {
    if (submittedSeverityFilter === 'ALL') return true;
    return (r.severity || 'HIGH').toUpperCase() === submittedSeverityFilter.toUpperCase();
  });

  const filteredInvestigatedReports = investigatedSubmittedReports.filter((r) => {
    if (submittedSeverityFilter === 'ALL') return true;
    return (r.severity || 'HIGH').toUpperCase() === submittedSeverityFilter.toUpperCase();
  });

  const filteredRejectedReports = rejectedDataReports.filter((r) => {
    if (archiveSeverityFilter === 'ALL') return true;
    return (r.severity || 'HIGH').toUpperCase() === archiveSeverityFilter.toUpperCase();
  });

  const activeCategoriesList = Array.from(
    new Set(
      activeTrackerReports
        .map((r) => r.category || '')
        .filter((c) => c && c.trim().length > 0 && c.toUpperCase() !== 'OTHER' && c.toUpperCase() !== 'UNCATEGORIZED')
    )
  );

  const uncategorizedReports = activeTrackerReports.filter((r) => {
    const cat = (r.category || '').trim().toUpperCase();
    return !cat || cat === 'OTHER' || cat === 'UNCATEGORIZED';
  });

  const categorizedReports = activeTrackerReports.filter((r) => {
    const cat = (r.category || '').trim().toUpperCase();
    return cat && cat !== 'OTHER' && cat !== 'UNCATEGORIZED';
  });

  const categoryGroupMap = {};
  categorizedReports.forEach((rep) => {
    const cat = rep.category.trim();
    if (!categoryGroupMap[cat]) {
      categoryGroupMap[cat] = {
        id: `CAT-\${cat.toUpperCase().replace(/\s+/g, '-')}`,
        category: cat,
        reports: [],
        locations: new Set(),
        photos: []
      };
    }
    categoryGroupMap[cat].reports.push(rep);
    if (rep.location) categoryGroupMap[cat].locations.add(rep.location);
    const repPhotos = parsePhotos(rep.proof_photos || rep.photos);
    repPhotos.forEach(p => categoryGroupMap[cat].photos.push(p));
  });

  const categoryGroups = Object.values(categoryGroupMap).map(g => ({
    ...g,
    locations: Array.from(g.locations)
  }));

  const verifiedCitizens = profiles
    .filter((p) => (p.verification_status || '').toUpperCase() === 'VERIFIED')
    .sort((a, b) => (a.username || a.full_name || '').localeCompare(b.username || b.full_name || ''));

  const guestUsers = profiles
    .filter((p) => (p.verification_status || '').toUpperCase() !== 'VERIFIED')
    .sort((a, b) => (a.device_id || '').localeCompare(b.device_id || ''));

  const pendingVerificationRequests = profiles
    .filter((p) => p.id_proof_photo && (p.verification_status || '').toUpperCase() !== 'VERIFIED')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  const getVectorLineAnalyticsData = () => {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const diffDays = Math.max(Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1, 3);
    const days = Math.min(diffDays, 14);

    const dateLabels = [];
    const validCounts = [];
    const falseCounts = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateLabels.push(label);

      let vCount = 0;
      let fCount = 0;

      reports.forEach((rep) => {
        if (rep.created_at) {
          const repDate = new Date(rep.created_at).toISOString().split('T')[0];
          if (repDate === dateStr) {
            const st = (rep.status || '').toUpperCase();
            if (st === 'REJECTED' || st === 'DELETED') {
              fCount++;
            } else {
              vCount++;
            }
          }
        }
      });

      validCounts.push(vCount);
      falseCounts.push(fCount);
    }

    const maxVal = Math.max(...validCounts, ...falseCounts, 4);
    const width = 360;
    const height = 110;
    const padding = 24;
    const yBaseline = height - padding - 8;

    const getCoords = (dataArr) => {
      return dataArr.map((val, idx) => {
        const x = padding + (idx / Math.max(days - 1, 1)) * (width - padding * 2);
        const y = yBaseline - (val / maxVal) * (yBaseline - padding);
        return { x, y, val };
      });
    };

    const validCoords = getCoords(validCounts);
    const falseCoords = getCoords(falseCounts);

    const makeSvgPath = (coords) => {
      return coords.map((pt, i) => `\${i === 0 ? 'M' : 'L'} \${pt.x} \${pt.y}`).join(' ');
    };

    return {
      dateLabels,
      validCounts,
      falseCounts,
      validPath: makeSvgPath(validCoords),
      falsePath: makeSvgPath(falseCoords),
      validCoords,
      falseCoords,
      maxVal,
      totalValid: validCounts.reduce((a, b) => a + b, 0),
      totalFalse: falseCounts.reduce((a, b) => a + b, 0)
    };
  };

  const analyticsData = getVectorLineAnalyticsData();

  const getSeverityBadgeStyle = (severity) => {
    const s = (severity || 'HIGH').toUpperCase();
    if (s === 'CRITICAL') return styles.badgeRed;
    if (s === 'HIGH') return styles.badgeOrange;
    if (s === 'MEDIUM') return styles.badgeYellow;
    return styles.badgeTeal;
  };

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');
        
        * {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
      
      {/* Top Header Bar */}
      <div style={styles.navHeader}>
        <button 
          style={styles.backBtn} 
          onClick={currentView === 'DASHBOARD' ? onBack : () => setCurrentView('DASHBOARD')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          {currentView === 'DASHBOARD' ? 'Exit Portal' : 'Main Dashboard'}
        </button>
        <div>
          <h2 style={styles.headerTitle}>CDRRMO Command Portal</h2>
          <div style={styles.headerSub}>Batangas Operations Center</div>
        </div>
      </div>

      {/* MAIN DASHBOARD VIEW */}
      {currentView === 'DASHBOARD' && (
        <div style={styles.dashboardContainer}>
          <div style={styles.welcomeBanner}>
            <div style={styles.welcomeTag}>CDRRMO COMMAND CENTER</div>
            <h3 style={styles.welcomeTitle}>Hello, Admin!</h3>
            <p style={styles.welcomeSubtext}>Welcome back to Project AGAP. Monitor hazards, manage triage queues & coordinate community safety.</p>
          </div>

          <div style={styles.smsStatusCard}>
            <div style={styles.smsStatusHeader}>
              <span style={styles.smsStatusTitle}>SMS NOTIFICATION DISPATCH GATEWAY</span>
              <span style={styles.smsBadgeActive}>ACTIVE</span>
            </div>
            <p style={styles.smsStatusSub}>
              External SMS alerts are dispatched exclusively to <strong>Verified Citizens</strong> with registered mobile numbers. Guest devices receive in-app tracker updates.
            </p>
            {smsLogs.length > 0 && (
              <div style={styles.smsLogBox}>
                <div style={styles.smsLogLabel}>RECENT DISPATCH AUDIT LOG:</div>
                {smsLogs.slice(0, 3).map((log) => (
                  <div key={log.id} style={styles.smsLogRow}>
                    <span style={styles.smsLogTime}>[{log.timestamp}]</span>
                    <span style={log.type === 'SUCCESS' ? styles.smsLogSuccess : styles.smsLogSkipped}>{log.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.moduleSectionTitle}>CORE ADMIN FUNCTIONS</div>
          
          <div style={styles.tableCardContainer}>
            <div style={styles.tableRow} onClick={() => setCurrentView('SUBMITTED_REPORTS')}>
              <div style={styles.tableColIcon}>
                <div style={styles.iconBoxAmber}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
              </div>
              <div style={styles.tableColContent}>
                <div style={styles.tableTitle}>Submitted Queue & Investigation</div>
                <div style={styles.tableDesc}>Review incoming reports, investigate & accept/reject reviewed tickets</div>
              </div>
              <div style={styles.tableColBadge}>
                <span style={styles.badgeOrange}>{pendingSubmittedReports.length + investigatedSubmittedReports.length} Queue</span>
              </div>
            </div>

            <div style={styles.tableRow} onClick={() => setCurrentView('ACTIVE_OPERATIONS')}>
              <div style={styles.tableColIcon}>
                <div style={styles.iconBoxTeal}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                  </svg>
                </div>
              </div>
              <div style={styles.tableColContent}>
                <div style={styles.tableTitle}>Active Operations</div>
                <div style={styles.tableDesc}>Track progress, categorize individual tickets, bulk operations & memos</div>
              </div>
              <div style={styles.tableColBadge}>
                <span style={styles.badgeTeal}>{activeTrackerReports.length} Active</span>
              </div>
            </div>

            <div style={styles.tableRow} onClick={() => setCurrentView('USER_HANDLING')}>
              <div style={styles.tableColIcon}>
                <div style={styles.iconBoxPurple}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
              </div>
              <div style={styles.tableColContent}>
                <div style={styles.tableTitle}>User Management</div>
                <div style={styles.tableDesc}>Directory, ID verification, DEV ID moderation & banning</div>
              </div>
              <div style={styles.tableColBadge}>
                <span style={styles.badgeBlue}>{profiles.length} Accounts</span>
              </div>
            </div>

            <div style={styles.tableRow} onClick={() => setCurrentView('DOCUMENT_GENERATOR')}>
              <div style={styles.tableColIcon}>
                <div style={styles.iconBoxEmerald}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <path d="M9 15l2 2 4-4"/>
                  </svg>
                </div>
              </div>
              <div style={styles.tableColContent}>
                <div style={styles.tableTitle}>Transmittal Memos</div>
                <div style={styles.tableDesc}>Export official inter-agency escalation PDFs & .doc files</div>
              </div>
              <div style={styles.tableColBadge}>
                <span style={styles.badgeGreen}>Official Memo</span>
              </div>
            </div>

            <div style={styles.tableRowLast} onClick={() => setCurrentView('RESOLVED_ARCHIVE')}>
              <div style={styles.tableColIcon}>
                <div style={styles.iconBoxSlate}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8v13H3V8M1 3h22v5H1V3z"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                </div>
              </div>
              <div style={styles.tableColContent}>
                <div style={styles.tableTitle}>Archive</div>
                <div style={styles.tableDesc}>History of resolved individual incidents & clean rejected archive logs</div>
              </div>
              <div style={styles.tableColBadge}>
                <span style={styles.badgeTeal}>{resolvedReports.length + rejectedDataReports.length} Archived</span>
              </div>
            </div>
          </div>

          <div style={styles.dividerRow}>
            <span style={styles.dividerLabel}>INCIDENT SUBMISSION STATISTICS & ANALYTICS</span>
          </div>

          <div style={styles.chartCard}>
            <div style={styles.chartControlRow}>
              <div style={styles.chartTitleTag}>CUSTOM DATE RANGE ANALYTICS</div>
              <div style={styles.dateRangeGroup}>
                <input
                  type="date"
                  style={styles.datePickerInput}
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <span style={styles.toText}>to</span>
                <input
                  type="date"
                  style={styles.datePickerInput}
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>

            <div style={styles.svgGraphBox}>
              <svg width="100%" height="120" viewBox="0 0 360 120" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="tealArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F766E" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="24" y1="10" x2="24" y2="92" stroke="#334155" strokeWidth="1.5" />
                <text x="18" y="16" fontSize="7" fontWeight="700" fill="#64748B" textAnchor="end">{analyticsData.maxVal}</text>
                <text x="18" y="54" fontSize="7" fontWeight="700" fill="#64748B" textAnchor="end">{Math.round(analyticsData.maxVal / 2)}</text>
                <text x="18" y="92" fontSize="7" fontWeight="700" fill="#64748B" textAnchor="end">0</text>

                <line x1="24" y1="92" x2="345" y2="92" stroke="#334155" strokeWidth="1.5" />
                <line x1="24" y1="52" x2="345" y2="52" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="24" y1="14" x2="345" y2="14" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />

                {analyticsData.validCoords.length > 0 && (
                  <path
                    d={`\${analyticsData.validPath} L \${analyticsData.validCoords[analyticsData.validCoords.length - 1].x} 92 L \${analyticsData.validCoords[0].x} 92 Z`}
                    fill="url(#tealArea)"
                  />
                )}

                <path d={analyticsData.validPath} fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" />
                <path d={analyticsData.falsePath} fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="4,3" strokeLinecap="round" />

                {analyticsData.validCoords.map((pt, idx) => (
                  <g key={idx}>
                    <circle cx={pt.x} cy={pt.y} r="3.5" fill="#0F766E" stroke="#FFFFFF" strokeWidth="1.5" />
                    {pt.val > 0 && (
                      <text x={pt.x} y={pt.y - 6} fontSize="7" fontWeight="800" fill="#0F766E" textAnchor="middle">
                        {pt.val}
                      </text>
                    )}
                    <text x={pt.x} y="104" fontSize="6.5" fontWeight="700" fill="#64748B" textAnchor="middle">
                      {analyticsData.dateLabels[idx]}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div style={styles.chartLegendRow}>
              <span style={styles.legendValid}>— Valid Incidents ({analyticsData.totalValid})</span>
              <span style={styles.legendFalse}>- - False/Rejected ({analyticsData.totalFalse})</span>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 1: SUBMITTED QUEUE & INVESTIGATION */}
      {currentView === 'SUBMITTED_REPORTS' && (
        <div style={styles.sectionStack}>
          <div style={styles.subTabContainer}>
            <button
              style={submittedSubTab === 'PENDING' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setSubmittedSubTab('PENDING')}
            >
              Submitted Queue ({pendingSubmittedReports.length})
            </button>
            <button
              style={submittedSubTab === 'INVESTIGATED' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setSubmittedSubTab('INVESTIGATED')}
            >
              Investigated Queue ({investigatedSubmittedReports.length})
            </button>
          </div>

          {submittedSubTab === 'PENDING' && (
            <div style={styles.sectionStack}>
              <div style={{ marginBottom: '8px' }}>
                <button
                  style={styles.btnToggleFilter}
                  onClick={() => setShowSubmittedFilter(!showSubmittedFilter)}
                >
                  Filter by Severity {showSubmittedFilter ? '▲' : '▼'} {submittedSeverityFilter !== 'ALL' ? `(\${submittedSeverityFilter})` : ''}
                </button>

                {showSubmittedFilter && (
                  <div style={styles.filterBarRow}>
                    <span style={styles.filterLabel}>SEVERITY LEVEL:</span>
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                      <button
                        key={sev}
                        style={submittedSeverityFilter === sev ? styles.filterBtnActive : styles.filterBtnInactive}
                        onClick={() => setSubmittedSeverityFilter(sev)}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredPendingReports.length === 0 ? (
                <div style={styles.emptyCard}>No pending submitted reports in queue.</div>
              ) : (
                filteredPendingReports.map((rep) => {
                  const isExpanded = expandedTicketId === rep.id;
                  const photoList = parsePhotos(rep.proof_photos || rep.photos);
                  const submitter = getSubmitterInfo(rep, profiles);
                  const ticketNum = rep.id || rep.ticket_no || 'TKT-001';
                  const title = rep.hazard_type || rep.category || 'Hazard Incident';
                  const status = rep.status || 'PENDING';
                  const ticketTitle = rep.description || 'Verified hazard entry.';

                  return (
                    <div key={rep.id} style={styles.itemCardAccordion} onClick={() => setExpandedTicketId(isExpanded ? null : rep.id)}>
                      <div style={styles.cardHeaderRow}>
                        <div style={styles.headerTitleGroup}>
                          <span style={styles.ticketBadge}>{ticketNum}</span>
                          <span style={styles.badgeOrange}>{status}</span>
                          <span style={getSeverityBadgeStyle(rep.severity)}>{(rep.severity || 'HIGH').toUpperCase()}</span>
                        </div>
                        <span style={styles.userMetaText}>Device ID: {submitter.deviceId}</span>
                      </div>

                      <h4 style={styles.itemTitle}>{title}</h4>
                      <p style={styles.ticketSubTitleText}>"{ticketTitle}"</p>

                      {!isExpanded ? (
                        <div style={styles.expandHintText}>Click to expand full details & investigation controls &rarr;</div>
                      ) : (
                        <div style={styles.accordionDetailBox} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.detailGridPlain}>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>LOCATION LANDMARK:</span>
                              <span style={styles.fieldValText}>{rep.location}</span>
                            </div>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>SUBMITTER IDENTIFICATION:</span>
                              <span style={styles.fieldValText}>Device ID: {submitter.deviceId}</span>
                            </div>
                          </div>

                          <div style={styles.mapContainerBox}>
                            <span style={styles.fieldLabel}>LOCATION MAP PREVIEW (Click to open Google Maps):</span>
                            <div 
                              style={styles.gpsMapBoxInteractive} 
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}`, '_blank')}
                              title="Click to open in Google Maps"
                            >
                              <iframe
                                title="Report GPS Location"
                                width="100%"
                                height="130"
                                frameBorder="0"
                                scrolling="no"
                                src={`https://maps.google.com/maps?q=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}&t=m&z=16&ie=UTF8&iwloc=&output=embed`}
                                style={{ borderRadius: '6px', pointerEvents: 'none' }}
                              ></iframe>
                              <div style={styles.mapOverlayBadge}>Open in Google Maps &rarr;</div>
                            </div>
                          </div>

                          {photoList.length > 0 && (
                            <div style={styles.detailSectionPlain}>
                              <span style={styles.fieldLabel}>ATTACHED EVIDENCE PHOTOS ({photoList.length}):</span>
                              <div style={styles.photoGalleryGrid}>
                                {photoList.map((src, idx) => (
                                  <img
                                    key={idx}
                                    src={src}
                                    alt={`Evidence \${idx + 1}`}
                                    style={styles.thumbImgFixed}
                                    onClick={() => setInspectImage(src)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={styles.actionRow}>
                            <button
                              style={styles.btnInvestigate}
                              onClick={() => handleUpdateReportStatus(rep.id, 'UNDER_INVESTIGATION')}
                            >
                              Investigate Ticket
                            </button>
                            <button
                              style={styles.btnReject}
                              onClick={() => handleUpdateReportStatus(rep.id, 'REJECTED')}
                            >
                              Reject Ticket
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {submittedSubTab === 'INVESTIGATED' && (
            <div style={styles.sectionStack}>
              {filteredInvestigatedReports.length === 0 ? (
                <div style={styles.emptyCard}>No investigated tickets awaiting review.</div>
              ) : (
                filteredInvestigatedReports.map((rep) => {
                  const isExpanded = expandedTicketId === rep.id;
                  const photoList = parsePhotos(rep.proof_photos || rep.photos);
                  const submitter = getSubmitterInfo(rep, profiles);
                  const ticketNum = rep.id || rep.ticket_no || 'TKT-001';
                  const title = rep.hazard_type || rep.category || 'Hazard Incident';
                  const status = rep.status || 'UNDER_INVESTIGATION';
                  const ticketTitle = rep.description || 'Verified hazard entry.';

                  return (
                    <div key={rep.id} style={styles.itemCardAccordion} onClick={() => setExpandedTicketId(isExpanded ? null : rep.id)}>
                      <div style={styles.cardHeaderRow}>
                        <div style={styles.headerTitleGroup}>
                          <span style={styles.ticketBadge}>{ticketNum}</span>
                          <span style={styles.badgeTeal}>{status}</span>
                          <span style={getSeverityBadgeStyle(rep.severity)}>{(rep.severity || 'HIGH').toUpperCase()}</span>
                        </div>
                        <span style={styles.userMetaText}>Device ID: {submitter.deviceId}</span>
                      </div>

                      <h4 style={styles.itemTitle}>{title}</h4>
                      <p style={styles.ticketSubTitleText}>"{ticketTitle}"</p>

                      {!isExpanded ? (
                        <div style={styles.expandHintText}>Click to expand & accept/reject investigated ticket &rarr;</div>
                      ) : (
                        <div style={styles.accordionDetailBox} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.detailGridPlain}>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>LOCATION LANDMARK:</span>
                              <span style={styles.fieldValText}>{rep.location}</span>
                            </div>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>SUBMITTER IDENTIFICATION:</span>
                              <span style={styles.fieldValText}>Device ID: {submitter.deviceId}</span>
                            </div>
                          </div>

                          <div style={styles.mapContainerBox}>
                            <span style={styles.fieldLabel}>LOCATION MAP PREVIEW (Click to open Google Maps):</span>
                            <div 
                              style={styles.gpsMapBoxInteractive} 
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}`, '_blank')}
                              title="Click to open in Google Maps"
                            >
                              <iframe
                                title="Report GPS Location"
                                width="100%"
                                height="130"
                                frameBorder="0"
                                scrolling="no"
                                src={`https://maps.google.com/maps?q=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}&t=m&z=16&ie=UTF8&iwloc=&output=embed`}
                                style={{ borderRadius: '6px', pointerEvents: 'none' }}
                              ></iframe>
                              <div style={styles.mapOverlayBadge}>Open in Google Maps &rarr;</div>
                            </div>
                          </div>

                          {photoList.length > 0 && (
                            <div style={styles.detailSectionPlain}>
                              <span style={styles.fieldLabel}>ATTACHED EVIDENCE PHOTOS ({photoList.length}):</span>
                              <div style={styles.photoGalleryGrid}>
                                {photoList.map((src, idx) => (
                                  <img
                                    key={idx}
                                    src={src}
                                    alt={`Evidence \${idx + 1}`}
                                    style={styles.thumbImgFixed}
                                    onClick={() => setInspectImage(src)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={styles.actionRow}>
                            <button
                              style={styles.btnApprove}
                              onClick={() => handleUpdateReportStatus(rep.id, 'APPROVED')}
                            >
                              Accept / Approve Ticket
                            </button>
                            <button
                              style={styles.btnReject}
                              onClick={() => handleUpdateReportStatus(rep.id, 'REJECTED')}
                            >
                              Reject Ticket
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* MODULE 2: ACTIVE OPERATIONS */}
      {currentView === 'ACTIVE_OPERATIONS' && (
        <div style={styles.sectionStack}>
          <div style={styles.subTabContainer}>
            <button
              style={activeSubTab === 'TRACKER' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setActiveSubTab('TRACKER')}
            >
              Active Individual Tickets ({activeTrackerReports.length})
            </button>
            <button
              style={activeSubTab === 'BULK' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setActiveSubTab('BULK')}
            >
              Category Bulk Operations & Memos
            </button>
          </div>

          {activeSubTab === 'TRACKER' && (
            <div style={styles.sectionStack}>
              <div style={styles.sectionSubTitle}>UNCATEGORIZED INDIVIDUAL TICKETS ({uncategorizedReports.length})</div>
              {uncategorizedReports.length === 0 ? (
                <div style={styles.emptyCard}>No uncategorized active tickets. All active tickets are currently assigned categories.</div>
              ) : (
                uncategorizedReports.map((rep) => {
                  const submitter = getSubmitterInfo(rep, profiles);
                  const isExpanded = expandedTicketId === rep.id;
                  const photoList = parsePhotos(rep.proof_photos || rep.photos);
                  const ticketNum = rep.id || rep.ticket_no || 'TKT-001';
                  const title = rep.hazard_type || rep.category || 'Active Hazard';
                  const ticketTitle = rep.description || 'Verified hazard entry.';

                  return (
                    <div key={rep.id} style={styles.itemCardAccordion} onClick={() => setExpandedTicketId(isExpanded ? null : rep.id)}>
                      <div style={styles.cardHeaderRow}>
                        <div style={styles.headerTitleGroup}>
                          <span style={styles.ticketBadge}>{ticketNum}</span>
                          <span style={styles.badgeOrange}>UNCATEGORIZED</span>
                        </div>
                        <span style={styles.userMetaText}>Device ID: {submitter.deviceId}</span>
                      </div>

                      <h4 style={styles.itemTitle}>{title}</h4>
                      <p style={styles.ticketSubTitleText}>"{ticketTitle}"</p>

                      {!isExpanded ? (
                        <div style={styles.expandHintText}>Click to expand, assign category & manage operations &rarr;</div>
                      ) : (
                        <div style={styles.accordionDetailBox} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.detailGridPlain}>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>SEVERITY URGENCY LEVEL:</span>
                              <span style={getSeverityBadgeStyle(rep.severity)}>{(rep.severity || 'HIGH').toUpperCase()}</span>
                            </div>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>LOCATION LANDMARK:</span>
                              <span style={styles.fieldValText}>{rep.location}</span>
                            </div>
                          </div>

                          <div style={styles.tagFormRow}>
                            <input
                              type="text"
                              style={styles.textInputCompact}
                              placeholder="Assign Category (e.g. Flooding, Road Damage)..."
                              value={tagInputMap[`cat_\${rep.id}`] || ''}
                              onChange={(e) => setTagInputMap({ ...tagInputMap, [`cat_\${rep.id}`]: e.target.value })}
                            />
                            <button
                              style={styles.btnTagAction}
                              onClick={() => handleCategorizeReport(rep.id, tagInputMap[`cat_\${rep.id}`])}
                            >
                              Categorize Ticket
                            </button>
                          </div>

                          <div style={styles.mapContainerBox}>
                            <span style={styles.fieldLabel}>LOCATION MAP PREVIEW (Click to open Google Maps):</span>
                            <div 
                              style={styles.gpsMapBoxInteractive} 
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}`, '_blank')}
                              title="Click to open in Google Maps"
                            >
                              <iframe
                                title="Report GPS Location"
                                width="100%"
                                height="130"
                                frameBorder="0"
                                scrolling="no"
                                src={`https://maps.google.com/maps?q=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}&t=m&z=16&ie=UTF8&iwloc=&output=embed`}
                                style={{ borderRadius: '6px', pointerEvents: 'none' }}
                              ></iframe>
                              <div style={styles.mapOverlayBadge}>Open in Google Maps &rarr;</div>
                            </div>
                          </div>

                          {photoList.length > 0 && (
                            <div style={styles.detailSectionPlain}>
                              <span style={styles.fieldLabel}>ATTACHED EVIDENCE PHOTOS ({photoList.length}):</span>
                              <div style={styles.photoGalleryGrid}>
                                {photoList.map((src, idx) => (
                                  <img key={idx} src={src} alt="Evidence" style={styles.thumbImgFixed} onClick={() => setInspectImage(src)} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              <div style={styles.sectionSubTitle}>CATEGORIZED INDIVIDUAL TICKETS ({categorizedReports.length})</div>
              {categorizedReports.length === 0 ? (
                <div style={styles.emptyCard}>No categorized tickets yet. Assign a category to individual tickets above.</div>
              ) : (
                categorizedReports.map((rep) => {
                  const submitter = getSubmitterInfo(rep, profiles);
                  const isExpanded = expandedTicketId === rep.id;
                  const photoList = parsePhotos(rep.proof_photos || rep.photos);
                  const ticketNum = rep.id || rep.ticket_no || 'TKT-001';
                  const title = rep.hazard_type || rep.category || 'Active Hazard';
                  const ticketTitle = rep.description || 'Verified hazard entry.';

                  return (
                    <div key={rep.id} style={styles.itemCardAccordion} onClick={() => setExpandedTicketId(isExpanded ? null : rep.id)}>
                      <div style={styles.cardHeaderRow}>
                        <div style={styles.headerTitleGroup}>
                          <span style={styles.ticketBadge}>{ticketNum}</span>
                          <span style={styles.badgeTeal}>{rep.category}</span>
                        </div>
                        <span style={styles.userMetaText}>Device ID: {submitter.deviceId}</span>
                      </div>

                      <h4 style={styles.itemTitle}>{title}</h4>
                      <p style={styles.ticketSubTitleText}>"{ticketTitle}"</p>

                      {!isExpanded ? (
                        <div style={styles.expandHintText}>Click to expand, re-categorize or resolve &rarr;</div>
                      ) : (
                        <div style={styles.accordionDetailBox} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.detailGridPlain}>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>SEVERITY URGENCY LEVEL:</span>
                              <span style={getSeverityBadgeStyle(rep.severity)}>{(rep.severity || 'HIGH').toUpperCase()}</span>
                            </div>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>LOCATION LANDMARK:</span>
                              <span style={styles.fieldValText}>{rep.location}</span>
                            </div>
                          </div>

                          <div style={styles.tagFormRow}>
                            <input
                              type="text"
                              style={styles.textInputCompact}
                              placeholder={rep.category || "Change category..."}
                              value={tagInputMap[`cat_\${rep.id}`] || ''}
                              onChange={(e) => setTagInputMap({ ...tagInputMap, [`cat_\${rep.id}`]: e.target.value })}
                            />
                            <button
                              style={styles.btnTagAction}
                              onClick={() => handleCategorizeReport(rep.id, tagInputMap[`cat_\${rep.id}`])}
                            >
                              Update Category
                            </button>
                          </div>

                          <div style={styles.mapContainerBox}>
                            <span style={styles.fieldLabel}>LOCATION MAP PREVIEW (Click to open Google Maps):</span>
                            <div 
                              style={styles.gpsMapBoxInteractive} 
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}`, '_blank')}
                              title="Click to open in Google Maps"
                            >
                              <iframe
                                title="Report GPS Location"
                                width="100%"
                                height="130"
                                frameBorder="0"
                                scrolling="no"
                                src={`https://maps.google.com/maps?q=\${encodeURIComponent(rep.coordinates || rep.location || '13.7565,121.0583')}&t=m&z=16&ie=UTF8&iwloc=&output=embed`}
                                style={{ borderRadius: '6px', pointerEvents: 'none' }}
                              ></iframe>
                              <div style={styles.mapOverlayBadge}>Open in Google Maps &rarr;</div>
                            </div>
                          </div>

                          {photoList.length > 0 && (
                            <div style={styles.detailSectionPlain}>
                              <span style={styles.fieldLabel}>ATTACHED EVIDENCE PHOTOS ({photoList.length}):</span>
                              <div style={styles.photoGalleryGrid}>
                                {photoList.map((src, idx) => (
                                  <img key={idx} src={src} alt="Evidence" style={styles.thumbImgFixed} onClick={() => setInspectImage(src)} />
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={styles.actionRow}>
                            <button
                              style={styles.btnResolve}
                              onClick={() => {
                                const photoProof = tagInputMap[`photo_\${rep.id}`];
                                if (!photoProof) {
                                  return alert('Mandatory Completion Photo Proof Required!\nPlease attach an on-site completion photo proof before marking this report as RESOLVED.');
                                }
                                handleUpdateReportStatus(rep.id, 'RESOLVED', { progress_photo: photoProof });
                              }}
                            >
                              Mark Resolved *
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeSubTab === 'BULK' && (
            <div style={styles.sectionStack}>
              <div style={styles.bulkBoxCardCenter}>
                <h4 style={styles.bulkFormTitle}>Category Bulk Operations & Broadcast</h4>
                <p style={styles.bulkFormSub}>Apply operational progress updates across all tickets assigned to a specific category simultaneously.</p>

                <label style={styles.fieldLabel}>1. SELECT CATEGORY GROUP:</label>
                {activeCategoriesList.length === 0 ? (
                  <div style={styles.noticeTextSmall}>
                    No categories assigned yet. Categorize individual tickets first to enable bulk operations.
                  </div>
                ) : (
                  <select
                    style={styles.selectInput}
                    value={selectedBulkCategory}
                    onChange={(e) => setSelectedBulkCategory(e.target.value)}
                  >
                    <option value="">-- Choose Category --</option>
                    {activeCategoriesList.map((cat) => {
                      const count = categorizedReports.filter(
                        (r) => (r.category || '').toUpperCase() === cat.toUpperCase()
                      ).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({count} tickets)
                        </option>
                      );
                    })}
                  </select>
                )}

                <label style={styles.fieldLabel}>2. SET STATUS:</label>
                <select
                  style={styles.selectInput}
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                >
                  <option value="APPROVED">Stage 1: Approved</option>
                  <option value="IN_PROGRESS">Stage 2: In Progress</option>
                  <option value="RESOLVED">Stage 3: Resolved & Cleared</option>
                </select>

                <label style={styles.fieldLabel}>3. ASSIGN RESPONSE TEAM:</label>
                <select
                  style={styles.selectInput}
                  value={bulkTeam}
                  onChange={(e) => setBulkTeam(e.target.value)}
                >
                  {responderTeams.map((team) => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))}
                </select>

                <button
                  style={styles.btnBulkSubmit}
                  onClick={handleBulkBroadcast}
                  disabled={!selectedBulkCategory}
                >
                  Broadcast Update to Category Group
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 3: USER MANAGEMENT */}
      {currentView === 'USER_HANDLING' && (
        <div style={styles.sectionStack}>
          <div style={styles.subTabContainer}>
            <button
              style={userSubTab === 'VERIFIED' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setUserSubTab('VERIFIED')}
            >
              Verified Citizens ({verifiedCitizens.length})
            </button>
            <button
              style={userSubTab === 'GUEST' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setUserSubTab('GUEST')}
            >
              Guest Devices ({guestUsers.length})
            </button>
            <button
              style={userSubTab === 'REQUESTS' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setUserSubTab('REQUESTS')}
            >
              Verification Queue ({pendingVerificationRequests.length})
            </button>
          </div>

          {userSubTab === 'VERIFIED' && (
            <div style={styles.sectionStack}>
              {verifiedCitizens.length === 0 ? (
                <div style={styles.emptyCard}>No verified citizen accounts found.</div>
              ) : (
                verifiedCitizens.map((user, index) => {
                  const userReports = getUserSubmissions(user, reports);
                  return (
                    <div key={user.id || user.device_id} style={styles.userCardRow}>
                      <div style={styles.userLeftBox}>
                        <span style={styles.numBadge}>#{index + 1}</span>
                        <div>
                          <div style={styles.userNameText}>@{user.username || user.full_name || 'Verified Resident'}</div>
                          <div style={styles.userMetaText}>Device ID: {user.device_id || 'REGISTERED'} &bull; Phone: {user.phone_number || 'Registered'} &bull; {userReports.length} Reports</div>
                        </div>
                      </div>
                      <div style={styles.userRightActionRow}>
                        <span style={styles.badgeGreen}>SMS ELIGIBLE</span>
                        <button style={styles.btnWarn} onClick={() => handleUpdateUserStatus(user.device_id, 'PENALIZED')}>Penalty</button>
                        <button style={styles.btnBan} onClick={() => handleUpdateUserStatus(user.device_id, 'BANNED')}>Ban</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {userSubTab === 'GUEST' && (
            <div style={styles.sectionStack}>
              {guestUsers.length === 0 ? (
                <div style={styles.emptyCard}>No guest device accounts found.</div>
              ) : (
                guestUsers.map((user, index) => {
                  const userReports = getUserSubmissions(user, reports);
                  return (
                    <div key={user.device_id || user.id} style={styles.userCardRow}>
                      <div style={styles.userLeftBox}>
                        <span style={styles.numBadge}>#{index + 1}</span>
                        <div>
                          <div style={styles.userNameText}>Device ID: {user.device_id || 'DEV-UNKNOWN'}</div>
                          <div style={styles.userMetaText}>{userReports.length} Submitted Reports</div>
                        </div>
                      </div>
                      <div style={styles.userRightActionRow}>
                        <button style={styles.btnWarn} onClick={() => handleUpdateUserStatus(user.device_id, 'PENALIZED')}>Penalty</button>
                        <button style={styles.btnBan} onClick={() => handleUpdateUserStatus(user.device_id, 'BANNED')}>Ban</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {userSubTab === 'REQUESTS' && (
            <div style={styles.sectionStack}>
              {pendingVerificationRequests.length === 0 ? (
                <div style={styles.emptyCard}>No pending identity verification requests in queue.</div>
              ) : (
                pendingVerificationRequests.map((req) => (
                  <div key={req.id || req.device_id} style={styles.verificationCard}>
                    <div style={styles.cardHeaderRow}>
                      <span style={styles.ticketBadge}>ID REQ-{req.device_id ? req.device_id.slice(-6) : '001'}</span>
                      <span style={styles.badgeOrange}>PENDING VERIFICATION</span>
                    </div>

                    <h4 style={styles.itemTitle}>@{req.username || 'Resident Applicant'}</h4>
                    <p style={styles.itemMeta}>Full Name: {req.full_name || 'Not Provided'}</p>
                    <p style={styles.itemMeta}>Phone Number: {req.phone_number || 'Not Provided'}</p>
                    <p style={styles.itemMeta}>Device ID: {req.device_id}</p>

                    {req.id_proof_photo && (
                      <div style={styles.idPhotoContainer}>
                        <span style={styles.fieldLabel}>UPLOADED RESIDENCY ID PROOF:</span>
                        <img
                          src={req.id_proof_photo}
                          alt="Government ID"
                          style={styles.idProofImg}
                          onClick={() => setInspectImage(req.id_proof_photo)}
                        />
                      </div>
                    )}

                    <div style={styles.actionRow}>
                      <button
                        style={styles.btnApprove}
                        onClick={() => handleUpdateUserStatus(req.device_id, 'VERIFIED')}
                      >
                        Approve & Verify Resident
                      </button>
                      <button
                        style={styles.btnReject}
                        onClick={() => handleUpdateUserStatus(req.device_id, 'REJECTED')}
                      >
                        Reject Verification
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MODULE 4: TRANSMITTAL MEMOS */}
      {currentView === 'DOCUMENT_GENERATOR' && (
        <div style={styles.sectionStack}>
          <div style={styles.subTabContainer}>
            <button
              style={memoSubTab === 'PART1' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setMemoSubTab('PART1')}
            >
              1. Incident Tickets & Groups
            </button>
            <button
              style={memoSubTab === 'PART2' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setMemoSubTab('PART2')}
            >
              2. Memo Preview & Export
            </button>
          </div>

          {memoSubTab === 'PART1' && (
            <div style={styles.sectionStack}>
              <div style={styles.sectionSubTitle}>CATEGORIZED INCIDENT GROUPS ({categoryGroups.length})</div>
              {categoryGroups.length === 0 ? (
                <div style={styles.emptyCard}>No category groups created yet. Tag reports in Active Operations to form groups.</div>
              ) : (
                categoryGroups.map((group) => {
                  const isExpanded = expandedGroupId === group.id;
                  return (
                    <div key={group.id} style={styles.itemCardAccordion} onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}>
                      <div style={styles.cardHeaderRow}>
                        <span style={styles.ticketBadge}>{group.category}</span>
                        <span style={styles.badgeTeal}>{group.reports.length} Reports</span>
                      </div>
                      <p style={styles.itemMeta}>Locations: {group.locations.join(', ') || 'Batangas City'}</p>

                      {isExpanded && (
                        <div style={styles.accordionDetailBox} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.subTitleSmall}>COMPILED TICKETS IN THIS GROUP:</div>
                          {group.reports.map((r, i) => (
                            <div key={r.id} style={styles.subTicketRow}>
                              <strong>{group.category.toUpperCase()} #{i + 1}</strong> &bull; #{r.id || r.ticket_no} - {r.hazard_type || r.category || 'Hazard'} ({r.location})
                            </div>
                          ))}
                          <div style={styles.memoActionBox}>
                            <button
                              style={styles.btnMakeMemoPrimary}
                              onClick={() => {
                                setSelectedMemoCategoryGroup(group);
                                setSelectedMemoReport(null);
                                setMemoSubTab('PART2');
                              }}
                            >
                              Make a Memo for {group.category}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              <div style={styles.sectionSubTitle}>UNCATEGORIZED INDIVIDUAL TICKETS ({uncategorizedReports.length})</div>
              {uncategorizedReports.length === 0 ? (
                <div style={styles.emptyCard}>All incident reports have been categorized into groups.</div>
              ) : (
                uncategorizedReports.map((rep) => {
                  const isExpanded = expandedTicketId === rep.id;
                  const ticketNum = rep.id || rep.ticket_no || 'TKT-001';
                  const title = rep.hazard_type || rep.category || 'Hazard Incident';
                  const ticketTitle = rep.description || 'Verified hazard entry.';

                  return (
                    <div key={rep.id} style={styles.itemCardAccordion} onClick={() => setExpandedTicketId(isExpanded ? null : rep.id)}>
                      <div style={styles.cardHeaderRow}>
                        <span style={styles.ticketBadge}>{ticketNum}</span>
                        <span style={styles.badgeOrange}>{rep.status}</span>
                      </div>

                      <h4 style={styles.itemTitle}>{title}</h4>
                      <p style={styles.ticketSubTitleText}>"{ticketTitle}"</p>
                      <p style={styles.itemMeta}>Location: {rep.location}</p>

                      {isExpanded && (
                        <div style={styles.accordionDetailBox} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.memoActionBox}>
                            <button
                              style={styles.btnMakeMemoPrimary}
                              onClick={() => {
                                setSelectedMemoReport(rep);
                                setSelectedMemoCategoryGroup(null);
                                setMemoSubTab('PART2');
                              }}
                            >
                              Make a Memo for #{ticketNum}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {memoSubTab === 'PART2' && (
            <div>
              {(selectedMemoCategoryGroup || selectedMemoReport) ? (
                <div>
                  <div style={styles.memoPrintHeaderAction}>
                    <span style={styles.memoPrintNoticeText}>
                      Formal Document Preview ready for official print/export ({selectedMemoCategoryGroup ? selectedMemoCategoryGroup.category : `#${selectedMemoReport.id}`})
                    </span>
                    <div style={styles.iconBtnRow}>
                      <button style={styles.iconBtnPrint} title="Print / Export PDF Memorandum" onClick={handlePrintDocument}>Print / Export PDF</button>
                      <button style={styles.iconBtnDownloadDoc} title="Download Editable Document (.doc)" onClick={handleDownloadDocxTemplate}>Download .doc</button>
                    </div>
                  </div>

                  <div style={styles.officialMemoPaper}>
                    <div style={styles.memoHeaderSeal}>
                      <div style={styles.memoRepTitle}>REPUBLIC OF THE PHILIPPINES</div>
                      <div style={styles.memoProvinceTitle}>PROVINCE OF BATANGAS • CITY OF BATANGAS</div>
                      <div style={styles.memoDeptTitle}>CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE (CDRRMO)</div>
                      <div style={styles.memoCenterSub}>BATANGAS COMMAND CENTER • INCIDENT ENDORSEMENT NETWORK</div>
                      <div style={styles.memoDividerLine}></div>
                    </div>

                    <div style={styles.memoMetaTable}>
                      <div style={styles.memoMetaRow}><strong>MEMORANDUM REF NO:</strong> MEMO-AGAP-2026-{(selectedMemoCategoryGroup ? selectedMemoCategoryGroup.id : (selectedMemoReport.id || '001')).toString().replace('#', '')}</div>
                      <div style={styles.memoMetaRow}><strong>DATE & TIMESTAMP:</strong> {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      <div style={styles.memoMetaRow}><strong>FROM:</strong> CDRRMO Incident Operations Coordinator, Project AGAP Portal</div>
                      <div style={styles.memoMetaRow}><strong>SUBJECT:</strong> <span style={{ fontWeight: '800' }}>INTER-AGENCY HAZARD ESCALATION ENDORSEMENT</span></div>
                    </div>

                    <div style={styles.memoSectionHeading}>I. INCIDENT SPECIFICATION & CITIZEN REPORT SUMMARY</div>
                    <table style={styles.formalTable}>
                      <tbody>
                        <tr><td style={styles.tableLabelCell}>Category / Hazard Title:</td><td style={styles.tableValCell}>{selectedMemoCategoryGroup ? selectedMemoCategoryGroup.category : (selectedMemoReport.hazard_type || selectedMemoReport.category)}</td></tr>
                        <tr><td style={styles.tableLabelCell}>Compiled Report Count:</td><td style={styles.tableValCell}>{selectedMemoCategoryGroup ? `${selectedMemoCategoryGroup.reports.length} Compiled Citizen Reports` : '1 Individual Report'}</td></tr>
                        <tr><td style={styles.tableLabelCell}>Severity & Action Window:</td><td style={styles.tableValCell}>HIGH / URGENT - Action Required Within 24 Hours</td></tr>
                        <tr><td style={styles.tableLabelCell}>Location Sector / Landmarks:</td><td style={styles.tableValCell}>{selectedMemoCategoryGroup ? selectedMemoCategoryGroup.locations.join(', ') : selectedMemoReport.location}</td></tr>
                      </tbody>
                    </table>

                    <div style={styles.memoSectionHeading}>II. CITIZEN STATEMENT & INDIVIDUAL INCIDENT BREAKDOWN</div>
                    <div style={styles.memoDescriptionBox}>
                      {selectedMemoCategoryGroup ? (
                        selectedMemoCategoryGroup.reports.map((r, i) => (
                          <div key={r.id} style={{ marginBottom: '6px' }}>
                            <strong>• Ticket #{r.id || r.ticket_no} - [{r.hazard_type || r.category || 'Incident'}]:</strong> "{r.description || 'Verified hazard entry.'}" (📍 {r.location})
                          </div>
                        ))
                      ) : (
                        <div>
                          <strong>• Ticket #{selectedMemoReport.id || selectedMemoReport.ticket_no} - [{selectedMemoReport.hazard_type || selectedMemoReport.category}]:</strong> "{selectedMemoReport.description || 'Verified hazard entry.'}" (📍 {selectedMemoReport.location})
                        </div>
                      )}
                    </div>

                    <div style={styles.memoSectionHeading}>III. VERIFIED CITIZEN EVIDENCE & PHOTOGRAPHIC PROOF ATTACHMENTS</div>
                    {((selectedMemoCategoryGroup && selectedMemoCategoryGroup.photos.length > 0) || (selectedMemoReport && parsePhotos(selectedMemoReport.proof_photos || selectedMemoReport.photos).length > 0)) ? (
                      <div style={styles.memoPhotoGrid}>
                        {(selectedMemoCategoryGroup ? selectedMemoCategoryGroup.photos : parsePhotos(selectedMemoReport.proof_photos || selectedMemoReport.photos)).map((src, i) => (
                          <div key={i} style={styles.exhibitPhotoCard}>
                            <img src={src} alt={`Exhibit ${i + 1}`} style={styles.memoThumbImgFixed} />
                            <div style={styles.exhibitTag}>EXHIBIT PROOF #{i + 1}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.noPhotoNoticeBox}>[NOTICE: Incident report filed without initial photographic evidence.]</div>
                    )}

                    <div style={styles.memoSectionHeading}>IV. MANDATED ACTION & TRANSMITTAL DIRECTIVE</div>
                    <p style={styles.memoDirectiveText}>
                      This official memorandum endorses the above emergency incident for immediate field verification, site intervention, and emergency clearance in accordance with Batangas Disaster Protocols.
                    </p>

                    <div style={styles.signatureRow}>
                      <div style={styles.sigBlock}>
                        <div style={styles.sigLine}></div>
                        <div style={styles.sigName}>CDRRMO COMMAND OFFICER</div>
                        <div style={styles.sigTitle}>Project AGAP Operations Portal</div>
                      </div>
                      <div style={styles.sigBlock}>
                        <div style={styles.sigLine}></div>
                        <div style={styles.sigName}>RECIPIENT RECEIVING OFFICER</div>
                        <div style={styles.sigTitle}>Signature & Date / Time Received</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.emptyCard}>
                  Please select a Category Group or Individual Ticket in Part 1 and click <strong>"Make a Memo"</strong> to view its formal document preview.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODULE 5: ARCHIVE */}
      {currentView === 'RESOLVED_ARCHIVE' && (
        <div style={styles.sectionStack}>
          <div style={styles.subTabContainer}>
            <button
              style={archiveSubTab === 'RESOLVED' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setArchiveSubTab('RESOLVED')}
            >
              Resolved Individual Incidents ({resolvedReports.length})
            </button>
            <button
              style={archiveSubTab === 'REJECTED' ? styles.subTabBtnActive : styles.subTabBtnInactive}
              onClick={() => setArchiveSubTab('REJECTED')}
            >
              Rejected Archive Logs ({rejectedDataReports.length})
            </button>
          </div>

          {archiveSubTab === 'RESOLVED' && (
            <div style={styles.sectionStack}>
              {resolvedReports.length === 0 ? (
                <div style={styles.emptyCard}>No resolved incident archive records found.</div>
              ) : (
                resolvedReports.map((rep) => {
                  const isExpanded = expandedTicketId === rep.id;
                  const photoList = parsePhotos(rep.proof_photos || rep.photos);
                  const submitter = getSubmitterInfo(rep, profiles);
                  const ticketNum = rep.id || rep.ticket_no || 'TKT-001';
                  const title = rep.hazard_type || rep.category || 'Resolved Incident';
                  const ticketTitle = rep.description || 'Verified hazard entry.';

                  return (
                    <div key={rep.id} style={styles.itemCardAccordion} onClick={() => setExpandedTicketId(isExpanded ? null : rep.id)}>
                      <div style={styles.cardHeaderRow}>
                        <div style={styles.headerTitleGroup}>
                          <span style={styles.ticketBadge}>{ticketNum}</span>
                          <span style={styles.badgeGreen}>RESOLVED</span>
                        </div>
                        <span style={styles.userMetaText}>Device ID: {submitter.deviceId}</span>
                      </div>

                      <h4 style={styles.itemTitle}>{title}</h4>
                      <p style={styles.ticketSubTitleText}>"{ticketTitle}"</p>

                      {!isExpanded ? (
                        <div style={styles.expandHintText}>Click to expand resolved details & photo proof &rarr;</div>
                      ) : (
                        <div style={styles.accordionDetailBox} onClick={(e) => e.stopPropagation()}>
                          <div style={styles.detailGridPlain}>
                            <div style={styles.detailRowPlain}>
                              <span style={styles.fieldLabel}>LOCATION LANDMARK:</span>
                              <span style={styles.fieldValText}>{rep.location}</span>
                            </div>
                          </div>

                          {photoList.length > 0 && (
                            <div style={styles.detailSectionPlain}>
                              <span style={styles.fieldLabel}>ATTACHED EVIDENCE PHOTOS:</span>
                              <div style={styles.photoGalleryGrid}>
                                {photoList.map((src, idx) => (
                                  <img key={idx} src={src} alt="Evidence" style={styles.thumbImgFixed} onClick={() => setInspectImage(src)} />
                                ))}
                              </div>
                            </div>
                          )}

                          {rep.progress_photo && (
                            <div style={styles.detailSectionPlain}>
                              <span style={styles.fieldLabel}>✓ RESOLUTION PHOTO PROOF:</span>
                              <div style={styles.photoGalleryGrid}>
                                <img src={rep.progress_photo} alt="Resolution Proof" style={styles.thumbImgFixed} onClick={() => setInspectImage(rep.progress_photo)} />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {archiveSubTab === 'REJECTED' && (
            <div style={styles.sectionStack}>
              <div style={styles.archiveHeaderRow}>
                <span style={styles.archiveNoticeText}>Archived History of Rejected Incident Records</span>
                <button style={styles.btnPurgeAll} onClick={handlePurgeAllRejectedData}>
                  Purge All Rejected Data
                </button>
              </div>

              {rejectedDataReports.length === 0 ? (
                <div style={styles.emptyCard}>No rejected incident records found in archive.</div>
              ) : (
                rejectedDataReports.map((rep) => (
                  <div key={rep.id} style={styles.itemCardAccordion}>
                    <div style={styles.cardHeaderRow}>
                      <span style={styles.ticketBadge}>{rep.id || 'TKT'}</span>
                      <span style={styles.badgeRed}>REJECTED</span>
                    </div>
                    <h4 style={styles.itemTitle}>{rep.hazard_type || rep.category || 'Rejected Incident'}</h4>
                    <p style={styles.itemMeta}>Location: {rep.location}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Photo Inspector Modal */}
      {inspectImage && (
        <div style={styles.modalOverlay} onClick={() => setInspectImage(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <img src={inspectImage} alt="Full Proof" style={styles.fullModalImg} />
            <button style={styles.modalCloseBtn} onClick={() => setInspectImage(null)}>Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  navHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F766E', padding: '12px 16px', borderRadius: '10px', color: '#FFFFFF', marginBottom: '16px' },
  backBtn: { backgroundColor: '#1E3A8A', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  headerTitle: { fontSize: '15px', fontWeight: '700', margin: 0, textAlign: 'right' },
  headerSub: { fontSize: '10px', color: '#CCFBF1', textAlign: 'right' },
  dashboardContainer: { display: 'flex', flexDirection: 'column', gap: '14px' },
  welcomeBanner: { backgroundColor: '#0F766E', color: '#FFFFFF', padding: '14px', borderRadius: '10px' },
  welcomeTag: { fontSize: '9px', fontWeight: '700', letterSpacing: '1px', opacity: 0.8, marginBottom: '2px' },
  welcomeTitle: { fontSize: '18px', fontWeight: '700', margin: '2px 0' },
  welcomeSubtext: { fontSize: '11px', opacity: 0.9, margin: 0 },
  smsStatusCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px' },
  smsStatusHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  smsStatusTitle: { fontSize: '10px', fontWeight: '700', color: '#0F766E' },
  smsBadgeActive: { backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' },
  smsStatusSub: { fontSize: '10px', color: '#475569', margin: '2px 0 6px 0', lineHeight: '1.4' },
  smsLogBox: { backgroundColor: '#F1F5F9', borderRadius: '6px', padding: '8px', marginTop: '6px' },
  smsLogLabel: { fontSize: '9px', fontWeight: '700', color: '#334155', marginBottom: '4px' },
  smsLogRow: { fontSize: '9px', display: 'flex', gap: '6px', marginBottom: '2px' },
  smsLogTime: { color: '#64748B', fontWeight: '700' },
  smsLogSuccess: { color: '#15803D', fontWeight: '700' },
  smsLogSkipped: { color: '#D97706', fontWeight: '700' },
  moduleSectionTitle: { fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '0.8px', marginTop: '4px' },
  tableCardContainer: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' },
  tableRowLast: { display: 'flex', alignItems: 'center', padding: '12px', cursor: 'pointer' },
  tableColIcon: { marginRight: '12px' },
  iconBoxAmber: { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBoxTeal: { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBoxPurple: { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBoxEmerald: { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBoxSlate: { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tableColContent: { flex: 1 },
  tableTitle: { fontSize: '13px', fontWeight: '700', color: '#0F172A' },
  tableDesc: { fontSize: '10px', color: '#64748B', marginTop: '2px' },
  tableColBadge: { marginLeft: '8px' },
  dividerRow: { textAlign: 'center', margin: '10px 0 4px 0' },
  dividerLabel: { fontSize: '9px', fontWeight: '700', color: '#64748B', letterSpacing: '1px' },
  chartCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px' },
  chartControlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  chartTitleTag: { fontSize: '10px', fontWeight: '700', color: '#0F766E' },
  dateRangeGroup: { display: 'flex', alignItems: 'center', gap: '6px' },
  datePickerInput: { padding: '4px 6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '9px' },
  toText: { fontSize: '9px', color: '#64748B' },
  svgGraphBox: { padding: '8px 0', borderBottom: '1px solid #F1F5F9' },
  chartLegendRow: { display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', fontSize: '9px', fontWeight: '700' },
  legendValid: { color: '#0F766E' },
  legendFalse: { color: '#DC2626' },
  sectionStack: { display: 'flex', flexDirection: 'column', gap: '12px' },
  subTabContainer: { display: 'flex', backgroundColor: '#E2E8F0', padding: '3px', borderRadius: '8px', gap: '4px' },
  subTabBtnActive: { flex: 1, padding: '8px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', textAlign: 'center' },
  subTabBtnInactive: { flex: 1, padding: '8px', backgroundColor: 'transparent', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', textAlign: 'center' },
  btnToggleFilter: { padding: '6px 12px', backgroundColor: '#E2E8F0', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  filterBarRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', padding: '8px', backgroundColor: '#F1F5F9', borderRadius: '6px' },
  filterLabel: { fontSize: '9px', fontWeight: '700', color: '#475569', letterSpacing: '0.5px' },
  filterBtnActive: { padding: '4px 10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '4px', fontSize: '9.5px', fontWeight: '700', cursor: 'pointer' },
  filterBtnInactive: { padding: '4px 10px', backgroundColor: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '9.5px', fontWeight: '700', cursor: 'pointer' },
  emptyCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '20px', textAlign: 'center', fontSize: '11px', color: '#64748B' },
  itemCardAccordion: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px', cursor: 'pointer' },
  cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  headerTitleGroup: { display: 'flex', alignItems: 'center', gap: '6px' },
  ticketBadge: { fontSize: '11px', fontWeight: '700', color: '#0F766E', backgroundColor: '#CCFBF1', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.3px' },
  badgeOrange: { backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.3px' },
  badgeRed: { backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.3px' },
  badgeTeal: { backgroundColor: '#CCFBF1', color: '#0F766E', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.3px' },
  badgeGreen: { backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.3px' },
  badgeYellow: { backgroundColor: '#FEF9C3', color: '#854D0E', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.3px' },
  badgeBlue: { backgroundColor: '#DBEAFE', color: '#1E40AF', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.3px' },
  userMetaText: { fontSize: '10.5px', color: '#64748B', fontWeight: '500' },
  itemTitle: { fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '4px 0 2px 0', letterSpacing: '-0.2px' },
  ticketSubTitleText: { fontSize: '12px', fontStyle: 'italic', fontWeight: '400', color: '#475569', margin: '2px 0 8px 0', lineHeight: '1.4' },
  itemMeta: { fontSize: '11px', color: '#64748B', margin: '2px 0', fontWeight: '500' },
  fieldLabel: { fontSize: '10px', fontWeight: '700', color: '#475569', letterSpacing: '0.5px', marginBottom: '2px', display: 'block' },
  expandHintText: { fontSize: '10.5px', color: '#0F766E', fontWeight: '600', marginTop: '8px' },
  accordionDetailBox: { borderTop: '1px solid #E2E8F0', marginTop: '12px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' },
  detailGridPlain: { display: 'flex', flexDirection: 'column', gap: '6px' },
  detailRowPlain: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' },
  fieldValText: { color: '#0F172A', fontWeight: '600', fontSize: '11.5px' },
  mapContainerBox: { display: 'flex', flexDirection: 'column', gap: '6px' },
  gpsMapBoxInteractive: { position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #CBD5E1', cursor: 'pointer' },
  mapOverlayBadge: { position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(15, 118, 110, 0.95)', color: '#FFFFFF', fontSize: '9.5px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  detailSectionPlain: { display: 'flex', flexDirection: 'column', gap: '6px' },
  photoGalleryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' },
  thumbImgFixed: { width: '100%', height: '70px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid #CBD5E1' },
  tagFormRow: { display: 'flex', gap: '8px', marginTop: '4px' },
  textInputCompact: { flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px' },
  btnTagAction: { padding: '8px 14px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' },
  actionRow: { display: 'flex', gap: '10px', marginTop: '8px' },
  btnInvestigate: { flex: 1, padding: '10px 14px', backgroundColor: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.2px' },
  btnApprove: { flex: 1, padding: '10px 14px', backgroundColor: '#15803D', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.2px' },
  btnReject: { flex: 1, padding: '10px 14px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.2px' },
  btnResolve: { flex: 1, padding: '10px 14px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.2px' },
  archiveHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  archiveNoticeText: { fontSize: '11px', fontWeight: '700', color: '#991B1B' },
  btnPurgeAll: { padding: '6px 12px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  bulkBoxCardCenter: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '16px', maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  bulkFormTitle: { fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: 0 },
  bulkFormSub: { fontSize: '11px', color: '#64748B', margin: 0, lineHeight: '1.4' },
  selectInput: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px', boxSizing: 'border-box' },
  btnBulkSubmit: { width: '100%', padding: '10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' },
  noticeTextSmall: { fontSize: '10px', color: '#64748B', fontStyle: 'italic' },
  userCardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px' },
  userLeftBox: { display: 'flex', alignItems: 'center', gap: '10px' },
  numBadge: { fontSize: '11px', fontWeight: '700', color: '#64748B' },
  userNameText: { fontSize: '13px', fontWeight: '700', color: '#0F172A' },
  userRightActionRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  btnWarn: { padding: '5px 10px', backgroundColor: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  btnBan: { padding: '5px 10px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '5px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  verificationCard: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px' },
  idPhotoContainer: { margin: '8px 0' },
  idProofImg: { width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid #CBD5E1' },
  sectionSubTitle: { fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '0.8px', marginTop: '6px' },
  subTitleSmall: { fontSize: '10px', fontWeight: '700', color: '#0F766E', marginBottom: '4px' },
  subTicketRow: { fontSize: '10.5px', color: '#334155', padding: '3px 0' },
  memoActionBox: { marginTop: '8px' },
  btnMakeMemoPrimary: { padding: '8px 14px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' },
  memoPrintHeaderAction: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' },
  memoPrintNoticeText: { fontSize: '11px', fontWeight: '700', color: '#15803D' },
  iconBtnRow: { display: 'flex', gap: '6px' },
  iconBtnPrint: { padding: '6px 10px', backgroundColor: '#15803D', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  iconBtnDownloadDoc: { padding: '6px 10px', backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' },
  officialMemoPaper: { backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '20px' },
  memoHeaderSeal: { textAlign: 'center', marginBottom: '14px' },
  memoRepTitle: { fontSize: '9.5px', fontWeight: '700', color: '#64748B', letterSpacing: '1px' },
  memoProvinceTitle: { fontSize: '10.5px', fontWeight: '700', color: '#334155', margin: '2px 0' },
  memoDeptTitle: { fontSize: '12.5px', fontWeight: '700', color: '#0F766E', margin: '2px 0' },
  memoCenterSub: { fontSize: '8.5px', fontStyle: 'italic', color: '#475569' },
  memoDividerLine: { height: '2px', backgroundColor: '#0F766E', marginTop: '8px' },
  memoMetaTable: { backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '12px', fontSize: '10px' },
  memoMetaRow: { marginBottom: '3px', color: '#334155' },
  memoSectionHeading: { fontSize: '10.5px', fontWeight: '700', color: '#0F766E', letterSpacing: '0.5px', borderBottom: '1px solid #CCFBF1', paddingBottom: '3px', margin: '12px 0 6px 0' },
  formalTable: { width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '8px' },
  tableLabelCell: { fontWeight: '700', color: '#475569', padding: '4px 8px 4px 0', width: '35%' },
  tableValCell: { color: '#0F172A', padding: '4px 0' },
  memoDescriptionBox: { backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px', fontSize: '10px', color: '#334155', lineHeight: '1.4' },
  memoPhotoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' },
  exhibitPhotoCard: { textAlign: 'center', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '6px', backgroundColor: '#F8FAFC' },
  memoThumbImgFixed: { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' },
  exhibitTag: { fontSize: '8.5px', fontWeight: '700', color: '#475569', marginTop: '4px' },
  noPhotoNoticeBox: { fontSize: '10px', fontStyle: 'italic', color: '#64748B', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', textAlign: 'center' },
  memoDirectiveText: { fontSize: '10px', color: '#334155', lineHeight: '1.4', margin: '6px 0' },
  signatureRow: { display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '10px' },
  sigBlock: { textAlign: 'center', width: '40%' },
  sigLine: { borderBottom: '1px solid #334155', marginBottom: '4px' },
  sigName: { fontSize: '9.5px', fontWeight: '700', color: '#0F172A' },
  sigTitle: { fontSize: '8.5px', color: '#64748B' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '14px', maxWidth: '400px', width: '100%', textAlign: 'center' },
  fullModalImg: { maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' },
  modalCloseBtn: { backgroundColor: '#0F766E', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }
};
