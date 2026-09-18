// Đố Vui Nhà Ong — trắc nghiệm nhiều câu hỏi vui về ong, mật ong, nông trại
// và thiên nhiên, mỗi câu có giới hạn thời gian, trả lời càng nhanh càng
// nhiều điểm. Xem js/games/san-hat/game.js (tham chiếu) và js/games/README.md
// để biết interface đầy đủ.
import { createLifecycleScope } from '../../core/lifecycle.js';
import { createFixedStepLoop, fitCanvasToContainer } from '../../core/anim.js';
import { createAudioPlayer } from '../../core/audio.js';

const FEEDBACK_SECONDS = 1;

const QUESTION_BANK = [
  { q: 'Con vật nào tạo ra mật ong?', options: ['Ong', 'Bướm', 'Kiến', 'Nhện'], correct: 0 },
  { q: 'Trong tổ ong, ong chúa có nhiệm vụ chính là gì?', options: ['Đẻ trứng', 'Hút mật', 'Canh gác tổ', 'Xây tổ'], correct: 0 },
  { q: 'Tổ ong thường được xây theo hình gì?', options: ['Hình tròn', 'Hình lục giác', 'Hình vuông', 'Hình tam giác'], correct: 1 },
  { q: 'Ong thu thập mật chủ yếu từ đâu?', options: ['Lá cây', 'Hoa', 'Đất', 'Nước mưa'], correct: 1 },
  { q: 'Con ong chuyên đi lấy phấn hoa và mật gọi là gì?', options: ['Ong thợ', 'Ong đực', 'Ong chúa', 'Ong ma'], correct: 0 },
  { q: 'Mùa nào hoa nở nhiều, ong lấy mật nhiều nhất?', options: ['Mùa đông', 'Mùa xuân', 'Mùa thu muộn', 'Mùa mưa bão'], correct: 1 },
  { q: 'Sáp ong được ong dùng để làm gì?', options: ['Làm thức ăn chính', 'Xây tổ', 'Ru ngủ ấu trùng', 'Đuổi kẻ thù'], correct: 1 },
  { q: 'Ong giao tiếp với đồng loại bằng cách nào đặc biệt?', options: ['Kêu to', 'Nhảy múa', 'Đổi màu sắc', 'Gửi thư'], correct: 1 },
  { q: 'Thực phẩm nào do ong tạo ra, rất giàu dinh dưỡng?', options: ['Mật ong và sữa ong chúa', 'Phô mai', 'Bơ', 'Đường mía'], correct: 0 },
  { q: 'Loại cây nào cần ong thụ phấn để ra nhiều quả?', options: ['Cây thông', 'Cây ăn quả (cam, bưởi...)', 'Cây tre', 'Rêu'], correct: 1 },
  { q: 'Ong mật sống theo kiểu nào?', options: ['Đơn độc', 'Theo cặp', 'Bầy đàn (xã hội)', 'Không cố định'], correct: 2 },
  { q: 'Bộ phận nào giúp ong bay được?', options: ['Đôi cánh', 'Đôi chân', 'Râu', 'Ngòi'], correct: 0 },
  { q: 'Sau khi ong thợ đốt người, điều gì xảy ra với nó?', options: ['Ong sẽ chết', 'Ong vẫn bình thường', 'Ong ngủ đông', 'Ong biến thành ong chúa'], correct: 0 },
  { q: 'Phấn hoa được ong mang về tổ nhờ bộ phận nào?', options: ['Chân sau (giỏ phấn)', 'Đầu', 'Ngòi', 'Bụng'], correct: 0 },
  { q: 'Người làm nghề nuôi ong lấy mật gọi là gì?', options: ['Nông dân trồng lúa', 'Người nuôi ong', 'Người chăn bò', 'Người trồng rừng'], correct: 1 },
  { q: 'Ong đực trong tổ có nhiệm vụ chính là gì?', options: ['Xây tổ', 'Giao phối với ong chúa', 'Đi lấy mật', 'Canh gác tổ'], correct: 1 },
  { q: 'Mật ong có đặc tính gì giúp bảo quản được rất lâu?', options: ['Chứa nhiều nước', 'Có tính kháng khuẩn tự nhiên', 'Phải để tủ lạnh mới được', 'Dễ lên men nhanh'], correct: 1 },
  { q: 'Hoa hướng dương thường hướng về phía nào trong ngày?', options: ['Hướng bắc', 'Hướng mặt trời', 'Hướng gió', 'Hướng ngẫu nhiên'], correct: 1 },
];

function shuffleArray(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shuffleQuestion(item) {
  const opts = item.options.map((text, idx) => ({ text, isCorrect: idx === item.correct }));
  const shuffled = shuffleArray(opts);
  return { q: item.q, options: shuffled.map((o) => o.text), correct: shuffled.findIndex((o) => o.isCorrect) };
}

function pickQuestions(count) {
  const pool = shuffleArray(QUESTION_BANK);
  const picked = pool.slice(0, Math.min(count, pool.length)).map(shuffleQuestion);
  while (picked.length < count) {
    picked.push(shuffleQuestion(pool[Math.floor(Math.random() * pool.length)]));
  }
  return picked;
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function createGame({ canvas, difficulty, config, testMode, onEnd }) {
  const scope = createLifecycleScope('do-vui');
  const audio = createAudioPlayer(scope);
  const cfg = config?.['do-vui'] || config || {};

  const questionCount = cfg.questionCount || 10;
  const secondsPerQuestion = cfg.secondsPerQuestion?.[difficulty] ?? 15;

  let dims = fitCanvasToContainer(canvas, canvas.parentElement);
  const ctx = canvas.getContext('2d');

  let questions = pickQuestions(questionCount);
  let index = 0;
  let score = 0;
  let correctCount = 0;
  let timeLeft = secondsPerQuestion;
  let elapsedTime = 0;
  let ended = false;
  let phase = 'answering'; // 'answering' | 'feedback'
  let selected = -1;
  let feedbackTimer = 0;
  let optionRects = [];

  function computeStars() {
    const ratio = correctCount / questionCount;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    if (ratio >= 0.2) return 1;
    return 0;
  }

  function finish() {
    if (ended) return;
    ended = true;
    loop.stop();
    onEnd({ score, stars: computeStars(), durationMs: Math.round(elapsedTime * 1000) });
  }

  function nextQuestion() {
    index += 1;
    if (index >= questions.length) { finish(); return; }
    timeLeft = secondsPerQuestion;
    phase = 'answering';
    selected = -1;
  }

  function selectAnswer(optIndex) {
    if (ended || phase !== 'answering') return;
    const q = questions[index];
    selected = optIndex;
    if (optIndex === q.correct) {
      const points = Math.round(50 + 50 * Math.max(0, timeLeft / secondsPerQuestion));
      score += points;
      correctCount += 1;
      audio.play('./assets/audio/correct.mp3', { volume: 0.5 });
    } else {
      audio.play('./assets/audio/wrong.mp3', { volume: 0.5 });
    }
    phase = 'feedback';
    feedbackTimer = FEEDBACK_SECONDS;
  }

  function update(dt) {
    if (ended) return;
    elapsedTime += dt;
    if (phase === 'answering') {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        selected = -1;
        phase = 'feedback';
        feedbackTimer = FEEDBACK_SECONDS;
        audio.play('./assets/audio/wrong.mp3', { volume: 0.4 });
      }
    } else if (phase === 'feedback') {
      feedbackTimer -= dt;
      if (feedbackTimer <= 0) nextQuestion();
    }
  }

  function layoutOptions(q) {
    const top = 130;
    const gap = 14;
    const optH = 64;
    const width = Math.min(dims.width - 48, 560);
    const left = (dims.width - width) / 2;
    optionRects = q.options.map((text, i) => ({
      x: left, y: top + i * (optH + gap), w: width, h: optH, text, i,
    }));
    return optionRects;
  }

  function render() {
    ctx.clearRect(0, 0, dims.width, dims.height);
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, dims.width, dims.height);

    const q = questions[index];
    if (!q) return;

    ctx.fillStyle = '#6b4226';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`❓ Câu ${index + 1}/${questions.length}`, 16, 22);
    ctx.textAlign = 'right';
    ctx.fillText(`⭐ ${score}`, dims.width - 16, 22);

    ctx.textAlign = 'center';
    ctx.fillStyle = phase === 'answering' && timeLeft <= 3 ? '#e63946' : '#fb8500';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`⏱️ ${Math.max(0, Math.ceil(timeLeft))}s`, dims.width / 2, 22);

    ctx.fillStyle = '#3a2a1a';
    ctx.font = 'bold 19px sans-serif';
    ctx.textBaseline = 'alphabetic';
    const maxTextWidth = Math.min(dims.width - 48, 600);
    const lines = wrapLines(ctx, q.q, maxTextWidth);
    let ty = 64;
    for (const line of lines) {
      ctx.fillText(line, dims.width / 2, ty);
      ty += 26;
    }

    const rects = layoutOptions(q);
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'middle';
    for (const r of rects) {
      let fill = '#ffe8b8';
      let stroke = '#e0b060';
      if (phase === 'feedback') {
        if (r.i === q.correct) { fill = '#b7e4c7'; stroke = '#2a9d8f'; }
        else if (r.i === selected) { fill = '#f4a3a3'; stroke = '#e63946'; }
      } else if (r.i === selected) {
        fill = '#ffd166';
      }
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3a2a1a';
      ctx.textAlign = 'left';
      const label = `${r.i + 1}. ${r.text}`;
      const lineTexts = wrapLines(ctx, label, r.w - 24);
      const lh = 20;
      const startY = r.y + r.h / 2 - ((lineTexts.length - 1) * lh) / 2;
      lineTexts.forEach((lt, li) => ctx.fillText(lt, r.x + 14, startY + li * lh));
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#6b4226';
    ctx.font = '13px sans-serif';
    const bottomY = (rects[rects.length - 1]?.y ?? 130) + (rects[rects.length - 1]?.h ?? 0) + 26;
    ctx.fillText('Chạm vào đáp án hoặc bấm phím số 1-4', dims.width / 2, Math.min(dims.height - 12, bottomY));
  }

  const loop = createFixedStepLoop(scope, { update, render });

  function pointerToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) * (dims.width / rect.width), y: (clientY - rect.top) * (dims.height / rect.height) };
  }

  scope.on(canvas, 'pointerdown', (e) => {
    if (ended || phase !== 'answering') return;
    const { x, y } = pointerToCanvas(e.clientX, e.clientY);
    const hit = optionRects.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (hit) selectAnswer(hit.i);
  });

  scope.on(window, 'keydown', (e) => {
    if (ended || phase !== 'answering') return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) {
      e.preventDefault();
      const q = questions[index];
      if (q && n - 1 < q.options.length) selectAnswer(n - 1);
    }
  });

  const onResize = () => { dims = fitCanvasToContainer(canvas, canvas.parentElement); };
  scope.on(window, 'resize', onResize);

  return {
    start() { loop.start(); },
    pause() { loop.pause(); },
    resume() { loop.resume(); },
    restart() {
      questions = pickQuestions(questionCount);
      index = 0; score = 0; correctCount = 0; timeLeft = secondsPerQuestion;
      elapsedTime = 0; ended = false; phase = 'answering'; selected = -1; feedbackTimer = 0;
      loop.start();
    },
    destroy() {
      loop.stop();
      scope.destroy();
    },
  };
}
