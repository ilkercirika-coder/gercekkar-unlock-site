const DEFAULT_WORKER_BASE = 'https://api.gercekkar.com';
const STORAGE_KEYS = {
  deviceId: 'gk_unlock_device_id',
  licenseKey: 'gk_unlock_license_key',
};

function getParams() {
  return new URLSearchParams(window.location.search || '');
}

function normalizeWorkerBase(candidate) {
  const raw = (candidate || '').trim();
  if (!raw) return DEFAULT_WORKER_BASE;
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return DEFAULT_WORKER_BASE;
  }
}

const params = getParams();
const WORKER_BASE = normalizeWorkerBase(params.get('workerBase') || DEFAULT_WORKER_BASE);

function maskDeviceId(deviceId) {
  const tail = String(deviceId || '').slice(-4);
  return `••••${tail}`;
}

function readDeviceId() {
  const fromQuery = (params.get('deviceId') || '').trim();
  if (fromQuery) {
    localStorage.setItem(STORAGE_KEYS.deviceId, fromQuery);
    return fromQuery;
  }
  return (localStorage.getItem(STORAGE_KEYS.deviceId) || '').trim();
}

function validateEmail(email) {
  const value = String(email || '').trim();
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(value)) {
    return 'Geçerli bir email adresi gir.';
  }
  const tld = value.split('.').pop() || '';
  if (tld.length < 2) {
    return 'Email uzantısı en az 2 karakter olmalı.';
  }
  return '';
}

function getLicenseFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return String(payload.licenseKey || payload.license || payload.key || payload.token || '').trim();
}

function show(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function setupIndexPage() {
  const form = document.getElementById('unlockForm');
  if (!form) return;

  const emailInput = document.getElementById('email');
  const emailError = document.getElementById('emailError');
  const submitBtn = document.getElementById('submitBtn');
  const result = document.getElementById('result');
  const licenseKeyEl = document.getElementById('licenseKey');
  const copyBtn = document.getElementById('copyBtn');
  const copyStatus = document.getElementById('copyStatus');
  const errorPanel = document.getElementById('errorPanel');
  const deviceRow = document.getElementById('deviceRow');

  const deviceId = readDeviceId();
  if (deviceId) {
    deviceRow.innerHTML = `<span class="device-info">Cihaz: ${maskDeviceId(deviceId)}</span>`;
  } else {
    deviceRow.innerHTML = '<span class="device-warn">Cihaz bilgisi alınamadı — yine de devam edebilirsin.</span>';
  }

  const clearMessages = () => {
    emailError.textContent = '';
    errorPanel.textContent = '';
    show(errorPanel, false);
  };

  emailInput.addEventListener('input', () => {
    if (!emailError.textContent) return;
    const message = validateEmail(emailInput.value);
    emailError.textContent = message;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessages();

    const email = emailInput.value.trim();
    const validationMessage = validateEmail(email);
    if (validationMessage) {
      emailError.textContent = validationMessage;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor…';

    try {
      const response = await fetch(`${WORKER_BASE}/v1/lead/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, deviceId: deviceId || null }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.ok) {
        const message = data?.message || 'İstek işlenemedi. Lütfen tekrar dene.';
        throw new Error(message);
      }

      const licenseKey = getLicenseFromPayload(data);
      if (!licenseKey) {
        throw new Error('Lisans kodu alınamadı. Lütfen tekrar dene.');
      }

      localStorage.setItem(STORAGE_KEYS.licenseKey, licenseKey);
      licenseKeyEl.textContent = licenseKey;
      copyStatus.textContent = '';
      show(result, true);
    } catch (err) {
      errorPanel.textContent = err?.message || 'Beklenmeyen bir hata oluştu.';
      show(errorPanel, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kilidi Aç';
    }
  });

  copyBtn?.addEventListener('click', async () => {
    const licenseKey = (licenseKeyEl?.textContent || '').trim();
    const copied = await copyText(licenseKey);
    copyStatus.textContent = copied ? 'Kopyalandı ✅' : 'Kopyalama başarısız. Elle seçip kopyalayabilirsin.';
  });
}

function setupSuccessPage() {
  const licenseKeyEl = document.getElementById('licenseKey');
  if (!licenseKeyEl) return;

  const copyBtn = document.getElementById('copyBtn');
  const copyStatus = document.getElementById('copyStatus');
  const missingPanel = document.getElementById('missingPanel');
  const licenseKey = (localStorage.getItem(STORAGE_KEYS.licenseKey) || '').trim();

  if (!licenseKey) {
    licenseKeyEl.textContent = '-';
    show(missingPanel, true);
  } else {
    licenseKeyEl.textContent = licenseKey;
    show(missingPanel, false);
  }

  copyBtn?.addEventListener('click', async () => {
    const copied = await copyText(licenseKeyEl.textContent.trim());
    copyStatus.textContent = copied ? 'Kopyalandı ✅' : 'Kopyalama başarısız. Elle seçip kopyalayabilirsin.';
  });
}

setupIndexPage();
setupSuccessPage();
