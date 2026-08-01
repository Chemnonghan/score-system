const searchScreen = document.getElementById('searchScreen');
const loadingScreen = document.getElementById('loadingScreen');
const resultScreen = document.getElementById('resultScreen');
const classSelect = document.getElementById('classSelect');
const queryInput = document.getElementById('queryInput');
const searchForm = document.getElementById('searchForm');
const errorMsg = document.getElementById('errorMsg');
const loadingText = document.getElementById('loadingText');
const matchList = document.getElementById('matchList');

const ENCOURAGEMENTS = [
  { min: 90, emoji: '🏆', texts: [
      'สุดยอดไปเลย! คะแนนระดับเทพ ภูมิใจในตัวเธอมากๆ เก่งมากจริงๆ!',
      'ยอดเยี่ยม! ความพยายามของเธอเห็นผลชัดเจน รักษามาตรฐานนี้ไว้นะ!',
  ]},
  { min: 75, emoji: '🌟', texts: [
      'เก่งมาก! คะแนนดีเยี่ยม อีกนิดเดียวก็จะสุดยอดแล้ว สู้ต่อไปนะ!',
      'ทำได้ดีมาก! ความตั้งใจของเธอส่งผลเป็นคะแนนที่น่าภูมิใจ',
  ]},
  { min: 60, emoji: '💪', texts: [
      'ทำได้ดีทีเดียว! ยังมีพื้นที่ให้พัฒนาต่อ ครั้งหน้าทำได้ดีกว่านี้แน่นอน',
      'ผ่านได้สวย! ขยันอีกนิดคะแนนจะพุ่งขึ้นไปอีกแน่นอน สู้ๆ นะ',
  ]},
  { min: 50, emoji: '🌱', texts: [
      'ยังพอไปได้! ลองทบทวนจุดที่พลาดแล้วฝึกฝนเพิ่มอีกหน่อยนะ เป็นกำลังใจให้!',
      'อย่าเพิ่งท้อ! ทุกความพยายามมีความหมาย ครั้งหน้าทำให้ดีกว่านี้ได้แน่นอน',
  ]},
  { min: 0, emoji: '🤗', texts: [
      'ไม่เป็นไรนะ! ครั้งนี้อาจไม่ใช่ผลลัพธ์ที่หวัง แต่ยังมีโอกาสพัฒนาอีกเยอะ สู้ต่อไปนะ เป็นกำลังใจให้เสมอ!',
      'ล้มแล้วลุกใหม่ได้! ลองปรึกษาคุณครูเพื่อวางแผนพัฒนาตัวเอง เราเชื่อว่าเธอทำได้ดีขึ้นแน่นอน',
  ]},
];

function pickEncouragement(percent) {
  const tier = ENCOURAGEMENTS.find(t => percent >= t.min);
  const text = tier.texts[Math.floor(Math.random() * tier.texts.length)];
  return { emoji: tier.emoji, text };
}

function showScreen(el) {
  [searchScreen, loadingScreen, resultScreen].forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

async function loadClasses() {
  try {
    const res = await fetch('/api/classes');
    const classes = await res.json();
    classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      classSelect.appendChild(opt);
    });

    // allow deep-linking straight to a class via ?class=ม.1/1 — pre-selects
    // the dropdown and locks it so students don't need to pick it themselves
    const params = new URLSearchParams(window.location.search);
    const presetClass = params.get('class');
    if (presetClass && classes.includes(presetClass)) {
      classSelect.value = presetClass;
      classSelect.disabled = true;
      classSelect.classList.add('locked');
      queryInput.focus();
    }
  } catch (e) {
    console.error('โหลดรายชื่อชั้นเรียนไม่สำเร็จ', e);
  }
}
loadClasses();

function randomDigits(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isNumeric(str) {
  return /^\d+$/.test(str.trim());
}

async function runSearch(class_name, query) {
  const params = new URLSearchParams({ class_name });
  if (isNumeric(query)) {
    params.set('number', query.trim());
  } else {
    params.set('name', query.trim());
  }
  const res = await fetch(`/api/search?${params.toString()}`);
  const data = await res.json();
  return data;
}

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  matchList.innerHTML = '';
  const class_name = classSelect.value;
  const query = queryInput.value.trim();
  if (!class_name || !query) {
    errorMsg.textContent = 'กรุณาเลือกชั้นเรียนและกรอกเลขที่หรือชื่อ-สกุลให้ครบถ้วน';
    return;
  }

  showScreen(loadingScreen);
  const loadingMessages = ['กำลังค้นหาข้อมูล...', 'กำลังตรวจคะแนน...', 'เตรียมเปิดผลสอบ...', 'ใกล้เสร็จแล้ว...'];
  let li = 0;
  const loadingInterval = setInterval(() => {
    li = (li + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[li];
  }, 550);

  let data;
  try {
    const [result] = await Promise.all([
      runSearch(class_name, query),
      sleep(1800),
    ]);
    data = result;
  } catch (err) {
    clearInterval(loadingInterval);
    showScreen(searchScreen);
    errorMsg.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
    return;
  }
  clearInterval(loadingInterval);

  if (data.multiple) {
    showScreen(searchScreen);
    errorMsg.textContent = data.message || 'พบชื่อที่คล้ายกันหลายคน';
    renderMatchList(data.matches, class_name);
    return;
  }

  if (!data.found) {
    showScreen(searchScreen);
    errorMsg.textContent = data.message || 'ไม่พบข้อมูล';
    return;
  }

  await renderResult(data);
});

function renderMatchList(matches, class_name) {
  matchList.innerHTML = '';
  matches.forEach(m => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'match-item';
    btn.textContent = `เลขที่ ${m.number} — ${m.full_name}`;
    btn.addEventListener('click', () => {
      queryInput.value = String(m.number);
      matchList.innerHTML = '';
      errorMsg.textContent = '';
      searchForm.requestSubmit();
    });
    matchList.appendChild(btn);
  });
}

document.getElementById('backBtn').addEventListener('click', () => {
  showScreen(searchScreen);
  queryInput.value = '';
});

async function renderResult(data) {
  document.getElementById('studentName').textContent = data.student.full_name;
  document.getElementById('studentClass').textContent =
    `ชั้น ${data.student.class_name} เลขที่ ${data.student.number}`;

  const list = document.getElementById('subjectsList');
  list.innerHTML = '';
  document.getElementById('encourageBox').classList.remove('show');
  document.getElementById('totalScore').textContent = '0';
  document.getElementById('totalFull').textContent = data.summary.total_full;
  document.getElementById('totalPercent').textContent = '';

  const twistOverlay = document.getElementById('twistOverlay');
  const summaryContent = document.getElementById('summaryContent');
  twistOverlay.classList.remove('show', 'twist-fake', 'twist-reveal');
  summaryContent.classList.remove('show');

  showScreen(resultScreen);

  const rows = [];
  data.subjects.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'subject-row';
    row.style.animationDelay = `${idx * 0.15}s`;
    row.innerHTML = `<div class="subject-name">${s.subject}</div>`;
    list.appendChild(row);
    rows.push(row);
  });

  // give the subject list a moment to fade in before building suspense for the total
  await sleep(data.subjects.length * 150 + 900);

  await revealTotalWithTwist(data.summary);

  spawnConfetti(data.summary.percent >= 60 ? 70 : 25);

  const enc = pickEncouragement(data.summary.percent);
  document.getElementById('encourageEmoji').textContent = enc.emoji;
  document.getElementById('encourageText').textContent = enc.text;
  await sleep(200);
  document.getElementById('encourageBox').classList.add('show');
}

// dramatic "plot twist" before showing the real total: build suspense with a
// wobbly fake number first, then flash and reveal the true total.
async function revealTotalWithTwist(summary) {
  const twistOverlay = document.getElementById('twistOverlay');
  const twistText = document.getElementById('twistText');
  const twistEmoji = document.getElementById('twistEmoji');
  const twistSpinNumber = document.getElementById('twistSpinNumber');
  const summaryContent = document.getElementById('summaryContent');
  const flashOverlay = document.getElementById('flashOverlay');

  twistOverlay.classList.add('show');
  twistEmoji.textContent = '🎰';
  twistText.textContent = 'กำลังรวมคะแนนทั้งหมด...';

  // spin the total up and down for 2 seconds, slowing down until it stops
  const totalDigitLen = String(Math.round(summary.total_full)).length;
  const spinDuration = 2000;
  const spinStart = Date.now();
  await new Promise(resolve => {
    function frame() {
      const elapsed = Date.now() - spinStart;
      twistSpinNumber.textContent = randomDigits(totalDigitLen);
      if (elapsed > spinDuration) {
        resolve();
        return;
      }
      const progress = elapsed / spinDuration;
      const delay = 45 + Math.pow(progress, 3) * 280; // ease-out, dramatic slow-down
      setTimeout(frame, delay);
    }
    frame();
  });
  twistSpinNumber.textContent = '';

  // fake dramatic near-miss number, always a bit lower than the real score
  const fakeTotal = Math.max(0, Math.round(summary.total_score - (3 + Math.random() * 10)));
  twistOverlay.classList.add('twist-fake');
  twistEmoji.textContent = '😯';
  twistText.innerHTML = `เอ๊ะ!? คะแนนรวมคือ<br><span class="twist-fake-number">${fakeTotal}</span> ?`;
  await sleep(1600);

  twistEmoji.textContent = '⏳';
  twistText.textContent = 'รอสักครู่นะ...กำลังตรวจทานอีกครั้ง';
  await sleep(1100);

  // flash + flip reveal
  flashOverlay.classList.add('flash');
  await sleep(180);
  flashOverlay.classList.remove('flash');

  twistOverlay.classList.remove('show', 'twist-fake');
  summaryContent.classList.add('show');

  await countUp(document.getElementById('totalScore'), summary.total_score, 900);
  document.getElementById('totalPercent').textContent = `${summary.percent}%`;
}

function formatScore(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function countUp(el, target, duration) {
  return new Promise(resolve => {
    const start = 0;
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      el.textContent = formatScore(Math.round(current * 10) / 10);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatScore(target);
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

function spawnConfetti(count) {
  const container = document.getElementById('confettiContainer');
  const colors = ['#FDCB6E', '#6C5CE7', '#00B894', '#FF7675', '#74B9FF', '#E17055'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.animationDelay = (Math.random() * 0.5) + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}
