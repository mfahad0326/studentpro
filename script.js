/* ═══════════════════════════════════════════
   StudentPro — script.js
   Shared across all pages
═══════════════════════════════════════════ */

// ── SCROLL ANIMATIONS ──────────────────────
function initScrollAnim() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
}

// ── NAV ACTIVE STATE ───────────────────────
function initNavActive() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && href.includes(path)) a.classList.add('active');
  });
}

// ──────────────────────────────────────────
//  AGE CALCULATOR
// ──────────────────────────────────────────
function calculateAge() {
  const y = parseInt(document.getElementById('birthYear').value);
  const m = parseInt(document.getElementById('birthMonth').value);
  const d = parseInt(document.getElementById('birthDay').value);

  if (!y || isNaN(d) || d < 1 || d > 31) {
    showError('ageError', 'Please enter a valid year and day.');
    return;
  }
  const today = new Date();
  const birth = new Date(y, m, d);
  if (birth > today) { showError('ageError', 'Date of birth cannot be in the future.'); return; }

  let years  = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth()    - birth.getMonth();
  let days   = today.getDate()     - birth.getDate();

  if (days   < 0) { months--; const prev = new Date(today.getFullYear(), today.getMonth(), 0); days += prev.getDate(); }
  if (months < 0) { years--;  months += 12; }

  const totalDays   = Math.floor((today - birth) / 86400000);
  const totalMonths = years * 12 + months;

  const el = document.getElementById('ageResult');
  if (!el) return;
  el.innerHTML = `
    <div class="stats-row cols-3" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-box"><div class="big-stat">${years}</div><div class="stat-label">Years</div></div>
      <div class="stat-box"><div class="big-stat" style="font-size:36px">${months}</div><div class="stat-label">Months</div></div>
      <div class="stat-box"><div class="big-stat" style="font-size:36px">${days}</div><div class="stat-label">Days</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="stat-box"><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--blue2)">${totalMonths.toLocaleString()}</div><div class="stat-label">Total Months</div></div>
      <div class="stat-box"><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:var(--teal)">${totalDays.toLocaleString()}</div><div class="stat-label">Total Days</div></div>
    </div>`;
  el.classList.add('show');
  hideError('ageError');
}

// ──────────────────────────────────────────
//  IMAGE COMPRESSOR
// ──────────────────────────────────────────
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function previewOriginal() {
  const file = document.getElementById('imageInput')?.files[0];
  if (!file) return;
  const el = document.getElementById('origPreview');
  if (el) el.src = URL.createObjectURL(file);
}

function compressImage() {
  const fileInput = document.getElementById('imageInput');
  if (!fileInput || !fileInput.files[0]) { showError('compError', 'Please upload an image first.'); return; }
  const file = fileInput.files[0];

  const targetSizeVal = parseFloat(document.getElementById('targetSize')?.value);
  const targetUnit    = document.getElementById('targetUnit')?.value || 'kb';
  const qualityPct    = parseFloat(document.getElementById('qualityPct')?.value) || 70;

  let targetBytes = null;
  if (targetSizeVal && !isNaN(targetSizeVal) && targetSizeVal > 0) {
    targetBytes = targetUnit === 'mb' ? targetSizeVal * 1048576 : targetSizeVal * 1024;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);

      let finalDataUrl;
      if (targetBytes) {
        let lo = 0.01, hi = 1.0;
        finalDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        for (let i = 0; i < 14; i++) {
          const mid  = (lo + hi) / 2;
          const data = canvas.toDataURL('image/jpeg', mid);
          const sz   = Math.round((data.length - 22) * 3 / 4);
          if (sz <= targetBytes) { lo = mid; finalDataUrl = data; }
          else hi = mid;
        }
      } else {
        finalDataUrl = canvas.toDataURL('image/jpeg', qualityPct / 100);
      }

      const origBytes = file.size;
      const compBytes = Math.round((finalDataUrl.length - 22) * 3 / 4);
      const saved     = Math.max(0, Math.round((1 - compBytes / origBytes) * 100));

      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setEl('origSize',  formatBytes(origBytes));
      setEl('compSize',  formatBytes(compBytes));
      setEl('savedPct',  saved + '%');

      const compPrev = document.getElementById('compPreview');
      if (compPrev) compPrev.src = finalDataUrl;

      const dl = document.getElementById('downloadLink');
      if (dl) { dl.href = finalDataUrl; dl.download = 'compressed_studentpro.jpg'; }

      const wrap = document.getElementById('imgResultWrap');
      if (wrap) wrap.classList.add('show');
      hideError('compError');
    };
  };
  reader.readAsDataURL(file);
}

// ──────────────────────────────────────────
//  CGPA CALCULATOR  —  Superior University
//  Official grading scale (Percentage → GP)
// ──────────────────────────────────────────

// Official Superior University Lahore grading scale
// Source: Superior University Academic Regulations
const SUPERIOR_SCALE = [
  { min: 85, max: 100, grade: 'A',  gp: 4.00, color: '#22c55e' },
  { min: 80, max: 84,  grade: 'A-', gp: 3.67, color: '#4ade80' },
  { min: 75, max: 79,  grade: 'B+', gp: 3.33, color: '#86efac' },
  { min: 71, max: 74,  grade: 'B',  gp: 3.00, color: '#60a5fa' },
  { min: 68, max: 70,  grade: 'B-', gp: 2.67, color: '#93c5fd' },
  { min: 64, max: 67,  grade: 'C+', gp: 2.33, color: '#fbbf24' },
  { min: 61, max: 63,  grade: 'C',  gp: 2.00, color: '#fcd34d' },
  { min: 58, max: 60,  grade: 'C-', gp: 1.67, color: '#fb923c' },
  { min: 54, max: 57,  grade: 'D+', gp: 1.33, color: '#f97316' },
  { min: 50, max: 53,  grade: 'D',  gp: 1.00, color: '#ef4444' },
  { min:  0, max: 49,  grade: 'F',  gp: 0.00, color: '#dc2626' },
];

// Per-university grading scales (others use same HEC standard)
const UNI_SCALES = {
  'Superior University':    SUPERIOR_SCALE,
  'University of Lahore':   SUPERIOR_SCALE,
  'Punjab University':      SUPERIOR_SCALE,
  'UET Lahore':             SUPERIOR_SCALE,
  'FAST Lahore':            SUPERIOR_SCALE,
  'COMSATS Lahore':         SUPERIOR_SCALE,
  'UCP Lahore':             SUPERIOR_SCALE,
};

function marksToInfo(marks, uni) {
  const scale = UNI_SCALES[uni] || SUPERIOR_SCALE;
  return scale.find(s => marks >= s.min && marks <= s.max) || SUPERIOR_SCALE.at(-1);
}

function cgpaStatus(gpa) {
  if (gpa >= 3.70) return { label: '🏆 Dean\'s List / Scholarship Eligible', color: '#22c55e' };
  if (gpa >= 3.30) return { label: '⭐ Excellent Standing',                   color: '#60a5fa' };
  if (gpa >= 3.00) return { label: '✅ Good Standing',                         color: '#86efac' };
  if (gpa >= 2.50) return { label: '📘 Satisfactory',                          color: '#fbbf24' };
  if (gpa >= 2.00) return { label: '⚠️ Academic Warning Zone',                 color: '#fb923c' };
  return                  { label: '🚨 Academic Probation Risk',               color: '#ef4444' };
}

let subjectCount = 0;
function addSubject() {
  subjectCount++;
  const id = subjectCount;
  const row = document.createElement('div');
  row.className = 'subject-row';
  row.id = 'row_' + id;
  row.innerHTML = `
    <input type="text"   placeholder="Course Name (optional)" id="sname_${id}" style="margin-bottom:0">
    <input type="number" placeholder="e.g. 3"  id="sch_${id}"  min="1" max="6" class="ch-col" style="margin-bottom:0">
    <input type="number" placeholder="0–100"   id="smk_${id}"  min="0" max="100" style="margin-bottom:0">
    <button class="del-btn" onclick="removeSubject(${id})" title="Remove">×</button>
  `;
  const container = document.getElementById('subjectRows');
  if (container) container.appendChild(row);
}
function removeSubject(id) {
  const row = document.getElementById('row_' + id);
  if (row) row.remove();
}

function calculateCGPA() {
  const rows = document.querySelectorAll('#subjectRows .subject-row');
  if (!rows.length) { showError('cgpaError', 'Please add at least one course.'); return; }

  const uniEl = document.getElementById('cgpaUniversity');
  const uni   = uniEl ? uniEl.value : 'Superior University';
  const scale = UNI_SCALES[uni] || SUPERIOR_SCALE;

  let totalQP = 0, totalCH = 0, courseDetails = [];
  let valid = true;

  rows.forEach(row => {
    const id   = row.id.replace('row_', '');
    const name = document.getElementById('sname_' + id)?.value.trim() || `Course ${id}`;
    const ch   = parseFloat(document.getElementById('sch_'  + id)?.value);
    const mk   = parseFloat(document.getElementById('smk_'  + id)?.value);

    if (isNaN(ch) || ch <= 0 || ch > 6 || isNaN(mk) || mk < 0 || mk > 100) {
      valid = false; return;
    }
    const info = marksToInfo(mk, uni);
    totalQP += info.gp * ch;
    totalCH += ch;
    courseDetails.push({ name, ch, mk, grade: info.grade, gp: info.gp, color: info.color });
  });

  if (!valid) { showError('cgpaError', 'Fill valid Credit Hours (1–6) and Marks (0–100) for all courses.'); return; }
  if (!totalCH) { showError('cgpaError', 'Total credit hours cannot be zero.'); return; }

  // Round to avoid floating-point drift (e.g. 2.3300000001)
  const cgpa   = Math.round((totalQP / totalCH) * 100) / 100;
  const perc   = ((cgpa / 4.0) * 100).toFixed(1);
  const status = cgpaStatus(cgpa);

  const el = document.getElementById('cgpaResult');
  if (!el) return;

  const courseRows = courseDetails.map(c => `
    <tr>
      <td style="font-weight:500">${c.name}</td>
      <td style="text-align:center;color:var(--muted2)">${c.ch} CH</td>
      <td style="text-align:center;color:var(--muted2)">${c.mk}%</td>
      <td style="text-align:center">
        <span class="grade-badge" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44">${c.grade}</span>
      </td>
      <td style="text-align:center;font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:${c.color}">${c.gp.toFixed(2)}</td>
      <td>
        <div class="gp-bar">
          <div class="gp-fill" style="width:${(c.gp/4)*100}%;background:linear-gradient(90deg,${c.color},${c.color}66)"></div>
        </div>
      </td>
    </tr>`).join('');

  // Build grading scale table for inline display
  const scaleRows = SUPERIOR_SCALE.map(s => `
    <tr class="${courseDetails.some(c=>c.grade===s.grade) ? 'scale-highlight' : ''}">
      <td style="color:var(--muted2);font-size:12px;white-space:nowrap">${s.min===0?'0–49':s.min+'–'+s.max}%</td>
      <td style="text-align:center"><span class="g-badge" style="background:${s.color}20;color:${s.color};border:1px solid ${s.color}40">${s.grade}</span></td>
      <td style="text-align:center;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:${s.color}">${s.gp.toFixed(2)}</td>
      <td><div class="g-bar" style="width:${Math.max(6,(s.gp/4)*56)}px;background:linear-gradient(90deg,${s.color},${s.color}55)"></div></td>
    </tr>`).join('');

  el.innerHTML = `
    <!-- BIG CGPA HERO BOX -->
    <div class="cgpa-hero-box">
      <div class="cgpa-hero-label">Your CGPA</div>
      <div class="cgpa-hero-value">${cgpa.toFixed(2)}</div>
      <div class="cgpa-hero-sub">out of 4.00 &nbsp;·&nbsp; ${perc}% &nbsp;·&nbsp; ${totalCH} Credit Hours</div>
      <div class="cgpa-status-pill" style="background:${status.color}18;border-color:${status.color}33;color:${status.color}">${status.label}</div>
    </div>

    <!-- RESULTS + GRADING SCALE SIDE BY SIDE -->
    <div class="cgpa-result-grid">

      <!-- Course breakdown -->
      <div>
        <div class="result-section-title">📋 Course Breakdown</div>
        <table class="grade-table" style="margin-top:8px">
          <thead><tr>
            <th style="text-align:left">Course</th>
            <th>CH</th>
            <th>Marks</th>
            <th>Grade</th>
            <th>GP</th>
            <th style="width:80px">Bar</th>
          </tr></thead>
          <tbody>${courseRows}</tbody>
        </table>
        <div class="cgpa-formula-row">
          <span>Total CH: <strong>${totalCH}</strong></span>
          <span>Quality Points: <strong>${totalQP.toFixed(2)}</strong></span>
          <span><strong>${totalQP.toFixed(2)} ÷ ${totalCH} = <span style="color:var(--orange)">${cgpa.toFixed(2)}</span></strong></span>
        </div>
      </div>

      <!-- Grading Scale reference -->
      <div>
        <div class="result-section-title">📊 Grading Scale</div>
        <p style="font-size:11.5px;color:var(--muted);margin:6px 0 12px;line-height:1.5">Superior University — your grades highlighted</p>
        <table class="grade-table-compact" style="margin-top:0">
          <thead><tr>
            <th style="text-align:left">Marks</th>
            <th>Grade</th>
            <th>GP</th>
            <th>Bar</th>
          </tr></thead>
          <tbody>${scaleRows}</tbody>
        </table>
        <div style="margin-top:12px;padding:10px 13px;background:rgba(255,94,26,.07);border:1px solid rgba(255,94,26,.15);border-radius:10px;font-size:12px;color:var(--muted2);line-height:1.6">
          🏆 <strong style="color:var(--orange)">CGPA ≥ 3.70</strong> = Scholarship Eligible
        </div>
      </div>

    </div>
  `;
  el.classList.add('show');
  hideError('cgpaError');

  // Expand layout to two columns + show grading scale panel
  const layout = document.getElementById('cgpaLayout');
  if (layout) layout.classList.add('has-results');
  renderGradeTable('gradeTableContainer');

  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Grading table renderer — compact reference panel
function renderGradeTable(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <table class="grade-table-compact">
      <thead><tr>
        <th style="text-align:left">Marks %</th>
        <th>Grade</th>
        <th>GP</th>
        <th style="width:70px">Bar</th>
      </tr></thead>
      <tbody>
        ${SUPERIOR_SCALE.map(s => `
          <tr>
            <td style="color:var(--muted2);font-size:12px">${s.min === 0 ? '<50' : s.min+'–'+s.max}%</td>
            <td style="text-align:center">
              <span class="g-badge" style="background:${s.color}20;color:${s.color};border:1px solid ${s.color}40">${s.grade}</span>
            </td>
            <td style="text-align:center;font-family:'Syne',sans-serif;font-weight:700;font-size:12.5px;color:${s.color}">${s.gp.toFixed(2)}</td>
            <td>
              <div class="g-bar" style="width:${Math.max(8,(s.gp/4)*64)}px;background:linear-gradient(90deg,${s.color},${s.color}66)"></div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ──────────────────────────────────────────
//  BLOG SYSTEM
// ──────────────────────────────────────────
let blogPosts = JSON.parse(localStorage.getItem('studentpro_posts') || '[]');

// Seed one sample post if empty
if (!blogPosts.length) {
  blogPosts = [{
    id: 1,
    title: 'How to Improve Your CGPA This Semester',
    tag: 'Study Tips',
    desc: 'Struggling with grades? These proven strategies will help you boost your CGPA and manage studies more effectively.',
    img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=700&q=80',
    content: 'Improving your CGPA requires consistent effort and smart strategies.\n\nStart by attending all classes and taking organized notes. Create a weekly study schedule and stick to it. Break down large topics into smaller chunks and review them regularly.\n\nDo not hesitate to ask your teachers or classmates for help. Group study sessions can be very effective for difficult subjects.\n\nAlso, pay attention to sessional marks — quizzes, assignments, and attendance. These are the easiest way to jump from B+ to A-.\n\nFinally, take care of your health. Sleep well, eat properly, and take breaks. A fresh mind always learns better!',
    date: new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
  }];
  savePosts();
}

function savePosts() {
  localStorage.setItem('studentpro_posts', JSON.stringify(blogPosts));
}

// ──────────────────────────────────────────
//  ADMIN AUTH  —  SHA-256 Hashed credentials
//  Plain text is NEVER stored in source code.
//  To change password: generate new SHA-256
//  hash at: https://emn178.github.io/online-tools/sha256.html
//  then replace the hash strings below.
// ──────────────────────────────────────────
const _AH = {
  u: '27ae6ed4e4279ccf9fddf58dfe0513796422ada9908625a3b3be9b2ad69592fe',
  p: '20e56ed4ae8b68a17e7aef38078563a5e3a5c7d6b2b39faff8fec48199fdcfdd'
};

// Hash any string using browser's built-in SubtleCrypto API
async function _h(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

let adminLoggedIn = false;

function toggleAdmin() {
  const chk = document.getElementById('adminToggle');
  if (chk.checked) {
    if (adminLoggedIn) { openAdminPanel(); }
    else { chk.checked = false; showLoginModal(); }
  } else { adminLogout(); }
}

function showLoginModal() {
  const overlay = document.getElementById('adminLoginOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  const u = document.getElementById('adminUser');
  const p = document.getElementById('adminPass');
  const e = document.getElementById('loginError');
  if (u) { u.value = ''; setTimeout(() => u.focus(), 100); }
  if (p) p.value = '';
  if (e) e.style.display = 'none';
}

function cancelAdminLogin() {
  const overlay = document.getElementById('adminLoginOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  const chk = document.getElementById('adminToggle');
  if (chk) chk.checked = false;
}

// Async — hashes input then compares to stored hashes
async function checkAdminLogin() {
  const uVal = document.getElementById('adminUser')?.value.trim();
  const pVal = document.getElementById('adminPass')?.value;
  const err  = document.getElementById('loginError');

  // Hash both inputs, then compare — plain text never compared directly
  const [uHash, pHash] = await Promise.all([_h(uVal), _h(pVal)]);

  if (uHash === _AH.u && pHash === _AH.p) {
    adminLoggedIn = true;
    const overlay = document.getElementById('adminLoginOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    const chk = document.getElementById('adminToggle');
    if (chk) chk.checked = true;
    openAdminPanel();
  } else {
    if (err) {
      err.style.display = 'block';
      err.style.animation = 'none';
      setTimeout(() => { err.style.animation = 'shake .4s ease'; }, 10);
    }
    const passField = document.getElementById('adminPass');
    if (passField) {
      passField.style.borderColor = 'rgba(239,68,68,.6)';
      passField.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.15)';
      setTimeout(() => {
        passField.style.borderColor = 'rgba(255,255,255,.13)';
        passField.style.boxShadow   = 'none';
      }, 1500);
    }
  }
}

function openAdminPanel() {
  const panel  = document.getElementById('editorPanel');
  const status = document.getElementById('adminStatusText');
  const logout = document.getElementById('logoutBtn');
  if (panel)  panel.classList.add('show');
  if (status) status.textContent = '✅ Admin Mode Active';
  if (logout) logout.style.display = 'block';
  renderBlogGrid('blogGrid');
}

function adminLogout() {
  adminLoggedIn = false;
  const chk    = document.getElementById('adminToggle');
  const panel  = document.getElementById('editorPanel');
  const status = document.getElementById('adminStatusText');
  const logout = document.getElementById('logoutBtn');
  if (chk)    chk.checked = false;
  if (panel)  panel.classList.remove('show');
  if (status) status.textContent = 'Enable to add / delete posts';
  if (logout) logout.style.display = 'none';
  renderBlogGrid('blogGrid');
}

function togglePassVis() {
  const pass = document.getElementById('adminPass');
  const eye  = document.getElementById('passEye');
  if (!pass) return;
  pass.type = pass.type === 'password' ? 'text' : 'password';
  if (eye) eye.textContent = pass.type === 'password' ? '👁' : '🙈';
}

function previewBlogImg() {
  const url  = document.getElementById('postImgUrl')?.value;
  const prev = document.getElementById('blogImgSmall');
  if (!prev) return;
  if (url) { prev.src = url; prev.style.display = 'block'; }
  else prev.style.display = 'none';
}

function publishPost() {
  const title   = document.getElementById('postTitle')?.value.trim();
  const desc    = document.getElementById('postDesc')?.value.trim();
  const content = document.getElementById('postContent')?.value.trim();
  if (!title || !desc || !content) { alert('Please fill in Title, Description and Content.'); return; }

  const post = {
    id:      Date.now(),
    title,
    tag:     document.getElementById('postTag')?.value.trim() || 'General',
    desc,
    img:     document.getElementById('postImgUrl')?.value.trim(),
    content,
    date:    new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
  };
  blogPosts.unshift(post);
  savePosts();
  renderBlogGrid('blogGrid');
  if (typeof renderHomePosts === 'function') renderHomePosts();
  ['postTitle','postTag','postDesc','postImgUrl','postContent'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const prev = document.getElementById('blogImgSmall');
  if (prev) prev.style.display = 'none';
  alert('Post published! ✅');
}

function isAdminOn() {
  return adminLoggedIn;
}

function renderBlogGrid(containerId, limit) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  const posts = limit ? blogPosts.slice(0, limit) : blogPosts;
  if (!posts.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)"><div style="font-size:48px;margin-bottom:14px">📭</div><p>No posts yet. Enable Admin Mode to add your first post!</p></div>`;
    return;
  }
  const admin = isAdminOn();
  grid.innerHTML = posts.map(p => `
    <div class="blog-card fade-up" style="position:relative" id="bcard_${p.id}">
      ${admin ? `
        <button
          onclick="event.stopPropagation();deletePost(${p.id})"
          title="Delete post"
          style="
            position:absolute;top:12px;right:12px;z-index:10;
            width:34px;height:34px;border-radius:50%;
            background:rgba(239,68,68,.85);border:none;
            color:#fff;font-size:17px;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 14px rgba(0,0,0,.4);
            transition:all .18s;
          "
          onmouseover="this.style.background='rgba(239,68,68,1)';this.style.transform='scale(1.1)'"
          onmouseout="this.style.background='rgba(239,68,68,.85)';this.style.transform='scale(1)'"
        >🗑</button>` : ''}
      <div onclick="openBlogPost(${p.id})" style="cursor:pointer">
        ${p.img
          ? `<img class="blog-img" src="${p.img}" alt="${escHtml(p.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div class="blog-img-placeholder" style="display:${p.img ? 'none' : 'flex'}">📝</div>
        <div class="blog-body">
          <div class="blog-tag-pill">${escHtml(p.tag)}</div>
          <h3>${escHtml(p.title)}</h3>
          <p>${escHtml(p.desc.length > 110 ? p.desc.slice(0, 110) + '…' : p.desc)}</p>
          <div class="blog-meta">
            <span>${p.date}</span>
            <span class="read-more-link">Read More →</span>
          </div>
        </div>
      </div>
    </div>`).join('');

  // re-observe fade-up
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
  }, { threshold: 0.1 });
  grid.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
}

function deletePost(id) {
  if (!confirm('Is post ko delete karna chahte ho? ❌')) return;
  blogPosts = blogPosts.filter(p => p.id !== id);
  savePosts();
  // Remove card with animation
  const card = document.getElementById('bcard_' + id);
  if (card) {
    card.style.transition = 'all .3s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(.9)';
    setTimeout(() => {
      renderBlogGrid('blogGrid');
      renderBlogGrid('homePostsGrid', 3);
    }, 300);
  } else {
    renderBlogGrid('blogGrid');
    renderBlogGrid('homePostsGrid', 3);
  }
}

function openBlogPost(id) {
  const p = blogPosts.find(x => x.id === id);
  if (!p) return;
  const overlay = document.getElementById('blogModal');
  const box     = document.getElementById('modalBox');
  if (!overlay || !box) return;

  box.innerHTML = `
    <button class="modal-close-btn" onclick="closeBlogPost()">×</button>
    ${p.img ? `<img class="modal-cover" src="${escHtml(p.img)}" alt="${escHtml(p.title)}" onerror="this.remove()">` : ''}
    <div class="modal-body">
      <div class="blog-tag-pill">${escHtml(p.tag)}</div>
      <h2>${escHtml(p.title)}</h2>
      <span class="modal-date">${p.date}</span>
      ${p.content.split('\n').filter(l => l.trim()).map(l => `<p>${escHtml(l)}</p>`).join('')}
    </div>`;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeBlogPost() {
  const overlay = document.getElementById('blogModal');
  if (overlay) overlay.classList.remove('show');
  document.body.style.overflow = '';
}

// ──────────────────────────────────────────
//  CONTACT FORM
// ──────────────────────────────────────────
function submitContact() {
  const n = document.getElementById('cName')?.value.trim();
  const e = document.getElementById('cEmail')?.value.trim();
  const m = document.getElementById('cMsg')?.value.trim();
  if (!n || !e || !m) { alert('Please fill Name, Email and Message.'); return; }
  const toast = document.getElementById('contactToast');
  if (toast) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 4500); }
  ['cName','cEmail','cSubject','cMsg'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

// ──────────────────────────────────────────
//  TOOLS PAGE — section switcher
// ──────────────────────────────────────────
function showTool(toolId) {
  document.querySelectorAll('.tool-section').forEach(s => {
    s.style.display = s.id === toolId ? 'block' : 'none';
  });
  document.querySelectorAll('.tool-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tool === toolId);
  });
  window.scrollTo({ top: 70, behavior: 'smooth' });
}

// ──────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ──────────────────────────────────────────
//  INIT
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnim();
  initNavActive();

  // Close blog modal on overlay click
  const overlay = document.getElementById('blogModal');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeBlogPost(); });
});
