const searchScreen = document.getElementById('searchScreen');
const loadingScreen = document.getElementById('loadingScreen');
const resultScreen = document.getElementById('resultScreen');
const classSelect = document.getElementById('classSelect');
const numberInput = document.getElementById('numberInput');
const searchForm = document.getElementById('searchForm');
const errorMsg = document.getElementById('errorMsg');
const loadingText = document.getElementById('loadingText');

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

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  const class_name = classSelect.value;
  const number = numberInput.value;
  if (!class_name || !number) {
    errorMsg.textContent = 'กรุณาเลือกชั้นเรียนและกรอกเลขที่ให้ครบถ้วน';
    return;
  }

  showScreen(loadingScreen);
  const loadingMessages = ['กำลังค้นหาข้อมูล...', 'กำลังตรวจคะแนน...', 'ใกล้เสร็จแล้ว...'];
  let li = 0;
  const loadingInterval = setInterval(() => {
    li = (li + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[li];
  }, 600);

  let data;
  try {
    const [res] = await Promise.all([
      fetch(`/api/search?class_name=${encodeURIComponent(class_name)}&number=${encodeURIComponent(number)}`),
      sleep(1200),
    ]);
    data = await res.json();
  } catch (err) {
    clearInterval(loadingInterval);
    showScreen(searchScreen);
    errorMsg.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
    return;
  }
  clearInterval(loadingInterval);

  if (!data.found) {
    showScreen(searchScreen);
    errorMsg.textContent = data.message || 'ไม่พบข้อมูล';
    return;
  }

  await renderResult(data);
});

document.getElementById('backBtn').addEventListener('click', () => {
  showScreen(searchScreen);
  numberInput.value = '';
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

  showScreen(resultScreen);

  const rows = [];
  data.subjects.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'subject-row';
    row.style.animationDelay = `${idx * 0.05}s`;
    row.innerHTML = `
      <div class="subject-name">${s.subject}</div>
      <div class="subject-bar-wrap"><div class="subject-bar"></div></div>
      <div class="subject-score rolling">--</div>
    `;
    list.appendChild(row);
    rows.push(row);
  });

  // slot-machine reveal, one subject at a time
  for (let i = 0; i < data.subjects.length; i++) {
    const s = data.subjects[i];
    const scoreEl = rows[i].querySelector('.subject-score');
    const barEl = rows[i].querySelector('.subject-bar');
    const digitLen = String(Math.round(s.full_score)).length;

    const spinDuration = 700;
    const spinStep = 45;
    const startTime = Date.now();
    await new Promise(resolve => {
      const timer = setInterval(() => {
        scoreEl.textContent = randomDigits(digitLen);
        if (Date.now() - startTime > spinDuration) {
          clearInterval(timer);
          resolve();
        }
      }, spinStep);
    });

    scoreEl.textContent = formatScore(s.score);
    scoreEl.classList.remove('rolling');
    barEl.style.width = `${Math.min(100, (s.score / s.full_score) * 100)}%`;
    await sleep(180);
  }

  // total score count-up
  await countUp(document.getElementById('totalScore'), data.summary.total_score, 900);
  document.getElementById('totalPercent').textContent = `${data.summary.percent}%`;

  spawnConfetti(data.summary.percent >= 60 ? 60 : 25);

  const enc = pickEncouragement(data.summary.percent);
  document.getElementById('encourageEmoji').textContent = enc.emoji;
  document.getElementById('encourageText').textContent = enc.text;
  await sleep(200);
  document.getElementById('encourageBox').classList.add('show');
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
