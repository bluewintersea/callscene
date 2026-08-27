const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const canvas = $('#previewCanvas');
const ctx = canvas.getContext('2d');
const cropCanvas = $('#cropCanvas');
const cropCtx = cropCanvas.getContext('2d');
const cropDialog = $('#cropDialog');
const CROP_W = cropCanvas.width;
const CROP_H = cropCanvas.height;

const copy = {
  en: { name: 'Name', calling: 'is calling', remind: 'Remind Me', message: 'Message', decline: 'Decline', accept: 'Accept', slide: 'Slide to answer' },
  ko: { name: '이름', calling: '휴대전화', remind: '나중에 보기', message: '메시지', decline: '거절', accept: '응답', slide: '밀어서 통화하기' },
};

const state = {
  name: 'Name',
  time: '12:35',
  language: 'en',
  mode: 'touch',
  showStatus: true,
  battery: 82,
  dim: 28,
  blur: 0,
  image: null,
  fileName: '',
  crop: { zoom: 1, x: 0, y: 0 },
};

let workingImage = null;
let workingFileName = '';
let workingCrop = { zoom: 1, x: 0, y: 0 };
let dragStart = null;
const activePointers = new Map();
let pinchStart = null;
let renderFrame = 0;
let toastTimer = 0;
const PHONE_FILLED = new Path2D('M8 13.4782L8 12.8617C8 12.8617 8 11.3963 12 11.3963C16 11.3963 16 12.8617 16 12.8617V13.25C16 14.2064 16.7227 15.0192 17.7004 15.1625L19.7004 15.4556C20.9105 15.6329 22 14.7267 22 13.5429V11.4183C22 10.8313 21.8162 10.2542 21.3703 9.85601C20.2296 8.83732 17.4208 7 12 7C6.25141 7 3.44027 9.58269 2.44083 10.7889C2.1247 11.1704 2 11.6525 2 12.1414L2 14.0643C2 15.3623 3.29561 16.292 4.57997 15.9156L6.57997 15.3295C7.42329 15.0823 8 14.3305 8 13.4782Z');
const ALARM_LEFT = new Path2D('M5.67818 2.9469C5.41291 2.82088 5.11578 2.75 4.8 2.75C3.66782 2.75 2.75 3.66782 2.75 4.8C2.75 5.11578 2.82088 5.41291 2.9469 5.67818C3.12463 6.05232 2.96541 6.49971 2.59127 6.67745C2.21713 6.85518 1.76974 6.69596 1.59201 6.32182C1.37247 5.85968 1.25 5.3431 1.25 4.8C1.25 2.83939 2.83939 1.25 4.8 1.25C5.3431 1.25 5.85969 1.37247 6.32182 1.59201C6.69596 1.76974 6.85518 2.21713 6.67745 2.59127C6.49971 2.96541 6.05232 3.12463 5.67818 2.9469Z');
const ALARM_RIGHT = new Path2D('M19.2 2.75C18.8842 2.75 18.5871 2.82088 18.3218 2.9469C17.9477 3.12463 17.5003 2.96541 17.3225 2.59127C17.1448 2.21713 17.304 1.76974 17.6782 1.59201C18.1403 1.37247 18.6569 1.25 19.2 1.25C21.1606 1.25 22.75 2.83939 22.75 4.8C22.75 5.3431 22.6275 5.85968 22.408 6.32182C22.2302 6.69596 21.7829 6.85518 21.4087 6.67745C21.0346 6.49971 20.8754 6.05232 21.0531 5.67818C21.1791 5.41291 21.25 5.11578 21.25 4.8C21.25 3.66782 20.3322 2.75 19.2 2.75Z');
const ALARM_BODY = new Path2D('M2.24999 12.5C2.24999 7.11522 6.61522 2.75 12 2.75C17.3848 2.75 21.75 7.11522 21.75 12.5C21.75 15.0498 20.7712 17.3709 19.1689 19.1083L21.5303 21.4697C21.8232 21.7626 21.8232 22.2374 21.5303 22.5303C21.2374 22.8232 20.7626 22.8232 20.4697 22.5303L18.0699 20.1306C16.4044 21.4572 14.2948 22.25 12 22.25C9.7052 22.25 7.59558 21.4572 5.93007 20.1306L3.53032 22.5303C3.23743 22.8232 2.76256 22.8232 2.46966 22.5303C2.17677 22.2374 2.17677 21.7626 2.46966 21.4697L4.83104 19.1083C3.22874 17.3709 2.24999 15.0498 2.24999 12.5ZM12.75 7.5C12.75 7.08579 12.4142 6.75 12 6.75C11.5858 6.75 11.25 7.08579 11.25 7.5V12.5C11.25 12.7586 11.3832 12.9989 11.6025 13.136L14.8025 15.136C15.1538 15.3555 15.6165 15.2488 15.836 14.8975C16.0555 14.5462 15.9488 14.0835 15.5975 13.864L12.75 12.0843V7.5Z');
const WIFI_PATH = new Path2D('M12 18l.01 0 M9.172 15.172a4 4 0 0 1 5.656 0 M6.343 12.343a8 8 0 0 1 11.314 0 M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0');

function scheduleRender() {
  cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(render);
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, color) {
  context.fillStyle = color;
  roundedRect(context, x, y, width, height, radius);
  context.fill();
}

function circle(context, x, y, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function label(context, text, x, y, size, color = '#fff', align = 'center') {
  context.save();
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.font = `400 ${size}px AppleNeo, sans-serif`;
  context.fillText(text, x, y);
  context.restore();
}

function centeredLabel(context, text, x, y, size, color = '#fff') {
  context.save();
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `400 ${size}px AppleNeo, sans-serif`;
  context.fillText(text, x, y);
  context.restore();
}

function drawPhone(context, cx, cy, size, color, angle = 0, flipY = false) {
  context.save();
  context.translate(cx, cy);
  context.rotate(angle);
  context.scale(size / 24, (flipY ? -size : size) / 24);
  context.translate(-12, -12);
  context.fillStyle = color;
  context.fill(PHONE_FILLED);
  context.restore();
}

function drawMessage(context, cx, cy, size, color) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(cx, cy - size * .06, size * .38, size * .29, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(cx - size * .25, cy + size * .11);
  context.lineTo(cx - size * .34, cy + size * .35);
  context.lineTo(cx - size * .05, cy + size * .2);
  context.closePath();
  context.fill();
  context.restore();
}

function drawAlarm(context, cx, cy, size, color) {
  context.save();
  context.translate(cx, cy);
  context.scale(size / 24, size / 24);
  context.translate(-12, -12);
  context.fillStyle = color;
  context.fill(ALARM_LEFT);
  context.fill(ALARM_RIGHT);
  context.fill(ALARM_BODY, 'evenodd');
  context.restore();
}

function drawWifi(context, cx, cy, size, color) {
  context.save();
  context.translate(cx, cy);
  context.scale(size / 24, size / 24);
  context.translate(-12, -12);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke(WIFI_PATH);
  context.restore();
}

function drawStatusBar(context) {
  const white = 'rgba(255,255,255,.96)';
  label(context, state.time || '12:35', 86, 104, 47, white, 'left');

  fillRoundedRect(context, 395, 40, 290, 80, 40, 'rgba(0,0,0,.94)');
  circle(context, 638, 80, 6, '#35df65');

  context.fillStyle = white;
  [14, 21, 29, 38].forEach((height, index) => {
    roundedRect(context, 769 + index * 17, 101 - height, 9, height, 4);
    context.fill();
  });

  drawWifi(context, 883, 81, 84, white);

  context.save();
  context.strokeStyle = white;
  context.lineWidth = 4;
  roundedRect(context, 937, 66, 76, 36, 9);
  context.stroke();
  fillRoundedRect(context, 1016, 77, 6, 14, 3, white);
  const level = Math.max(5, 62 * (state.battery / 100));
  fillRoundedRect(context, 944, 73, level, 22, 5, state.battery <= 20 ? '#ff453a' : white);
  context.restore();
}

function drawBackground(context, width, height) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#a8a8a8';
  context.fillRect(0, 0, width, height);

  if (!state.image) return;
  drawImageFromCrop(context, state.image, state.crop, width, height, state.blur);

  if (state.dim > 0) {
    context.fillStyle = `rgba(0,0,0,${state.dim / 100})`;
    context.fillRect(0, 0, width, height);
  }

  const vignette = context.createRadialGradient(width * .5, height * .48, height * .12, width * .5, height * .48, height * .68);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.32)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function getCropPlacement(image, crop, width, height) {
  const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scale = cover * crop.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  return {
    x: (width - drawWidth) / 2 + crop.x * (width / CROP_W),
    y: (height - drawHeight) / 2 + crop.y * (height / CROP_H),
    width: drawWidth,
    height: drawHeight,
  };
}

function drawImageFromCrop(context, image, crop, width, height, blur = 0) {
  const placement = getCropPlacement(image, crop, width, height);
  context.save();
  context.filter = blur ? `blur(${blur}px)` : 'none';
  context.drawImage(
    image,
    placement.x,
    placement.y,
    placement.width,
    placement.height,
  );
  context.restore();
}

function drawHelperActions(context, ui) {
  const y = state.mode === 'touch' ? 1660 : 1580;
  drawAlarm(context, 270, y, 72, '#fff');
  drawMessage(context, 810, y, 78, '#fff');
  label(context, ui.remind, 270, y + 106, state.language === 'ko' ? 39 : 42);
  label(context, ui.message, 810, y + 106, 42);
}

function drawTouchControls(context, ui) {
  circle(context, 270, 2010, 117, '#ff3b30');
  circle(context, 810, 2010, 117, '#12d75a');
  drawPhone(context, 270, 2010, 106, '#fff');
  drawPhone(context, 810, 2010, 106, '#fff', Math.PI / 4, true);
  label(context, ui.decline, 270, 2202, 43);
  label(context, ui.accept, 810, 2202, 43);
}

function drawSlideControl(context, ui) {
  const x = 128;
  const y = 1908;
  const width = 824;
  const height = 174;
  fillRoundedRect(context, x, y, width, height, height / 2, 'rgba(235,235,235,.3)');
  circle(context, x + 89, y + height / 2, 72, '#fff');
  drawPhone(context, x + 89, y + height / 2, 68, '#21d35d', Math.PI / 4, true);
  centeredLabel(context, ui.slide, x + width / 2, y + height / 2, state.language === 'ko' ? 39 : 42, '#fff');
}

function render() {
  drawBackground(ctx, canvas.width, canvas.height);
  const ui = copy[state.language];
  if (state.showStatus) drawStatusBar(ctx);

  const safeName = state.name.trim() || (state.language === 'ko' ? '이름' : 'Name');
  const nameSize = safeName.length > 22 ? 68 : safeName.length > 14 ? 78 : 92;
  label(ctx, safeName, canvas.width / 2, state.showStatus ? 338 : 240, nameSize);
  label(ctx, ui.calling, canvas.width / 2, state.showStatus ? 425 : 327, 55, 'rgba(235,235,240,.74)');

  drawHelperActions(ctx, ui);
  if (state.mode === 'touch') drawTouchControls(ctx, ui);
  else drawSlideControl(ctx, ui);

  fillRoundedRect(ctx, 382, 2292, 316, 14, 8, 'rgba(255,255,255,.92)');
}

function clampCrop() {
  if (!workingImage) return;
  const cover = Math.max(CROP_W / workingImage.naturalWidth, CROP_H / workingImage.naturalHeight);
  const drawWidth = workingImage.naturalWidth * cover * workingCrop.zoom;
  const drawHeight = workingImage.naturalHeight * cover * workingCrop.zoom;
  const maxX = Math.max(0, (drawWidth - CROP_W) / 2);
  const maxY = Math.max(0, (drawHeight - CROP_H) / 2);
  workingCrop.x = Math.max(-maxX, Math.min(maxX, workingCrop.x));
  workingCrop.y = Math.max(-maxY, Math.min(maxY, workingCrop.y));
}

function drawCrop() {
  cropCtx.clearRect(0, 0, CROP_W, CROP_H);
  cropCtx.fillStyle = '#a8a8a8';
  cropCtx.fillRect(0, 0, CROP_W, CROP_H);
  if (!workingImage) return;
  drawImageFromCrop(cropCtx, workingImage, workingCrop, CROP_W, CROP_H);

  cropCtx.save();
  cropCtx.strokeStyle = 'rgba(255,255,255,.28)';
  cropCtx.lineWidth = 2;
  [1 / 3, 2 / 3].forEach((part) => {
    cropCtx.beginPath();
    cropCtx.moveTo(CROP_W * part, 0);
    cropCtx.lineTo(CROP_W * part, CROP_H);
    cropCtx.stroke();
    cropCtx.beginPath();
    cropCtx.moveTo(0, CROP_H * part);
    cropCtx.lineTo(CROP_W, CROP_H * part);
    cropCtx.stroke();
  });
  cropCtx.restore();
}

function fitCropCanvas() {
  const shell = cropCanvas.parentElement;
  const availableWidth = shell.clientWidth;
  const availableHeight = shell.clientHeight;
  if (!availableWidth || !availableHeight) return;

  const displayScale = Math.min(availableWidth / CROP_W, availableHeight / CROP_H);
  cropCanvas.style.width = `${Math.floor(CROP_W * displayScale)}px`;
  cropCanvas.style.height = `${Math.floor(CROP_H * displayScale)}px`;
}

function openCrop(image, fileName, crop = { zoom: 1, x: 0, y: 0 }) {
  activePointers.clear();
  dragStart = null;
  pinchStart = null;
  workingImage = image;
  workingFileName = fileName;
  workingCrop = { ...crop };
  cropDialog.showModal();
  requestAnimationFrame(() => {
    fitCropCanvas();
    drawCrop();
  });
}

function updateRange(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  const percentage = ((value - min) / (max - min)) * 100;
  input.style.setProperty('--range-progress', `${percentage}%`);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function safeExportName() {
  return (state.name.trim() || 'callscene').replace(/[\\/:*?"<>|]/g, '-');
}

function downloadCanvas(sourceCanvas, fileName, successMessage) {
  sourceCanvas.toBlob((blob) => {
    if (!blob) {
      showToast('이미지를 저장하지 못했습니다. 다시 시도해 주세요.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(successMessage);
  }, 'image/png', 1);
}

async function exportWallpaper() {
  await document.fonts.ready;
  render();
  downloadCanvas(canvas, `${safeExportName()}-calling.png`, '통화화면 PNG 저장이 시작되었습니다.');
}

async function exportFullMockup() {
  await document.fonts.ready;
  render();

  const output = document.createElement('canvas');
  output.width = 1180;
  output.height = 2440;
  const outputCtx = output.getContext('2d');

  fillRoundedRect(outputCtx, 18, 320, 18, 220, 8, '#111');
  fillRoundedRect(outputCtx, 18, 620, 18, 220, 8, '#111');
  fillRoundedRect(outputCtx, 30, 20, 1120, 2400, 165, '#000');

  outputCtx.save();
  roundedRect(outputCtx, 50, 50, 1080, 2340, 132);
  outputCtx.clip();
  outputCtx.drawImage(canvas, 50, 50, 1080, 2340);
  outputCtx.restore();

  downloadCanvas(output, `${safeExportName()}-full.png`, '투명 배경의 전체 PNG 저장이 시작되었습니다.');
}

$('#backgroundInput').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('이미지 파일을 선택해 주세요.');
    event.target.value = '';
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    openCrop(image, file.name);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('이 이미지 형식은 브라우저에서 열 수 없습니다.');
    event.target.value = '';
  };
  image.src = url;
});

$('#recropButton').addEventListener('click', () => {
  if (state.image) openCrop(state.image, state.fileName, state.crop);
});

$('#cropReset').addEventListener('click', () => {
  workingCrop = { zoom: 1, x: 0, y: 0 };
  drawCrop();
});

$('#cropApply').addEventListener('click', () => {
  if (!workingImage) return;
  state.image = workingImage;
  state.fileName = workingFileName;
  state.crop = { ...workingCrop };
  $('#fileName').textContent = state.fileName;
  $('#recropButton').disabled = false;
  cropDialog.close('apply');
  $('#backgroundInput').value = '';
  scheduleRender();
  showToast('배경 이미지가 적용되었습니다.');
});

cropCanvas.addEventListener('pointerdown', (event) => {
  if (!workingImage) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  cropCanvas.classList.add('dragging');
  if (activePointers.size === 1) {
    dragStart = { clientX: event.clientX, clientY: event.clientY, x: workingCrop.x, y: workingCrop.y };
    pinchStart = null;
  } else if (activePointers.size === 2) {
    const [first, second] = [...activePointers.values()];
    pinchStart = { distance: Math.hypot(second.x - first.x, second.y - first.y), zoom: workingCrop.zoom };
    dragStart = null;
  }
});

function moveCropPointer(event) {
  if (!activePointers.has(event.pointerId)) return;
  if (event.cancelable) event.preventDefault();
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (activePointers.size >= 2 && pinchStart) {
    const [first, second] = [...activePointers.values()];
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    workingCrop.zoom = Math.max(1, Math.min(3, pinchStart.zoom * (distance / Math.max(1, pinchStart.distance))));
    clampCrop();
    drawCrop();
    return;
  }
  if (!dragStart) return;
  const bounds = cropCanvas.getBoundingClientRect();
  workingCrop.x = dragStart.x + (event.clientX - dragStart.clientX) * (CROP_W / bounds.width);
  workingCrop.y = dragStart.y + (event.clientY - dragStart.clientY) * (CROP_H / bounds.height);
  clampCrop();
  drawCrop();
}

function endCropDrag(event) {
  activePointers.delete(event.pointerId);
  pinchStart = null;
  if (activePointers.size === 1) {
    const [remaining] = activePointers.values();
    dragStart = { clientX: remaining.x, clientY: remaining.y, x: workingCrop.x, y: workingCrop.y };
  } else {
    dragStart = null;
    cropCanvas.classList.remove('dragging');
  }
}

window.addEventListener('pointermove', moveCropPointer, { passive: false });
window.addEventListener('pointerup', endCropDrag);
window.addEventListener('pointercancel', endCropDrag);
window.addEventListener('resize', () => {
  if (cropDialog.open) fitCropCanvas();
});
cropCanvas.addEventListener('dragstart', (event) => event.preventDefault());
cropCanvas.addEventListener('wheel', (event) => {
  if (!workingImage) return;
  event.preventDefault();
  workingCrop.zoom = Math.max(1, Math.min(3, workingCrop.zoom + (event.deltaY > 0 ? -.06 : .06)));
  clampCrop();
  drawCrop();
}, { passive: false });

$('#callerName').addEventListener('input', (event) => {
  state.name = event.target.value;
  scheduleRender();
});

$('#statusTime').addEventListener('input', (event) => {
  event.target.value = event.target.value.replace(/[^0-9:]/g, '');
  state.time = event.target.value;
  scheduleRender();
});

$('#statusTime').addEventListener('blur', (event) => {
  if (!/^\d{1,2}:\d{2}$/.test(event.target.value)) {
    event.target.value = '12:35';
    state.time = '12:35';
    scheduleRender();
  }
});

$$('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => {
    state.language = button.dataset.lang;
    $$('[data-lang]').forEach((item) => item.classList.toggle('active', item === button));
    scheduleRender();
  });
});

$$('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    $$('[data-mode]').forEach((item) => item.classList.toggle('active', item === button));
    scheduleRender();
  });
});

$('#statusToggle').addEventListener('change', (event) => {
  state.showStatus = event.target.checked;
  $('#batteryRange').closest('.battery-field').style.opacity = state.showStatus ? '1' : '.4';
  scheduleRender();
});

[
  ['#dimRange', 'dim', '#dimOutput', (value) => `${value}%`],
  ['#blurRange', 'blur', '#blurOutput', (value) => String(value)],
  ['#batteryRange', 'battery', '#batteryOutput', (value) => `${value}%`],
].forEach(([selector, key, output, formatter]) => {
  const input = $(selector);
  input.addEventListener('input', () => {
    state[key] = Number(input.value);
    $(output).textContent = formatter(input.value);
    updateRange(input);
    scheduleRender();
  });
  updateRange(input);
});

$('#cropClose').addEventListener('click', () => { $('#backgroundInput').value = ''; });
cropDialog.addEventListener('cancel', () => { $('#backgroundInput').value = ''; });
$('#saveButton').addEventListener('click', exportWallpaper);
$('#fullSaveButton').addEventListener('click', exportFullMockup);

document.fonts.ready.then(render);
