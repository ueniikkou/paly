const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');

// 新增按钮（需要在 HTML 里加上对应元素，见下方说明）
const insertImgBtn = document.getElementById('insertImg');
const removeBgBtn = document.getElementById('removeBg');
const fileInput = document.getElementById('fileInput');

let drawing = false;
let lastX = 0;
let lastY = 0;
let removeBgMode = false; // 是否处于抠图取色模式

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
  if (e.touches && e.touches[0]) {
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
  if (removeBgMode) return; // 抠图模式下不画画
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
}

// 画
function draw(e) {
  if (!drawing || removeBgMode) return;
  e.preventDefault();
  const pos = getPos(e);
  ctx.strokeStyle = colorInput.value;
  ctx.lineWidth = sizeInput.value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  lastX = pos.x;
  lastY = pos.y;
}

// 结束
function stopDraw() {
  drawing = false;
}

// ========== 插入图片 ==========
function insertImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      // 计算合适大小（不超过画布的 80%）
      const maxW = canvas.width * 0.8;
      const maxH = canvas.height * 0.8;
      let w = img.width;
      let h = img.height;

      if (w > maxW) {
        h = h * (maxW / w);
        w = maxW;
      }
      if (h > maxH) {
        w = w * (maxH / h);
        h = maxH;
      }

      // 居中绘制
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ========== 简易抠图（颜色容差去背景） ==========
function removeBackgroundAt(x, y) {
  // 获取点击位置的颜色
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;

  const targetR = data[index];
  const targetG = data[index + 1];
  const targetB = data[index + 2];

  // 容差值（越大去掉的范围越广，可调整）
  const tolerance = 45;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 计算颜色距离
    const dist = Math.sqrt(
      (r - targetR) ** 2 +
      (g - targetG) ** 2 +
      (b - targetB) ** 2
    );

    if (dist < tolerance) {
      data[i + 3] = 0; // 把 alpha 设为 0（透明）
    }
  }

  ctx.putImageData(imageData, 0, 0);
  removeBgMode = false;
  removeBgBtn.textContent = '抠图（点击背景）';
  canvas.style.cursor = 'crosshair';
}

// 事件绑定
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseout', stopDraw);

canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDraw);

// 点击画布时，如果在抠图模式就执行去背景
canvas.addEventListener('click', function (e) {
  if (!removeBgMode) return;
  const pos = getPos(e);
  removeBackgroundAt(pos.x, pos.y);
});

// 清空
clearBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  removeBgMode = false;
  if (removeBgBtn) removeBgBtn.textContent = '抠图（点击背景）';
});

// 保存
saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// 插入图片按钮
if (insertImgBtn && fileInput) {
  insertImgBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) insertImage(file);
    fileInput.value = ''; // 允许重复选择同一张图
  });
}

// 抠图按钮
if (removeBgBtn) {
  removeBgBtn.addEventListener('click', () => {
    removeBgMode = !removeBgMode;
    if (removeBgMode) {
      removeBgBtn.textContent = '请点击背景颜色 →';
      canvas.style.cursor = 'copy';
    } else {
      removeBgBtn.textContent = '抠图（点击背景）';
      canvas.style.cursor = 'crosshair';
    }
  });
}
