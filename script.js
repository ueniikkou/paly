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

// 设置画布大小
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
  startMorphAnimation([...points]); // 复制一份
}

// ==================== 变形动画（模仿 Penint 感觉） ====================
function startMorphAnimation(strokePoints) {
  // 生成目标形状（沿路径分布）
  const shapes = [];
  const count = Math.min(Math.floor(strokePoints.length / 6) + 3, 14);

  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i / (count - 1 || 1)) * (strokePoints.length - 1));
    const p = strokePoints[idx];
    shapes.push({
      x: p.x,
      y: p.y,
      targetSize: 16 + Math.random() * 24,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3'][Math.floor(Math.random() * 8)],
      isStar: Math.random() > 0.42,
      // 轻微随机偏移，让最终位置不那么死板
      offsetX: (Math.random() - 0.5) * 40,
      offsetY: (Math.random() - 0.5) * 40
    });
  }

  const duration = 1600; // 动画时长（毫秒），可调
  const startTime = performance.now();

  // 为了让变形过程更清晰，我们先把当前自由线用白色稍微盖一层（减弱存在感）
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = Number(sizeInput.value) + 4;
  ctx.beginPath();
  ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
  for (let i = 1; i < strokePoints.length; i++) {
    ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
  }
  ctx.stroke();

  function animate(now) {
    const elapsed = now - startTime;
    let t = Math.min(elapsed / duration, 1);

    // 缓动：先快后慢（更有「被矫正」的感觉）
    const ease = 1 - Math.pow(1 - t, 2.5);

    // ---------- 1. 画正在消失的原始线条（带抖动） ----------
    if (t < 0.85) {
      const fade = 1 - ease;
      const jitter = (1 - ease) * 3; // 抖动强度随时间减小

      ctx.save();
      ctx.globalAlpha = fade * 0.9;
      ctx.strokeStyle = colorInput.value;
      ctx.lineWidth = Number(sizeInput.value) * (1 - ease * 0.7);
      ctx.beginPath();

      for (let i = 0; i < strokePoints.length; i++) {
        const p = strokePoints[i];
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;
        if (i === 0) ctx.moveTo(p.x + jx, p.y + jy);
        else ctx.lineTo(p.x + jx, p.y + jy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ---------- 2. 画正在生长的星星和月亮 ----------
    shapes.forEach(shape => {
      // 位置从原路径点慢慢移到最终偏移位置
      const x = shape.x + shape.offsetX * ease;
      const y = shape.y + shape.offsetY * ease;
      const size = shape.targetSize * ease;

      if (size < 1.5) return;

      // 透明度也随时间增加
      const alpha = Math.min(ease * 1.4, 1);

      if (shape.isStar) {
        drawStar(x, y, size, shape.color, alpha);
      } else {
        drawMoon(x, y, size, shape.color, alpha);
      }
    });

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画结束，最终再画一次干净的版本
      shapes.forEach(shape => {
        const x = shape.x + shape.offsetX;
        const y = shape.y + shape.offsetY;
        if (shape.isStar) {
          drawStar(x, y, shape.targetSize, shape.color, 1);
        } else {
          drawMoon(x, y, shape.targetSize, shape.color, 1);
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
  const outerRadius = size;
  const innerRadius = size * 0.4;

  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
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

  // 大圆
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  // 挖空变成新月（白色背景）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + size * 0.38, cy - size * 0.12, size * 0.88, 0, Math.PI * 2);
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
  link.download = 'star-moon.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
