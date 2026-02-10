function applyPanelMode() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const byQuery = params.get('mode') === 'panel';
    const byName = window.name === 'tyext-panel';
    if (byQuery || byName) {
      document.documentElement.setAttribute('data-mode', 'panel');
    }
    window.addEventListener('message', (event) => {
      if (event?.data?.tpMode === 'panel') {
        document.documentElement.setAttribute('data-mode', 'panel');
      }
    });
  } catch {}
}

applyPanelMode();

const el = {
  themeToggle: document.getElementById('themeToggle'),
  dockToggle: document.getElementById('dockToggle'),
  panelCloseBtn: document.getElementById('panelCloseBtn'),
  vatSelect: document.getElementById('vatSelect'),
  btnRefreshSellers: document.getElementById('btnRefreshSellers'),
  tableBodySellers: document.getElementById('tableBodySellers'),
  inputSalePrice: document.getElementById('inputSalePrice'),
  inputBuyCost: document.getElementById('inputBuyCost'),
  inputCargo: document.getElementById('inputCargo'),
  inputCommission: document.getElementById('inputCommission'),
  sameDayShippingChk: document.getElementById('sameDayShippingChk'),
  chkBuyCostVatIncluded: document.getElementById('chkBuyCostVatIncluded'),
  chkCargoVatIncluded: document.getElementById('chkCargoVatIncluded'),
  chkCommissionVatIncluded: document.getElementById('chkCommissionVatIncluded'),
  buyHelperText: document.getElementById('buyHelperText'),
  cargoHelperText: document.getElementById('cargoHelperText'),
  commissionHelperText: document.getElementById('commissionHelperText'),
  resultNetProfit: document.getElementById('resultNetProfit'),
  resultMargin: document.getElementById('resultMargin'),
  resultRoi: document.getElementById('resultRoi'),
  generalBreakdownToggle: document.getElementById('generalBreakdownToggle'),
  generalBreakdownBody: document.getElementById('generalBreakdownBody'),
  generalChevron: document.getElementById('generalChevron'),
  vatBreakdownToggle: document.getElementById('vatBreakdownToggle'),
  vatBreakdownBody: document.getElementById('vatBreakdownBody'),
  vatChevron: document.getElementById('vatChevron'),
  generalSale: document.getElementById('generalSale'),
  generalBuy: document.getElementById('generalBuy'),
  generalCargo: document.getElementById('generalCargo'),
  generalCommission: document.getElementById('generalCommission'),
  generalService: document.getElementById('generalService'),
  generalPayableVat: document.getElementById('generalPayableVat'),
  generalNetAfterVat: document.getElementById('generalNetAfterVat'),
  breakdownSaleVat: document.getElementById('breakdownSaleVat'),
  breakdownBuyVat: document.getElementById('breakdownBuyVat'),
  breakdownCargoVat: document.getElementById('breakdownCargoVat'),
  breakdownCommissionVat: document.getElementById('breakdownCommissionVat'),
  breakdownServiceVat: document.getElementById('breakdownServiceVat'),
  breakdownPayableVat: document.getElementById('breakdownPayableVat'),
  refreshStatus: document.getElementById('refreshStatus'),
};

const state = {
  sellers: [],
  selectedSellerIndex: 0,
  vatRate: 0.2,
  sameDayShipping: false,
  inputs: {
    salePrice: null,
    buyCost: null,
    cargoCost: null,
    commissionRate: null,
    buyCostVatIncluded: true,
    cargoVatIncluded: true,
    commissionVatIncluded: true,
    salePriceTouched: false,
  },
};

let cachedMeta = { productId: null, url: null, mode: null, fetchedAt: 0 };
let isScraping = false;
let scrapeInFlight = null;
let refreshTimer = null;
let commissionObserver;
let cargoObserver;

const THEME_KEY = 'tp_theme';
const PANEL_SIDE_KEY = 'tp_panel_side';
const SERVICE_FEE_INCL_VAT = Object.freeze({
  sameDay: 8.39,
  standard: 13.39,
});

function round2(num) {
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function getServiceFeeInclVat(sameDayShipping) {
  return sameDayShipping ? SERVICE_FEE_INCL_VAT.sameDay : SERVICE_FEE_INCL_VAT.standard;
}

function setSameDayShipping(nextValue) {
  state.sameDayShipping = !!nextValue;
  renderAll();
}

function updateEngineState(patch) {
  if (!patch || typeof patch !== 'object') return getEngineStateSnapshot();
  if (Object.prototype.hasOwnProperty.call(patch, 'sameDayShipping')) {
    state.sameDayShipping = !!patch.sameDayShipping;
  }
  return getEngineStateSnapshot();
}

function getEngineStateSnapshot() {
  return {
    sameDayShipping: !!state.sameDayShipping,
  };
}

if (typeof window !== 'undefined') {
  window.tyProfitEngine = window.tyProfitEngine || {};
  window.tyProfitEngine.setSameDayShipping = setSameDayShipping;
  window.tyProfitEngine.updateState = updateEngineState;
  window.tyProfitEngine.getState = getEngineStateSnapshot;
}

function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : 'light';
}

function normalizePanelSide(side) {
  return side === 'left' ? 'left' : 'right';
}

function setTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  document.documentElement.dataset.theme = nextTheme;
  const buttons = document.querySelectorAll('[data-theme-choice]');
  buttons.forEach((btn) => {
    const isActive = btn.dataset.themeChoice === nextTheme;
    btn.classList.toggle('isActive', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function readThemeSetting() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(THEME_KEY, (res) => {
        if (chrome.runtime.lastError) {
          resolve('light');
          return;
        }
        resolve(normalizeTheme(res?.[THEME_KEY]));
      });
    } catch (e) {
      resolve('light');
    }
  });
}

function saveThemeSetting(theme) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [THEME_KEY]: normalizeTheme(theme) }, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

async function initTheme() {
  const savedTheme = await readThemeSetting();
  setTheme(savedTheme);

  if (!el.themeToggle) return;
  el.themeToggle.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-theme-choice]');
    if (!btn) return;
    const nextTheme = normalizeTheme(btn.dataset.themeChoice);
    setTheme(nextTheme);
    await saveThemeSetting(nextTheme);
  });
}
function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseTrNumber(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/\s+/g, '');

  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2) {
      const [left, right] = parts;
      if (right.length === 3 && left.length > 0) {
        const n = Number(left + right);
        return Number.isFinite(n) ? n : null;
      }
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(cleaned.replace(/\./g, ''));
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatNumber2(num) {
  if (!Number.isFinite(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

function setPanelSide(side) {
  const nextSide = normalizePanelSide(side);
  const buttons = document.querySelectorAll('[data-dock-choice]');
  buttons.forEach((btn) => {
    const isActive = btn.dataset.dockChoice === nextSide;
    btn.classList.toggle('isActive', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function readPanelSideSetting() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(PANEL_SIDE_KEY, (res) => {
        if (chrome.runtime.lastError) {
          resolve('right');
          return;
        }
        resolve(normalizePanelSide(res?.[PANEL_SIDE_KEY]));
      });
    } catch (e) {
      resolve('right');
    }
  });
}

function savePanelSideSetting(side) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [PANEL_SIDE_KEY]: normalizePanelSide(side) }, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

async function notifyPanelSide(side) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'SET_PANEL_SIDE', payload: { side } });
  } catch {}
}

async function closeDockPanel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_PANEL' });
  } catch {}
}

async function initDockToggle() {
  const savedSide = await readPanelSideSetting();
  setPanelSide(savedSide);
  await notifyPanelSide(savedSide);

  if (!el.dockToggle) return;
  el.dockToggle.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-dock-choice]');
    if (!btn) return;
    const nextSide = normalizePanelSide(btn.dataset.dockChoice);
    setPanelSide(nextSide);
    await savePanelSideSetting(nextSide);
    await notifyPanelSide(nextSide);
  });
}

function formatMoney2(num) {
  if (!Number.isFinite(num)) return '-';
  return `${formatNumber2(num)} TL`;
}

function formatPercent2(num) {
  if (!Number.isFinite(num)) return '-';
  return `%${formatNumber2(num)}`;
}

function formatTl(num) {
  return formatMoney2(num);
}

function formatPercent(num) {
  return formatPercent2(num);
}

function clamp(num, min, max) {
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function getRoiBandColor(roiPercent) {
  const isDark = document.documentElement?.dataset?.theme === 'dark';
  if (!Number.isFinite(roiPercent)) return isDark ? '#1f2937' : '#ffffff';
  if (roiPercent < 0) return isDark ? '#7f1d1d' : '#ef4444';
  const minRoi = -50;
  const maxRoi = 100;
  const t = (clamp(roiPercent, minRoi, maxRoi) - minRoi) / (maxRoi - minRoi);
  const hue = Math.round(120 * t); // 0=red, 120=green
  return isDark ? `hsl(${hue} 46% 30%)` : `hsl(${hue} 48% 86%)`;
}

function paintRoiBand(roiPercent) {
  if (!el.resultRoi) return;
  el.resultRoi.style.setProperty('background-color', getRoiBandColor(roiPercent), 'important');
}

function toVatIncluded(amount, vatRate, isVatIncluded) {
  if (!Number.isFinite(amount)) return null;
  return isVatIncluded ? amount : amount * (1 + vatRate);
}

function calcProfit(inputs) {
  const r = Number(inputs?.vatRate ?? 0);
  const safeRate = Number.isFinite(r) ? r : 0;
  const excl = (x) => x / (1 + safeRate);
  const vatPart = (x) => x - excl(x);

  const saleIncl = Number.isFinite(inputs?.saleIncl) ? inputs.saleIncl : 0;
  const buyIncl = Number.isFinite(inputs?.buyIncl) ? inputs.buyIncl : 0;
  const commissionPct = Number.isFinite(inputs?.commissionPct) ? inputs.commissionPct : 0;
  const commissionInclOverride = Number.isFinite(inputs?.commissionIncl)
    ? inputs.commissionIncl
    : null;
  const shippingIncl = Number.isFinite(inputs?.shippingIncl) ? inputs.shippingIncl : 0;
  const serviceFeeInclVat = Number.isFinite(inputs?.serviceFeeInclVat)
    ? round2(inputs.serviceFeeInclVat)
    : round2(getServiceFeeInclVat(!!inputs?.sameDayShipping));
  const sameDayShipping = !!inputs?.sameDayShipping;
  const stopajRate = Number.isFinite(inputs?.stopajRate) ? inputs.stopajRate : 0;

  const deductVatOnBuy = inputs?.deductVatOnBuy !== false;
  const deductVatOnShipping = inputs?.deductVatOnShipping !== false;
  const deductVatOnCommission = inputs?.deductVatOnCommission !== false;
  const deductVatOnServiceFee = inputs?.deductVatOnServiceFee !== false;

  const saleExcl = excl(saleIncl);
  const saleVat = vatPart(saleIncl);

  const buyExcl = excl(buyIncl);
  const buyVat = deductVatOnBuy ? vatPart(buyIncl) : 0;

  const commissionIncl =
    commissionInclOverride != null ? commissionInclOverride : saleIncl * (commissionPct / 100);
  const commissionVat = deductVatOnCommission ? vatPart(commissionIncl) : 0;

  const cargoVat = deductVatOnShipping ? vatPart(shippingIncl) : 0;
  const serviceVat = deductVatOnServiceFee ? vatPart(serviceFeeInclVat) : 0;

  const stopaj = saleExcl * stopajRate;

  const inputVatTotal = buyVat + cargoVat + commissionVat + serviceVat;
  const payableVatRaw = saleVat - inputVatTotal;
  const payableVat = payableVatRaw < 0 ? 0 : payableVatRaw;

  const profitBeforeVat =
    saleIncl - buyIncl - commissionIncl - shippingIncl - serviceFeeInclVat - stopaj;

  const netProfit = profitBeforeVat - payableVat;
  const marginPercent = saleIncl > 0 ? (netProfit / saleIncl) * 100 : null;
  const roiPercent = buyExcl > 0 ? (netProfit / buyExcl) * 100 : null;

  return {
    saleIncl,
    saleExcl,
    saleVat,
    buyIncl,
    buyExcl,
    buyVat,
    commissionIncl,
    commissionVat,
    shippingIncl,
    cargoVat,
    serviceFeeInclVat,
    sameDayShipping,
    serviceVat,
    stopaj,
    payableVat,
    netProfit,
    marginPercent,
    roiPercent,
  };
}

function getSelectedSeller() {
  return state.sellers[state.selectedSellerIndex] || null;
}

function resolveSaleIncl() {
  if (Number.isFinite(state.inputs.salePrice)) return state.inputs.salePrice;
  const sel = getSelectedSeller();
  return Number.isFinite(sel?.price) ? sel.price : null;
}

function resolveBuyIncl() {
  return toVatIncluded(state.inputs.buyCost, state.vatRate, state.inputs.buyCostVatIncluded);
}

function updateHelpers() {
  // Buy cost helper
  if (!Number.isFinite(state.inputs.buyCost)) {
    el.buyHelperText.textContent = 'KDV Hariç: -';
  } else if (state.inputs.buyCostVatIncluded) {
    const excl = state.inputs.buyCost / (1 + state.vatRate);
    el.buyHelperText.textContent = `KDV Hariç: ${formatMoney2(excl)}`;
  } else {
    const incl = state.inputs.buyCost * (1 + state.vatRate);
    el.buyHelperText.textContent = `KDV Dahil: ${formatMoney2(incl)}`;
  }

  // Cargo helper
  if (!Number.isFinite(state.inputs.cargoCost)) {
    el.cargoHelperText.textContent = 'KDV Hariç: -';
  } else if (state.inputs.cargoVatIncluded) {
    const excl = state.inputs.cargoCost / (1 + state.vatRate);
    el.cargoHelperText.textContent = `KDV Hariç: ${formatMoney2(excl)}`;
  } else {
    const incl = state.inputs.cargoCost * (1 + state.vatRate);
    el.cargoHelperText.textContent = `KDV Dahil: ${formatMoney2(incl)}`;
  }

  // Commission helper
  const saleIncl = resolveSaleIncl();
  const rate = Number.isFinite(state.inputs.commissionRate) ? state.inputs.commissionRate : null;
  if (!Number.isFinite(saleIncl) || !Number.isFinite(rate)) {
    el.commissionHelperText.textContent = 'KDV Hariç: -';
  } else {
    const feeIncl = saleIncl * (rate / 100);
    if (state.inputs.commissionVatIncluded) {
      const ex = feeIncl / (1 + state.vatRate);
      el.commissionHelperText.textContent = `KDV Hariç: ${formatMoney2(ex)}`;
    } else {
      const incl = feeIncl * (1 + state.vatRate);
      el.commissionHelperText.textContent = `KDV Dahil: ${formatMoney2(incl)}`;
    }
  }
}

function formatCoupon(row) {
  const promotions = row?.promotions;
  if (Array.isArray(promotions) && promotions.length > 0) {
    let total = 0;
    let found = false;
    for (const p of promotions) {
      const v =
        p?.amount ??
        p?.discountAmount ??
        p?.discount ??
        p?.value ??
        p?.price;
      const n = Number(v);
      if (Number.isFinite(n)) {
        total += n;
        found = true;
      }
    }
    if (found) return formatMoney2(total);
    return 'Var';
  }
  if (Number.isFinite(row?.coupon)) {
    return formatMoney2(row.coupon);
  }
  return '-';
}

function renderMoneyCell(cell, value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(.+)\s+TL$/);
  if (!match) {
    cell.textContent = text || '-';
    return;
  }

  const num = document.createElement('span');
  num.className = 'price-num';
  num.textContent = match[1];

  const cur = document.createElement('span');
  cur.className = 'price-cur';
  cur.textContent = 'TL';

  cell.replaceChildren(num, cur);
}

function renderTable() {
  const tbody = el.tableBodySellers;
  tbody.innerHTML = '';

  if (!Array.isArray(state.sellers) || state.sellers.length === 0) return;

  state.sellers.forEach((row, idx) => {
    const tr = document.createElement('tr');
    if (idx === state.selectedSellerIndex) tr.classList.add('selected');
    if (row?.isBuybox === true) tr.classList.add('isBuyboxRow');
    tr.addEventListener('click', () => {
      state.selectedSellerIndex = idx;
      if (Number.isFinite(row?.price)) {
        state.inputs.salePrice = row.price;
        state.inputs.salePriceTouched = true;
      }
      renderAll();
    });

    const sellerCell = document.createElement('td');
    const sellerWrap = document.createElement('div');
    sellerWrap.className = 'tp-buybox';
    const sellerName = document.createElement('span');
    sellerName.textContent = row?.merchantName || '-';
    sellerWrap.appendChild(sellerName);
    sellerCell.appendChild(sellerWrap);

    const qtyCell = document.createElement('td');
    qtyCell.className = 'tp-right';
    qtyCell.textContent = Number.isFinite(row?.quantity) ? String(row.quantity) : '-';

    const scoreCell = document.createElement('td');
    scoreCell.className = 'tp-right';
    scoreCell.textContent = Number.isFinite(row?.merchantScore) ? formatNumber2(row.merchantScore) : '-';

    const couponCell = document.createElement('td');
    couponCell.className = 'tp-right';
    renderMoneyCell(couponCell, formatCoupon(row));

    const priceCell = document.createElement('td');
    priceCell.className = 'tp-right';
    if (Number.isFinite(row?.price)) {
      renderMoneyCell(priceCell, formatMoney2(row.price));
    } else {
      priceCell.textContent = '-';
    }

    const indexCell = document.createElement('td');
    indexCell.className = 'tp-right';
    indexCell.textContent = `${idx + 1}`;
    tr.appendChild(indexCell);
    tr.appendChild(sellerCell);
    tr.appendChild(qtyCell);
    tr.appendChild(scoreCell);
    tr.appendChild(couponCell);
    tr.appendChild(priceCell);
    tbody.appendChild(tr);
  });
}

function renderInputs() {
  const active = document.activeElement;
  if (active !== el.inputSalePrice) {
    el.inputSalePrice.value = state.inputs.salePrice == null ? '' : formatNumber2(state.inputs.salePrice);
  }
  if (active !== el.inputBuyCost) {
    el.inputBuyCost.value = state.inputs.buyCost == null ? '' : formatNumber2(state.inputs.buyCost);
  }
  if (active !== el.inputCargo) {
    el.inputCargo.value = state.inputs.cargoCost == null ? '' : formatNumber2(state.inputs.cargoCost);
  }
  if (active !== el.inputCommission) {
    el.inputCommission.value =
      state.inputs.commissionRate == null ? '' : formatNumber2(state.inputs.commissionRate);
  }

  el.chkBuyCostVatIncluded.checked = !!state.inputs.buyCostVatIncluded;
  el.chkCargoVatIncluded.checked = !!state.inputs.cargoVatIncluded;
  el.chkCommissionVatIncluded.checked = !!state.inputs.commissionVatIncluded;
  if (el.sameDayShippingChk) {
    el.sameDayShippingChk.checked = !!state.sameDayShipping;
  }
  if (el.vatSelect) {
    el.vatSelect.value = String(Math.round(state.vatRate * 100));
  }
  updateHelpers();
}

function renderResults() {
  const saleIncl = resolveSaleIncl();
  const buyIncl = resolveBuyIncl();
  if (!Number.isFinite(saleIncl) || !Number.isFinite(buyIncl)) {
    if (el.resultNetProfit) el.resultNetProfit.value = '';
    el.resultMargin.textContent = '-';
    el.resultRoi.textContent = '-';
    paintRoiBand(null);
    el.generalSale.textContent = '-';
    el.generalBuy.textContent = '-';
    el.generalCargo.textContent = '-';
    el.generalCommission.textContent = '-';
    el.generalService.textContent = '-';
    el.generalPayableVat.textContent = '-';
    el.generalNetAfterVat.textContent = '-';
    el.breakdownSaleVat.textContent = '-';
    el.breakdownBuyVat.textContent = '-';
    el.breakdownCargoVat.textContent = '-';
    el.breakdownCommissionVat.textContent = '-';
    el.breakdownServiceVat.textContent = '-';
    el.breakdownPayableVat.textContent = '-';
    return;
  }

  const cargoIncl = toVatIncluded(
    state.inputs.cargoCost,
    state.vatRate,
    state.inputs.cargoVatIncluded
  );
  const commissionRate = Number.isFinite(state.inputs.commissionRate)
    ? state.inputs.commissionRate
    : 0;
  const commissionRaw = saleIncl * (commissionRate / 100);
  const commissionIncl = toVatIncluded(
    commissionRaw,
    state.vatRate,
    state.inputs.commissionVatIncluded
  );

  const model = calcProfit({
    vatRate: state.vatRate,
    saleIncl,
    buyIncl,
    commissionPct: commissionRate,
    commissionIncl,
    shippingIncl: Number.isFinite(cargoIncl) ? cargoIncl : 0,
    sameDayShipping: state.sameDayShipping,
    stopajRate: 0.01,
    deductVatOnBuy: true,
    deductVatOnShipping: true,
    deductVatOnCommission: true,
    deductVatOnServiceFee: true,
  });

  if (el.resultNetProfit) {
    el.resultNetProfit.value = formatNumber2(model.netProfit);
  }
  el.resultMargin.textContent = formatPercent(model.marginPercent);
  el.resultRoi.textContent = formatPercent(model.roiPercent);
  paintRoiBand(model.roiPercent);
  el.generalSale.textContent = formatMoney2(model.saleIncl);
  el.generalBuy.textContent = formatMoney2(model.buyIncl);
  el.generalCargo.textContent = formatMoney2(model.shippingIncl);
  el.generalCommission.textContent = formatMoney2(model.commissionIncl);
  el.generalService.textContent = formatMoney2(model.serviceFeeInclVat);
  el.generalPayableVat.textContent = formatMoney2(model.payableVat);
  el.generalNetAfterVat.textContent = formatMoney2(model.netProfit);

  el.breakdownSaleVat.textContent = formatTl(model.saleVat);
  el.breakdownBuyVat.textContent = formatTl(model.buyVat);
  el.breakdownCargoVat.textContent = formatTl(model.cargoVat);
  el.breakdownCommissionVat.textContent = formatTl(model.commissionVat);
  el.breakdownServiceVat.textContent = formatTl(model.serviceVat);
  el.breakdownPayableVat.textContent = formatTl(model.payableVat);
}

function renderAll() {
  renderTable();
  renderInputs();
  renderResults();
}

function syncCommissionHeightFromCargo() {
  const cargo = document.querySelector('.tpMainGridItem--cargo');
  const commission = document.querySelector('.tpMainGridItem--commission');
  if (!cargo || !commission) return;

  const h = Math.round(cargo.getBoundingClientRect().height);
  if (h > 0) {
    commission.style.height = h + 'px';
  }
}

function syncRightBottomHeight() {
  syncCommissionHeightFromCargo();

  const left = document.querySelector('.tpMainGridItem--commission');
  const right = document.getElementById('rightBottomWrap');
  if (!left || !right) return;

  const h = Math.round(left.getBoundingClientRect().height);
  if (h > 0) {
    right.style.height = h + 'px';
  }
}

function initRightBottomSync() {
  const left = document.querySelector('.tpMainGridItem--commission');
  const cargo = document.querySelector('.tpMainGridItem--cargo');
  if (!left) return;

  syncCommissionHeightFromCargo();
  syncRightBottomHeight();

  if (commissionObserver) commissionObserver.disconnect();
  commissionObserver = new ResizeObserver(() => {
    syncRightBottomHeight();
  });
  commissionObserver.observe(left);

  if (cargo) {
    if (cargoObserver) cargoObserver.disconnect();
    cargoObserver = new ResizeObserver(() => {
      syncCommissionHeightFromCargo();
      syncRightBottomHeight();
    });
    cargoObserver.observe(cargo);
  }

  window.addEventListener('resize', syncRightBottomHeight);
}

async function scrapeNow() {
  if (scrapeInFlight) return scrapeInFlight;
  isScraping = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    isScraping = false;
    return null;
  }

  scrapeInFlight = new Promise((resolve) => {
    const statusMsg =
      'Sayfada eklenti aktif değil. Trendyol sekmesini yenileyin (F5) ve tekrar deneyin.';

    const finalize = (rows) => {
      isScraping = false;
      scrapeInFlight = null;
      resolve(rows || null);
    };

    const handleResp = (resp, hadError) => {
      if (hadError || !resp?.ok) {
        setRefreshStatus(statusMsg);
        setLoading(false);
        finalize(null);
        return;
      }

      const rows = resp?.data?.rows || [];
      const buyboxIndex = rows.findIndex((r) => r?.isBuybox === true || r?._source === 'buybox');
      state.sellers = rows.map((r, idx) => ({ ...r, isBuybox: idx === buyboxIndex }));
      state.selectedSellerIndex = buyboxIndex >= 0 ? buyboxIndex : 0;

      if (!state.inputs.salePriceTouched) {
        const selected = getSelectedSeller();
        if (Number.isFinite(selected?.price)) {
          state.inputs.salePrice = selected.price;
        }
      }

      cachedMeta = {
        productId: rows[0]?.productId ?? null,
        url: tab.url || null,
        mode: resp?.data?.mode || null,
        fetchedAt: Date.now(),
      };

      renderAll();
      finalize(rows);
    };

    const sendMessageOnce = () => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: 'SCRAPE_LISTING', payload: { cost: 0, limit: 10 } },
        (resp) => {
          const err = chrome.runtime.lastError;
          handleResp(resp, !!err);
        }
      );
    };

    chrome.tabs.sendMessage(
      tab.id,
      { type: 'SCRAPE_LISTING', payload: { cost: 0, limit: 10 } },
      (resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          setTimeout(() => sendMessageOnce(), 300);
          return;
        }
        handleResp(resp, false);
      }
    );
  });

  return scrapeInFlight;
}

function setLoading(isLoading) {
  const btn = el.btnRefreshSellers;
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = 'Yenileniyor...';
    if (el.refreshStatus) el.refreshStatus.textContent = 'Yenileniyor';
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = 'Satıcıları Yenile';
  }
}

function setRefreshStatus(text) {
  if (!el.refreshStatus) return;
  el.refreshStatus.textContent = text;
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (el.refreshStatus) el.refreshStatus.textContent = '';
  }, 6000);
}

function bindAccordion(toggleEl, bodyEl, chevronEl) {
  if (!toggleEl || !bodyEl) return;
  const sync = () => {
    const open = bodyEl.classList.contains('open');
    toggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (chevronEl) chevronEl.textContent = '▾';
  };
  sync();
  toggleEl.addEventListener('click', () => {
    bodyEl.classList.toggle('open');
    sync();
  });
}

async function refreshSellers() {
  try {
    setLoading(true);
    const rows = await scrapeNow();
    if (!rows) {
      setRefreshStatus('Yenileme hatası');
      return;
    }
    const now = new Date();
    const time = now.toLocaleTimeString('tr-TR');
    setRefreshStatus(`Güncellendi ${time}`);
  } catch (e) {
    setRefreshStatus(`Yenileme hatası: ${String(e?.message || e)}`);
  } finally {
    setLoading(false);
  }
}

function bindEvents() {
  if (el.panelCloseBtn) {
    el.panelCloseBtn.addEventListener('click', () => {
      closeDockPanel();
    });
  }

  const btn = document.getElementById('btnRefreshSellers');
  if (!btn) {
    console.warn('btnRefreshSellers not found');
  } else {
    btn.addEventListener('click', () => refreshSellers());
  }

  if (el.vatSelect) {
    el.vatSelect.addEventListener('change', (e) => {
      const vat = Number(e.target.value);
      if (!Number.isFinite(vat)) return;
      state.vatRate = vat / 100;
      updateHelpers();
      renderAll();
    });
  }

  el.inputSalePrice.addEventListener('input', (e) => {
    state.inputs.salePrice = parseTrNumber(e.target.value);
    state.inputs.salePriceTouched = true;
    renderAll();
  });

  el.inputBuyCost.addEventListener('input', (e) => {
    state.inputs.buyCost = parseTrNumber(e.target.value);
    renderAll();
  });

  el.chkBuyCostVatIncluded.addEventListener('change', (e) => {
    state.inputs.buyCostVatIncluded = e.target.checked;
    renderAll();
  });

  el.inputCargo.addEventListener('input', (e) => {
    state.inputs.cargoCost = parseTrNumber(e.target.value);
    renderAll();
  });

  el.chkCargoVatIncluded.addEventListener('change', (e) => {
    state.inputs.cargoVatIncluded = e.target.checked;
    renderAll();
  });
  if (el.sameDayShippingChk) {
    el.sameDayShippingChk.addEventListener('change', (e) => {
      setSameDayShipping(e.target.checked);
    });
  }

  el.inputCommission.addEventListener('input', (e) => {
    state.inputs.commissionRate = parseTrNumber(e.target.value);
    renderAll();
  });

  el.chkCommissionVatIncluded.addEventListener('change', (e) => {
    state.inputs.commissionVatIncluded = e.target.checked;
    renderAll();
  });

  bindAccordion(el.generalBreakdownToggle, el.generalBreakdownBody, el.generalChevron);
  bindAccordion(el.vatBreakdownToggle, el.vatBreakdownBody, el.vatChevron);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDockToggle();
  bindEvents();
  renderAll();
  setTimeout(initRightBottomSync, 0);
  scrapeNow();
});





