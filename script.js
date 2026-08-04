document.addEventListener('DOMContentLoaded', () => {
  // 1. 获取 DOM 元素
  const canvas = document.getElementById('canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const colorInput = document.getElementById('color');
  const sizeInput = document.getElementById('size');
  const clearBtn = document.getElementById('clear');
  const saveBtn = document.getElementById('save');
  const insertImgBtn = document.getElementById('insertImg');
  const aiRemoveBgBtn = document.getElementById('aiRemoveBg');
  const fileInput = document.getElementById('fileInput');

  if (!canvas || !ctx) {
    console.error('未找到 Canvas 画布元素！');
    return;
  }

  let drawing = false;
  let lastX = 0, lastY = 0;
  let currentImage = null; // 当前画板上的图片

  // 自适应画布大小
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (currentImage) {
      drawImageCentered(currentImage);
    }
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
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    ctx.strokeStyle = colorInput ? colorInput.value : '#000000';
    ctx.lineWidth = sizeInput ? sizeInput.value : 5;
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
      alert('请选择正确的图片格式');
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
      alert('请先插入一张图片！');
      return;
    }

    if (aiRemoveBgBtn) {
      aiRemoveBgBtn.disabled = true;
      aiRemoveBgBtn.textContent = '正在抠图...';
    }

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = currentImage.naturalWidth || currentImage.width;
      tempCanvas.height = currentImage.naturalHeight || currentImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(currentImage, 0, 0);

      const blob = await new Promise((resolve) => tempCanvas.toBlob(resolve, 'image/png'));

      const formData = new FormData();
      formData.append('file', blob, 'input.png');

      const REMBG_API_URL = 'https://modems-ide-hygiene-departure.trycloudflare.com/api/remove';

      const response = await fetch(REMBG_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }

      const resultBlob = await response.blob();
      const resultImg = new Image();
      
      resultImg.onload = () => {
        drawImageCentered(resultImg);
        currentImage = resultImg;
        if (aiRemoveBgBtn) {
          aiRemoveBgBtn.textContent = 'AI 抠图';
          aiRemoveBgBtn.disabled = false;
        }
      };

      resultImg.src = URL.createObjectURL(resultBlob);

    } catch (err) {
      console.error('抠图失败:', err);
      alert('抠图失败，请检查网络或后端服务连接！');
      if (aiRemoveBgBtn) {
        aiRemoveBgBtn.textContent = 'AI 抠图';
        aiRemoveBgBtn.disabled = false;
      }
    }
  }

  // ========== 事件绑定 ==========
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseout', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  if (clearBtn) {
    clearBtn.onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      currentImage = null;
    };
  }

  if (saveBtn) {
    saveBtn.onclick = () => {
      const a = document.createElement('a');
      a.download = 'result.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
  }

  if (insertImgBtn && fileInput) {
    insertImgBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        insertImage(e.target.files[0]);
      }
      fileInput.value = '';
    };
  }

  if (aiRemoveBgBtn) {
    aiRemoveBgBtn.onclick = doAIRemoveBackground;
  }
});
