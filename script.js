const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');

let drawing = false;
let points = [];
let lastX = 0;
let lastY = 0;
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
  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDraw(e) {
  if (isAnimating) return;
  drawing = true;
  points = [];
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  points.push({ x: pos.x, y: pos.y });
}

function draw(e) {
  if (!drawing || isAnimating) return;
  e.preventDefault();
  const pos = getPos(e);
  points.push({ x: pos.x, y: pos.y });

  ctx.strokeStyle = colorInput.value;
  ctx.lineWidth = sizeInput.value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  lastX = pos.x;
  lastY = pos.y;
}

function stopDraw() {
  if (!drawing || isAnimating) return;
  drawing = false;
  if (points.length < 8) return;

  isAnimating = true;
  startSingleMorph([...points]);
}

// ==================== 单形状弯曲变形 ====================
function startSingleMorph(originalPoints) {
  // 计算笔画中心
  let sumX = 0, sumY = 0;
  originalPoints.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  const centerX = sumX / originalPoints.length;
  const centerY = sumY / originalPoints.length;

  // 随机决定变成星星还是月亮
  const isStar = Math.random() > 0.5;
  const size = 28 + Math.random() * 30; // 最终大小
  const color = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3'][Math.floor(Math.random() * 8)];

  // 生成目标形状的轮廓点（让线条能弯过去）
  const targetPoints = [];
  const pointCount = Math.max(originalPoints.length, 30);

  if (isStar) {
    // 五角星轮廓点
    for (let i = 0; i < pointCount; i++) {
      const t = i / pointCount;
      const angle = t * Math.PI * 2 - Math.PI / 2;
      const spikes = 5;
      const r = (Math.floor(t * spikes * 2) % 2 === 0) ? size : size * 0.4;
      // 让点更均匀分布在星形上
      const spikeAngle = (Math.PI * 2 / spikes);
      const localT = (t * spikes) % 1;
      const a = Math.floor(t * spikes) * spikeAngle - Math.PI / 2;
      const outer = size;
      const inner = size * 0.4;
      const radius = localT < 0.5 ? 
        outer + (inner - outer) * (localT * 2) : 
        inner + (outer - inner) * ((localT - 0.5) * 2);
      targetPoints.push({
        x: centerX + Math.cos(a + localT * spikeAngle) * radius,
        y: centerY + Math.sin(a + localT * spikeAngle) * radius
      });
    }
  } else {
    // 新月轮廓（用两个圆的差近似，这里用一个偏心圆做目标）
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      // 主圆
      let x = centerX + Math.cos(angle) * size;
      let y = centerY + Math.sin(angle) * size;
      // 稍微往一边挤，模拟新月感
      x += Math.cos(angle) * size * 0.15 * Math.sin(angle * 2);
      targetPoints.push({ x, y });
    }
  }

  // 把原始点映射到目标点（按比例）
  const mapped = originalPoints.map((p, i) => {
    const idx = Math.floor((i / (originalPoints.length - 1 || 1)) * (targetPoints.length - 1));
    return {
      origin: { x: p.x, y: p.y },
      target: targetPoints[idx]
    };
  });

  const duration = 1600;
  const startTime = performance.now();

  // 先盖住原线
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Number(sizeInput.value) + 8;
  ctx.beginPath();
  ctx.moveTo(originalPoints[0].x, originalPoints[0].y);
  for (let i = 1; i < originalPoints.length; i++) {
    ctx.lineTo(originalPoints[i].x, originalPoints[i].y);
  }
  ctx.stroke();

  function animate(now) {
    const elapsed = now - startTime;
    let t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 2.2); // 先快后慢

    // 画正在弯曲的线条
    if (t < 0.95) {
      ctx.save();
      ctx.globalAlpha = 1 - ease * 0.7;
      ctx.strokeStyle = colorInput.value;
      ctx.lineWidth = Number(sizeInput.value) * (1 - ease * 0.5);
      ctx.beginPath();

      for (let i = 0; i < mapped.length; i++) {
        const m = mapped[i];
        const x = m.origin.x + (m.target.x - m.origin.x) * ease;
        const y = m.origin.y + (m.target.y - m.origin.y) * ease;

        // 轻微抖动（前半段）
        const jitter = (1 - ease) * 3.5;
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;

        if (i === 0) ctx.moveTo(x + jx, y + jy);
        else ctx.lineTo(x + jx, y + jy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 同时生长最终形状
    const currentSize = size * Math.min(ease * 1.25, 1);
    const alpha = Math.min(ease * 1.4, 1);
    if (currentSize > 3) {
      if (isStar) {
        drawStar(centerX, centerY, currentSize, color, alpha);
      } else {
        drawMoon(centerX, centerY, currentSize, color, alpha);
      }
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      // 最终定格
      if (isStar) {
        drawStar(centerX, centerY, size, color, 1);
      } else {
        drawMoon(centerX, centerY, size, color, 1);
      }
      isAnimating = false;
    }
  }

  requestAnimationFrame(animate);
}

// 画五角星
function drawStar(cx, cy, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();

  const spikes = 5;
  const outer = size;
  const inner = size * 0.4;

  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 画新月
function drawMoon(cx, cy, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + size * 0.4, cy - size * 0.15, size * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 事件绑定
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);

canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDraw);

clearBtn.addEventListener('click', () => {
  if (isAnimating) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'morph.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
