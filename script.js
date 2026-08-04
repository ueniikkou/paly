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
let lastX = 0, lastY = 0;
let currentImage = null; // 原图
let selfieSegmentation = null;

// 画布大小
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
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x; lastY = pos.y;
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
  lastX = pos.x; lastY = pos.y;
}

function stopDraw() {
  drawing = false;
}

// ========== 插入图片 ==========
function insertImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('请选择图片');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      drawImageCentered(img);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function drawImageCentered(img) {
  const maxW = canvas.width * 0.85;
  const maxH = canvas.height * 0.85;
  let w = img.width;
  let h = img.height;
  if (w > maxW) { h = h * (maxW / w); w = maxW; }
  if (h > maxH) { w = w * (maxH / h); h = maxH; }
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, x, y, w, h);
}

// ========== AI 抠图 (调用后端 rembg 服务) ==========
async function doAIRemoveBackground() {
  if (!currentImage) {
    alert('请先插入一张图片');
    return;
  }

  aiRemoveBgBtn.disabled = true;
  aiRemoveBgBtn.textContent = '正在抠图...';

  try {
    // 1. 将当前的 currentImage 绘制到临时 canvas 并导出为 Blob 文件对象
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentImage.naturalWidth || currentImage.width;
    tempCanvas.height = currentImage.naturalHeight || currentImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(currentImage, 0, 0);

    const blob = await new Promise((resolve) => tempCanvas.toBlob(resolve, 'image/png'));

    // 2. 构建 FormData 参数
    const formData = new FormData();
    formData.append('file', blob, 'input.png');

    // 3. 替换为你在 Cloudflare 拿到的 HTTPS 接口地址（注意末尾必须是 /api/remove）
    const REMBG_API_URL = 'https://这里替换成你的xxx.trycloudflare.com/api/remove';

    const response = await fetch(REMBG_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`请求失败，状态码: ${response.status}`);
    }

    // 4. 获取返回的透明背景图片 Blob 数据并加载到画板上
    const resultBlob = await response.blob();
    const resultImg = new Image();
    
    resultImg.onload = () => {
      drawImageCentered(resultImg);
      currentImage = resultImg; // 更新为抠好背景后的新图
      aiRemoveBgBtn.textContent = 'AI 抠图';
      aiRemoveBgBtn.disabled = false;
    };

    resultImg.src = URL.createObjectURL(resultBlob);

  } catch (err) {
    console.error('抠图失败:', err);
    alert('抠图失败，请检查后端服务或网络连接');
    aiRemoveBgBtn.textContent = 'AI 抠图';
    aiRemoveBgBtn.disabled = false;
  }
}

    // 创建临时 canvas 处理原图
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentImage.naturalWidth || currentImage.width;
    tempCanvas.height = currentImage.naturalHeight || currentImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(currentImage, 0, 0);

    // 运行分割
    await new Promise((resolve) => {
      segmenter.onResults((results) => {
        // results.segmentationMask 是遮罩
        const mask = results.segmentationMask;

        // 把原图和遮罩合成透明背景
        const outCanvas = document.createElement('canvas');
        outCanvas.width = tempCanvas.width;
        outCanvas.height = tempCanvas.height;
        const outCtx = outCanvas.getContext('2d');

        // 画原图
        outCtx.drawImage(tempCanvas, 0, 0);

        // 使用遮罩把背景变透明
        outCtx.globalCompositeOperation = 'destination-in';
        outCtx.drawImage(mask, 0, 0, outCanvas.width, outCanvas.height);

        // 显示结果
        const resultImg = new Image();
        resultImg.onload = () => {
          drawImageCentered(resultImg);
          currentImage = resultImg; // 更新为抠好的图
          resolve();
        };
        resultImg.src = outCanvas.toDataURL('image/png');
      });

      segmenter.send({ image: tempCanvas });
    });

    aiRemoveBgBtn.textContent = 'AI 抠图（人像）';
    aiRemoveBgBtn.disabled = false;

  } catch (err) {
    console.error(err);
    alert('抠图失败，请换一张人像图片试试，或检查网络');
    aiRemoveBgBtn.textContent = 'AI 抠图（人像）';
    aiRemoveBgBtn.disabled = false;
  }
}

// 事件
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseout', stopDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDraw);

clearBtn.onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  currentImage = null;
};

saveBtn.onclick = () => {
  const a = document.createElement('a');
  a.download = 'result.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
};

insertImgBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  if (e.target.files[0]) insertImage(e.target.files[0]);
  fileInput.value = '';
};

aiRemoveBgBtn.onclick = doAIRemoveBackground;
