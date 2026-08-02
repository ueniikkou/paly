const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');

let drawing = false;
let points = [];          // 记录当前笔画的所有点
let lastX = 0;
let lastY = 0;

// 设置画布大小
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 获取坐标（兼容鼠标和触摸）
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
  drawing = true;
  points = [];
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  points.push(pos);
}

// 画（实时预览自由线条）
function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const pos = getPos(e);
  points.push(pos);

  ctx.strokeStyle = colorInput.value;
  ctx.lineWidth = sizeInput.value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  lastX = pos.x;
  lastY = pos.y;
}

// 结束画 → 清除自由笔画，换成星星和月亮
function stopDraw() {
  if (!drawing) return;
  drawing = false;

  if (points.length < 3) return; // 太短的笔画忽略

  // 1. 先把刚才画的自由线条清掉（用白色覆盖）
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = sizeInput.value + 4; // 稍微粗一点确保覆盖干净
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // 2. 根据笔画长度决定生成几个图形
  const count = Math.min(Math.floor(points.length / 8) + 1, 8); // 最多8个

  for (let i = 0; i < count; i++) {
    // 从路径中均匀取点
    const idx = Math.floor((i / count) * (points.length - 1));
    const p = points[idx];

    // 随机偏移一点，避免完全重叠
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    const x = p.x + offsetX;
    const y = p.y + offsetY;

    // 随机大小
    const size = 12 + Math.random() * 22;

    // 随机颜色（也可固定用当前颜色）
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // 随机画星星或月亮
    if (Math.random() > 0.45) {
      drawStar(x, y, size, color);
    } else {
      drawMoon(x, y, size, color);
    }
  }
}

// ========== 画五角星 ==========
function drawStar(cx, cy, size, color) {
  ctx.save();
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

// ========== 画月亮（新月） ==========
function drawMoon(cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;

  // 大圆
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  // 用背景色挖掉一部分变成新月（这里用白色，如果背景不是白色可改）
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx + size * 0.35, cy - size * 0.1, size * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// 事件绑定
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseout', stopDraw);

canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDraw);

// 清空
clearBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// 保存
saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'star-moon-drawing.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
