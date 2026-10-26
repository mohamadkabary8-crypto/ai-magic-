
const input = document.getElementById("imageInput");
const processBtn = document.getElementById("processBtn");
const statusBox = document.getElementById("status");
const preview = document.getElementById("preview");
const originalPreview = document.getElementById("originalPreview");
const resultPreview = document.getElementById("resultPreview");
const downloadLink = document.getElementById("downloadLink");
const toolTitle = document.getElementById("toolTitle");
const toolDescription = document.getElementById("toolDescription");
const uploadTitle = document.getElementById("uploadTitle");

const tools = {
  "remove-bg": {
    title: "✂️ حذف پس‌زمینه",
    description: "یک عکس انتخاب کن. مدل حذف پس‌زمینه در مرورگر بارگیری می‌شود و پردازش تصویر ممکن است چند دقیقه طول بکشد.",
    ready: true
  },
  "child": { title: "👨‍👩‍👧 پیش‌بینی چهرهٔ فرزند", ready: false },
  "anime": { title: "🎨 تبدیل به انیمه", ready: false },
  "enhance": { title: "✨ افزایش کیفیت عکس", ready: false },
  "restore": { title: "🖼️ ترمیم عکس قدیمی", ready: false },
  "avatar": { title: "🧑‍🎤 ساخت آواتار", ready: false },
  "color": { title: "🌈 رنگی کردن عکس", ready: false },
  "erase": { title: "🪄 حذف اشیاء", ready: false },
  "portrait": { title: "📸 بهبود پرتره", ready: false },
  "style": { title: "🪄 تغییر سبک تصویر", ready: false }
};

let selectedTool = "remove-bg";
let selectedFile = null;
let originalURL = null;
let resultURL = null;
let isProcessing = false;
let removeBackgroundFunction = null;

function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = "status" + (type ? " " + type : "");
}

function clearResult() {
  if (originalURL) URL.revokeObjectURL(originalURL);
  if (resultURL) URL.revokeObjectURL(resultURL);
  originalURL = null;
  resultURL = null;
  originalPreview.removeAttribute("src");
  resultPreview.removeAttribute("src");
  downloadLink.removeAttribute("href");
  preview.hidden = true;
}

function selectTool(id) {
  const tool = tools[id];
  if (!tool) return;

  selectedTool = id;

  document.querySelectorAll(".tool").forEach(button => {
    button.classList.toggle("active", button.dataset.tool === id);
  });

  toolTitle.textContent = tool.title;
  toolDescription.textContent = tool.description ||
    "این ابزار هنوز به موتور هوش مصنوعی متصل نشده است.";

  const ready = tool.ready === true;
  input.disabled = !ready || isProcessing;
  processBtn.disabled = !ready || !selectedFile || isProcessing;
  processBtn.textContent = ready ? "حذف پس‌زمینه" : "به‌زودی";
  uploadTitle.textContent = ready ? "انتخاب تصویر" : "این ابزار هنوز فعال نیست";

  clearResult();

  if (!ready) {
    setStatus("این قابلیت هنوز پیاده‌سازی نشده است؛ نتیجهٔ ساختگی نمایش داده نمی‌شود.");
  } else if (selectedFile) {
    setStatus("تصویر انتخاب شده است. برای شروع پردازش، دکمه را بزنید.");
  } else {
    setStatus("برای شروع، یک تصویر انتخاب کن.");
  }
}

document.querySelectorAll(".tool").forEach(button => {
  button.addEventListener("click", () => selectTool(button.dataset.tool));
});

input.addEventListener("change", () => {
  clearResult();
  selectedFile = input.files?.[0] || null;

  if (!selectedFile) {
    processBtn.disabled = true;
    setStatus("تصویری انتخاب نشده است.");
    return;
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(selectedFile.type)) {
    selectedFile = null;
    input.value = "";
    processBtn.disabled = true;
    setStatus("فرمت فایل پشتیبانی نمی‌شود. JPG، PNG یا WEBP انتخاب کن.", "error");
    return;
  }

  if (selectedFile.size > 10 * 1024 * 1024) {
    selectedFile = null;
    input.value = "";
    processBtn.disabled = true;
    setStatus("حجم تصویر باید کمتر از 10 مگابایت باشد.", "error");
    return;
  }

  originalURL = URL.createObjectURL(selectedFile);
  originalPreview.src = originalURL;
  preview.hidden = false;
  processBtn.disabled = selectedTool !== "remove-bg" || isProcessing;
  setStatus("تصویر آماده است. هنوز پردازشی انجام نشده است.");
});

async function loadBackgroundRemoval() {
  if (removeBackgroundFunction) return removeBackgroundFunction;

  setStatus("در حال بارگیری موتور هوش مصنوعی؛ بار اول ممکن است زمان‌بر باشد...");

  const library = await import(
    "https://esm.sh/@imgly/background-removal@1.7.0"
  );

  if (typeof library.default !== "function") {
    throw new Error("موتور حذف پس‌زمینه به شکل مورد انتظار بارگیری نشد.");
  }

  removeBackgroundFunction = library.default;
  return removeBackgroundFunction;
}

processBtn.addEventListener("click", async () => {
  if (isProcessing) return;

  if (selectedTool !== "remove-bg") {
    setStatus("این ابزار هنوز آماده نیست و پردازشی انجام نشد.", "error");
    return;
  }

  if (!selectedFile) {
    setStatus("ابتدا یک تصویر انتخاب کن.", "error");
    return;
  }

  isProcessing = true;
  processBtn.disabled = true;
  input.disabled = true;
  clearResult();

  try {
    const removeBackground = await loadBackgroundRemoval();

    const resultBlob = await removeBackground(selectedFile, {
      progress: (key, current, total) => {
        if (total > 0) {
          const percent = Math.round((current / total) * 100);
          setStatus(`در حال پردازش تصویر: ${percent}%`);
        } else {
          setStatus("موتور هوش مصنوعی در حال پردازش تصویر است...");
        }
      }
    });

    if (!(resultBlob instanceof Blob) || resultBlob.size === 0) {
      throw new Error("موتور پردازش تصویر معتبری برنگرداند.");
    }

    resultURL = URL.createObjectURL(resultBlob);
    resultPreview.src = resultURL;
    downloadLink.href = resultURL;
    preview.hidden = false;

    setStatus("پردازش تمام شد. تصویر نتیجه آمادهٔ مشاهده و دانلود است.", "success");
  } catch (error) {
    console.error("AI Magic processing error:", error);

    let message = error?.message || "خطای نامشخص";

    if (location.protocol === "file:") {
      message = "این فایل را مستقیم از حافظه باز کرده‌ای. برای بارگیری ماژول‌های هوش مصنوعی، سایت را روی HTTPS مانند GitHub Pages اجرا کن.";
    } else if (!navigator.onLine) {
      message = "اتصال اینترنت قطع است. برای بارگیری موتور هوش مصنوعی دوباره تلاش کن.";
    }

    setStatus("پردازش ناموفق بود: " + message, "error");
  } finally {
    isProcessing = false;
    input.disabled = selectedTool !== "remove-bg";
    processBtn.disabled = selectedTool !== "remove-bg" || !selectedFile;
  }
});

window.addEventListener("beforeunload", () => {
  if (originalURL) URL.revokeObjectURL(originalURL);
  if (resultURL) URL.revokeObjectURL(resultURL);
});

selectTool("remove-bg");
