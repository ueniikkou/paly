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
let isAnimating = false; // 防止动画期间重复触发

// 设置画布大小
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 获取坐标
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

// 开始画
function startDraw(e) {
  if (isAnimating) return;
  drawing = true;
  points = [];
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  points.push({ x: pos.x, y: pos.y });
}

// 画（实时预览）
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

// 结束画 → 启动动画
function stopDraw() {
  if (!drawing || isAnimating) return;
  drawing = false;

  if (points.length < 6) return;

  isAnimating = true;
  startMorphAnimation(points);
}

// ==================== 核心动画 ====================
function startMorphAnimation(strokePoints) {
  // 预先决定要生成的星星/月亮位置和类型
  const shapes = [];
  const count = Math.min(Math.floor(strokePoints.length / 5) + 2, 12);

  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i / (count - 1 || 1)) * (strokePoints.length - 1));
    const p = strokePoints[idx];
    shapes.push({
      x: p.x + (Math.random() - 0.5) * 30,
      y: p.y + (Math.random() - 0.5) * 30,
      size: 14 + Math.random() * 22,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3'][Math.floor(Math.random() * 8)],
      isStar: Math.random() > 0.4,
      progress: 0
    });
  }

  const duration = 1200; // 动画时长（毫秒）
  const startTime = performance.now();

  // 先用白色把自由线盖住（准备消失）
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Number(sizeInput.value) + 10;
  ctx.beginPath();
  ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
  for (let i = 1; i < strokePoints.length; i++) {
    ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
  }
  ctx.stroke();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1); // 0 → 1

    // 使用缓动（先快后慢）
    const ease = 1 - Math.pow(1 - t, 3);

    // 每一帧重新画一次当前状态的星星月亮
    // （因为我们要让它们从小变大）
    shapes.forEach(shape => {
      const currentSize = shape.size * ease;
      if (currentSize < 1) return;

      if (shape.isStar) {
        drawStar(shape.x, shape.y, currentSize, shape.color, ease);
      } else {
        drawMoon(shape.x, shape.y, currentSize, shape.color, ease);
      }
    });

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画结束，再最终画一次确保完整
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

// 画五角星（支持透明度）
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

// 画新月（支持透明度）
function drawMoon(cx, cy, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // 大圆
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  // 挖掉一部分变成新月
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

// 清空
clearBtn.addEventListener('click', () => {
  if (isAnimating) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// 保存
saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'star-moon.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
