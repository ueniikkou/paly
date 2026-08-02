const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');

let drawing = false;
let points = [];
let lastX = 0, lastY = 0;
let isAnimating = false;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startDraw(e) {
  if (isAnimating) return;
  drawing = true;
  points = [];
  const pos = getPos(e);
  lastX = pos.x; lastY = pos.y;
  points.push(pos);
}

function draw(e) {
  if (!drawing || isAnimating) return;
  e.preventDefault();
  const pos = getPos(e);
  points.push(pos);

  ctx.strokeStyle = colorInput.value;
  ctx.lineWidth = sizeInput.value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  lastX = pos.x; lastY = pos.y;
}

function stopDraw() {
  if (!drawing || isAnimating) return;
  drawing = false;
  if (points.length < 12) return;
  isAnimating = true;
  morphToShape([...points]);
}

function morphToShape(original) {
  // 计算中心
  let cx = 0, cy = 0;
  original.forEach(p => { cx += p.x; cy += p.y; });
  cx /= original.length;
  cy /= original.length;

  const isStar = Math.random() > 0.5;
  const finalSize = 35 + Math.random() * 35;
  const color = ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#FF9FF3'][Math.floor(Math.random()*8)];

  // 生成目标轮廓点（更密集，方便弯曲）
  const targetCount = 60;
  const targets = [];

  if (isStar) {
    for (let i = 0; i < targetCount; i++) {
      const t = i / targetCount;
      const angle = t * Math.PI * 2 - Math.PI / 2;
      const spike = Math.floor(t * 5);
      const local = (t * 5) % 1;
      const outer = finalSize;
      const inner = finalSize * 0.38;
      const r = local < 0.5 
        ? outer + (inner - outer) * (local * 2)
        : inner + (outer - inner) * ((local - 0.5) * 2);
      const a = (spike + local) * (Math.PI * 2 / 5) - Math.PI / 2;
      targets.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r
      });
    }
  } else {
    // 新月轮廓
    for (let i = 0; i < targetCount; i++) {
      const a = (i / targetCount) * Math.PI * 2;
      let r = finalSize;
      // 让一边凹进去，形成新月感
      if (a > Math.PI * 0.2 && a < Math.PI * 1.8) {
        r = finalSize * (0.55 + 0.45 * Math.abs(Math.cos(a)));
      }
      targets.push({
        x: cx + Math.cos(a) * r + finalSize * 0.15,
        y: cy + Math.sin(a) * r
      });
    }
  }

  // 把原始点均匀映射到目标点
  const mapped = [];
  for (let i = 0; i < original.length; i++) {
    const idx = Math.floor((i / (original.length - 1)) * (targets.length - 1));
    mapped.push({
      from: { x: original[i].x, y: original[i].y },
      to: targets[idx]
    });
  }

  const duration = 2000;
  const start = performance.now();

  // 先盖住原线
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = Number(sizeInput.value) + 10;
  ctx.beginPath();
  ctx.moveTo(original[0].x, original[0].y);
  for (let i = 1; i < original.length; i++) ctx.lineTo(original[i].x, original[i].y);
  ctx.stroke();

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t * t * (3 - 2 * t); // smoothstep

    // 画正在弯曲的线（核心）
    ctx.save();
    ctx.globalAlpha = 1 - ease * 0.65;
    ctx.strokeStyle = colorInput.value;
    ctx.lineWidth = Number(sizeInput.value) * (1 - ease * 0.4);
    ctx.beginPath();

    for (let i = 0; i < mapped.length; i++) {
      const m = mapped[i];
      const x = m.from.x + (m.to.x - m.from.x) * ease;
      const y = m.from.y + (m.to.y - m.from.y) * ease;
      // 前半段加一点抖动，增加「被矫正」的感觉
      const j = (1 - ease) * 4;
      const jx = (Math.random() - 0.5) * j;
      const jy = (Math.random() - 0.5) * j;

      if (i === 0) ctx.moveTo(x + jx, y + jy);
      else ctx.lineTo(x + jx, y + jy);
    }
    ctx.stroke();
    ctx.restore();

    // 同时淡入最终形状
    const s = finalSize * Math.min(ease * 1.3, 1);
    const a = Math.min(ease * 1.6, 1);
    if (s > 4) {
      if (isStar) drawStar(cx, cy, s, color, a);
      else drawMoon(cx, cy, s, color, a);
    }

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      if (isStar) drawStar(cx, cy, finalSize, color, 1);
      else drawMoon(cx, cy, finalSize, color, 1);
      isAnimating = false;
    }
  }

  requestAnimationFrame(frame);
}

function drawStar(cx, cy, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.38;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMoon(cx, cy, size, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx + size * 0.42, cy - size * 0.12, size * 0.88, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 事件
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);
canvas.addEventListener('touchstart', startDraw, {passive:false});
canvas.addEventListener('touchmove', draw, {passive:false});
canvas.addEventListener('touchend', stopDraw);

clearBtn.onclick = () => { if (!isAnimating) ctx.clearRect(0,0,canvas.width,canvas.height); };
saveBtn.onclick = () => {
  const a = document.createElement('a');
  a.download = 'morph.png';
  a.href = canvas.toDataURL();
  a.click();
};
