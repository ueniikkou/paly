const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const clearBtn = document.getElementById('clear');
const saveBtn = document.getElementById('save');
const insertImgBtn = document.getElementById('insertImg');
const aiRemoveBgBtn = document.getElementById('aiRemoveBg');
const fileInput = document.getElementById('fileInput');

let drawing = false;
let lastX = 0;
let lastY = 0;
let currentImage = null; // 保存当前插入的原图（用于 AI 抠图）

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

function startDraw(e) {
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
}

function draw(e) {
  if (!drawing) return;
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
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img; // 保存原图，供 AI 抠图使用

      // 计算合适显示大小
      const maxW = canvas.width * 0.85;
      const maxH = canvas.height * 0.85;
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

      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, w, h);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ========== AI 抠图（纯浏览器模型） ==========
async function doAIRemoveBackground() {
  if (!currentImage) {
    alert('请先插入一张图片');
    return;
  }

  aiRemoveBgBtn.disabled = true;
  aiRemoveBgBtn.textContent = '处理中，请稍候...（首次需下载模型）';

  try {
    // 动态加载库（适合 GitHub Pages，无需打包）
    const { default: removeBackground } = await import(
      'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm'
    );

    // 把当前图片转成 Blob 传给模型
    const blob = await new Promise((resolve) => {
      // 用一个临时 canvas 把原图转成 blob
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = currentImage.naturalWidth || currentImage.width;
      tempCanvas.height = currentImage.naturalHeight || currentImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(currentImage, 0, 0);
      tempCanvas.toBlob(resolve, 'image/png');
    });

    // 执行 AI 抠图
    const resultBlob = await removeBackground(blob, {
      // 可选配置
      // model: 'isnet_fp16', // 默认已经是较好的
      progress: (key, current, total) => {
        const percent = Math.round((current / total) * 100);
        aiRemoveBgBtn.textContent = `处理中 ${key}: ${percent}%`;
      }
    });

    // 把结果画到主画布
    const resultUrl = URL.createObjectURL(resultBlob);
    const resultImg = new Image();
    resultImg.onload = () => {
      // 同样居中缩放显示
      const maxW = canvas.width * 0.85;
      const maxH = canvas.height * 0.85;
      let w = resultImg.width;
      let h = resultImg.height;

      if (w > maxW) {
        h = h * (maxW / w);
        w = maxW;
      }
      if (h > maxH) {
        w = w * (maxH / h);
        h = maxH;
      }

      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(resultImg, x, y, w, h);

      URL.revokeObjectURL(resultUrl);
      aiRemoveBgBtn.textContent = 'AI 抠图';
      aiRemoveBgBtn.disabled = false;
    };
    resultImg.src = resultUrl;

  } catch (err) {
    console.error(err);
    alert('AI 抠图失败，请看控制台错误信息\n常见原因：网络问题或浏览器不支持 WebAssembly');
    aiRemoveBgBtn.textContent = 'AI 抠图';
    aiRemoveBgBtn.disabled = false;
  }
}

// 事件绑定
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseout', stopDraw);

canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDraw);

clearBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  currentImage = null;
});

saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'result.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

insertImgBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) insertImage(file);
  fileInput.value = '';
});

aiRemoveBgBtn.addEventListener('click', doAIRemoveBackground);
