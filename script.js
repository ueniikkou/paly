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

// 画布自适应
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
  if (points.length < 10) return;

  isAnimating = true;
  startBendMorph([...points]);
}

// ==================== 核心：线条弯曲变形动画 ====================
function startBendMorph(originalPoints) {
  // 1. 决定最终要生成的形状位置（沿原路径分布）
  const shapes = [];
  const shapeCount = Math.min(Math.floor(originalPoints.length / 7) + 2, 12);

  for (let i = 0; i < shapeCount; i++) {
    const idx = Math.floor((i / (shapeCount - 1 || 1)) * (originalPoints.length - 1));
    const p = originalPoints[idx];
    shapes.push({
      x: p.x + (Math.random() - 0.5) * 20,
      y: p.y + (Math.random() - 0.5) * 20,
      size: 18 + Math.random() * 22,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3'][Math.floor(Math.random() * 8)],
      isStar: Math.random() > 0.4
    });
  }

  // 2. 给原路径的每个点分配一个「目标形状」
  const pointTargets = originalPoints.map((p, i) => {
    // 找到最近的形状
    let nearest = shapes[0];
    let minDist = Infinity;
    shapes.forEach(s => {
      const d = (p.x - s.x) ** 2 + (p.y - s.y) ** 2;
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    });
    return {
      origin: { x: p.x, y: p.y },
      target: { x: nearest.x, y: nearest.y },
      shape: nearest
    };
  });

  const duration = 1800; // 变形总时长（毫秒）
  const startTime = performance.now();

  // 先把原来的实线用半透明白色稍微盖一层，方便后面动画覆盖
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Number(sizeInput.value) + 6;
  ctx.beginPath();
  ctx.moveTo(originalPoints[0].x, originalPoints[0].y);
  for (let i = 1; i < originalPoints.length; i++) {
    ctx.lineTo(originalPoints[i].x, originalPoints[i].y);
  }
  ctx.stroke();

  function animate(now) {
    const elapsed = now - startTime;
    let t = Math.min(elapsed / duration, 1);

    // 缓动曲线（先慢后快再慢，更有「被拉过去」的感觉）
    const ease = t < 0.5 
      ? 2 * t * t 
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // ---------- 清空当前帧需要重画的区域（用白色覆盖整条原路径附近） ----------
    // 为了简单稳定，我们每帧都重新画变形中的线 + 形状

    // 1. 画正在弯曲收缩的线条
    if (t < 0.92) {
      ctx.save();
      ctx.globalAlpha = 1 - ease * 0.85;
      ctx.strokeStyle = colorInput.value;
      ctx.lineWidth = Number(sizeInput.value) * (1 - ease * 0.6);
      ctx.beginPath();

      for (let i = 0; i < pointTargets.length; i++) {
        const pt = pointTargets[i];
        // 关键：点从原始位置插值移动到目标形状中心
        const x = pt.origin.x + (pt.target.x - pt.origin.x) * ease;
        const y = pt.origin.y + (pt.target.y - pt.origin.y) * ease;

        // 加一点随机抖动（前半段更明显）
        const jitter = (1 - ease) * 4;
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;

        if (i === 0) ctx.moveTo(x + jx, y + jy);
        else ctx.lineTo(x + jx, y + jy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. 画正在生长的星星和月亮
    shapes.forEach(shape => {
      const size = shape.size * Math.min(ease * 1.3, 1);
      const alpha = Math.min(ease * 1.5, 1);
      if (size < 2) return;

      if (shape.isStar) {
        drawStar(shape.x, shape.y, size, shape.color, alpha);
      } else {
        drawMoon(shape.x, shape.y, size, shape.color, alpha);
      }
    });

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      // 最终定格
      shapes.forEach(shape => {
        if (shape.isStar) {
          drawStar(shape.x, shape.y, shape.size, shape.color, 1);
        } else {
          drawMoon(shape.x, shape.y, shape.size, shape.color, 1);
        }
      });
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

  // 挖空
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + size * 0.4, cy - size * 0.15, size * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 事件
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
