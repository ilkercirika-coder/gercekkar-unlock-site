// In-page dock panel (SellerAmp-style).
// Loads existing popup.html UI inside an iframe.

const TYEXT_PANEL_ID = 'tyext-right-panel';
const TYEXT_HANDLE_ID = 'tyext-right-panel-handle';
const TYEXT_STYLE_ID = 'tyext-right-panel-style';
const TYEXT_DOCK_ATTR = 'data-tyext-docked';
const TYEXT_DOCK_PAD_VAR = '--tyext-dock-pad';
const TYEXT_DOCK_SIDE_KEY = 'tp_panel_side';
const TYEXT_HANDLE_LOGO = 'assets/Logo_GK.png';
const PANEL_WIDTH_PX = 420;
const PANEL_BORDER = '1px solid rgba(15,23,42,0.12)';
const HANDLE_BORDER = '1px solid rgba(15,23,42,0.18)';

let currentDockSide = 'right';
let panelHostEl = null;
let panelHandleEl = null;

function hidePanel() {
  if (!panelHostEl || !panelHandleEl) return;
  panelHostEl.style.display = 'none';
  panelHandleEl.style.display = 'flex';
  dockPage(false);
}

function showPanel() {
  if (!panelHostEl || !panelHandleEl) return;
  panelHandleEl.style.display = 'none';
  panelHostEl.style.display = 'flex';
  dockPage(true);
}

function isTrendyolHost() {
  try {
    return /(^|\.)trendyol\.com$/i.test(location.hostname);
  } catch {
    return false;
  }
}

function normalizeDockSide(side) {
  return side === 'left' ? 'left' : 'right';
}

function readDockSideSetting() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(TYEXT_DOCK_SIDE_KEY, (res) => {
        resolve(normalizeDockSide(res?.[TYEXT_DOCK_SIDE_KEY]));
      });
    } catch {
      resolve('right');
    }
  });
}

function dockPage(on) {
  try {
    const root = document.documentElement;
    if (!root) return;

    if (on) {
      // Prevent double-apply; always set exact value.
      root.setAttribute(TYEXT_DOCK_ATTR, '1');
      root.style.setProperty(TYEXT_DOCK_PAD_VAR, `${PANEL_WIDTH_PX}px`);
      if (currentDockSide === 'left') {
        root.style.paddingLeft = `var(${TYEXT_DOCK_PAD_VAR})`;
        root.style.paddingRight = '';
      } else {
        root.style.paddingRight = `var(${TYEXT_DOCK_PAD_VAR})`;
        root.style.paddingLeft = '';
      }
      // Avoid horizontal scroll when the site has fixed rails
      root.style.overflowX = 'hidden';
    } else {
      root.removeAttribute(TYEXT_DOCK_ATTR);
      root.style.removeProperty(TYEXT_DOCK_PAD_VAR);
      root.style.paddingRight = '';
      root.style.paddingLeft = '';
      root.style.overflowX = '';
    }
  } catch {}
}

function applyDockSide(side) {
  currentDockSide = normalizeDockSide(side);

  if (panelHostEl) {
    panelHostEl.style.left = currentDockSide === 'left' ? '0' : 'auto';
    panelHostEl.style.right = currentDockSide === 'right' ? '0' : 'auto';
    panelHostEl.style.borderLeft = currentDockSide === 'right' ? PANEL_BORDER : '0';
    panelHostEl.style.borderRight = currentDockSide === 'left' ? PANEL_BORDER : '0';
  }

  if (panelHandleEl) {
    panelHandleEl.style.left = currentDockSide === 'left' ? '0' : 'auto';
    panelHandleEl.style.right = currentDockSide === 'right' ? '0' : 'auto';
    panelHandleEl.style.borderLeft = currentDockSide === 'left' ? '0' : HANDLE_BORDER;
    panelHandleEl.style.borderRight = currentDockSide === 'right' ? '0' : HANDLE_BORDER;
    panelHandleEl.style.borderRadius =
      currentDockSide === 'left' ? '0 12px 12px 0' : '12px 0 0 12px';
  }

  const panelVisible = !!panelHostEl && panelHostEl.style.display !== 'none';
  dockPage(panelVisible);
}

function ensurePanelStyles() {
  if (document.getElementById(TYEXT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TYEXT_STYLE_ID;
  style.textContent = `
    #${TYEXT_PANEL_ID} {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: ${PANEL_WIDTH_PX}px;
      z-index: 2147483647;
      background: rgba(15,23,42,0.06);
      backdrop-filter: blur(2px);
      display: flex;
      flex-direction: column;
      border-left: ${PANEL_BORDER};
    }
#${TYEXT_PANEL_ID} iframe {
      border: 0;
      width: 100%;
      height: 100vh;
      background: transparent;
    }

    /* Mini reopen handle */
    #${TYEXT_HANDLE_ID} {
      position: fixed;
      top: 120px;
      right: 0;
      z-index: 2147483647;
      display: none;
      width: 58px;
      height: 72px;
      border-radius: 12px 0 0 12px;
      border: ${HANDLE_BORDER};
      border-right: 0;
      background: rgba(255,255,255,0.92);
      box-shadow: 0 10px 30px rgba(0,0,0,0.18);
      cursor: pointer;
      padding: 5px 6px;
      text-align: center;
      user-select: none;
      align-items: center;
      justify-content: center;
    }
    #${TYEXT_HANDLE_ID}:hover { filter: brightness(0.98); }
    #${TYEXT_HANDLE_ID} img {
      width: 42px;
      height: 42px;
      object-fit: contain;
      pointer-events: none;
    }
  `;
  document.documentElement.appendChild(style);
}

function mountRightPanel() {
  if (!isTrendyolHost()) return;
  ensurePanelStyles();
  if (document.getElementById(TYEXT_PANEL_ID)) return;

  dockPage(true);

  const host = document.createElement('div');
  host.id = TYEXT_PANEL_ID;
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('popup.html?mode=panel');
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  host.appendChild(iframe);

  let handle = document.getElementById(TYEXT_HANDLE_ID);
  if (!handle) {
    handle = document.createElement('div');
    handle.id = TYEXT_HANDLE_ID;
    document.documentElement.appendChild(handle);
  }
  handle.textContent = '';
  handle.innerHTML = '';
  const handleLogo = document.createElement('img');
  handleLogo.src = chrome.runtime.getURL(TYEXT_HANDLE_LOGO);
  handleLogo.alt = 'GercekKar.com';
  handle.appendChild(handleLogo);
  handle.addEventListener('click', showPanel);

  document.documentElement.appendChild(host);
  panelHostEl = host;
  panelHandleEl = handle;
  applyDockSide(currentDockSide);
}

function ensureMounted() {
  if (!document.getElementById(TYEXT_PANEL_ID)) {
    dockPage(false);
    mountRightPanel();
  }
}

function watchUrlChanges() {
  let last = location.href;
  const tick = () => {
    if (location.href !== last) {
      last = location.href;
      setTimeout(() => ensureMounted(), 50);
    }
  };
  setInterval(tick, 500);
}

(() => {
  if (!isTrendyolHost()) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      readDockSideSetting().then((side) => {
        currentDockSide = side;
        mountRightPanel();
        watchUrlChanges();
      });
    });
  } else {
    readDockSideSetting().then((side) => {
      currentDockSide = side;
      mountRightPanel();
      watchUrlChanges();
    });
  }
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SET_PANEL_SIDE') {
    const nextSide = normalizeDockSide(msg?.payload?.side);
    applyDockSide(nextSide);
    sendResponse({ ok: true, side: nextSide });
    return;
  }
  if (msg?.type === 'CLOSE_PANEL') {
    hidePanel();
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type !== 'SCRAPE_LISTING') return;

  let responded = false;
  const safeReply = (payload) => {
    if (responded) return;
    responded = true;
    try {
      sendResponse(payload);
    } catch {}
  };

  const timer = setTimeout(() => {
    safeReply({ ok: false, error: 'Timeout' });
  }, 12000);

  (async () => {
    try {
      const { cost = 0, limit = 10 } = msg.payload || {};
      const isProductDetail = /-p-\d+/.test(location.href);

      __PAGE_SOURCE_CACHE = null;
      const { embeddedRowsMap, qtyMap, buyboxId, orderMap, collectableMap } =
        await buildEmbeddedSellerMaps();

      // ================= PRODUCT DETAIL =================
      if (isProductDetail) {
        const productId = getProductIdFromUrl(location.href);
        if (!productId) {
          safeReply({ ok: false, error: 'productId parse edilemedi' });
          return;
        }

        const apiJson = await fetchProductDetailJson(productId);
        const sellers = extractSellersFromApi(apiJson);
        const merged = mergeApiWithEmbedded(
          sellers,
          embeddedRowsMap,
          qtyMap,
          buyboxId,
          location.href,
          orderMap,
          collectableMap
        );

        const rows = merged.map((s) => {
          const { coupon2: _coupon2, ...rest } = s || {};
          return {
            productId,
            productUrl: location.href,
            ...rest,
            profit: Number(s?.price ?? 0) - Number(cost || 0),
          };
        });

        safeReply({
          ok: true,
          data: { mode: 'productDetail', rowsCount: rows.length, rows },
        });
        return;
      }

      // ================= LISTING =================
      const urls = collectProductUrls(limit);
      if (!urls.length) {
        safeReply({ ok: false, error: 'Listing Ã¼rÃ¼nÃ¼ bulunamadÄ±' });
        return;
      }

      const rows = [];

      for (const url of urls) {
        const productId = getProductIdFromUrl(url);
        if (!productId) continue;

        const apiJson = await fetchProductDetailJson(productId);
        const sellers = extractSellersFromApi(apiJson);
        const merged = mergeApiWithEmbedded(
          sellers,
          embeddedRowsMap,
          qtyMap,
          buyboxId,
          url,
          orderMap,
          collectableMap
        );
        for (const s of merged) {
          const { coupon2: _coupon2, ...rest } = s || {};
          rows.push({
            productId,
            productUrl: url,
            ...rest,
            profit: Number(s?.price ?? 0) - Number(cost || 0),
          });
        }
      }

      safeReply({
        ok: true,
        data: { mode: 'listing', rowsCount: rows.length, rows },
      });
    } catch (e) {
      safeReply({ ok: false, error: String(e?.message || e) });
    } finally {
      clearTimeout(timer);
    }
  })();

  return true;
});

// ================= HELPERS =================

function getProductIdFromUrl(url) {
  const m = String(url).match(/-p-(\d+)/);
  return m ? Number(m[1]) : null;
}

function collectProductUrls(limit) {
  const set = new Set();
  document.querySelectorAll("a[href*='-p-']").forEach((a) => {
    if (set.size >= limit) return;
    const href = a.getAttribute('href');
    if (!href) return;
    const abs = href.startsWith('http') ? href : new URL(href, location.origin).toString();
    if (abs.includes('trendyol.com')) set.add(abs);
  });
  return [...set];
}

// ================= EMBEDDED HTML SELLERS (TEK DOGRU KAYNAK) =================

let __PAGE_SOURCE_CACHE = null;

async function buildEmbeddedSellerMaps() {
  if (__PAGE_SOURCE_CACHE) return __PAGE_SOURCE_CACHE;

  const html = await fetch(location.href, {
    credentials: 'include',
    cache: 'no-store',
  })
    .then((r) => r.text())
    .catch(() => document?.documentElement?.innerHTML || '');
  const embeddedRowsMap = new Map();
  const qtyMap = new Map();
  const orderMap = new Map();
  const buyboxIdFromUrl = getBuyboxMerchantIdFromUrl(location.href);
  const buyboxIdFromHtml = extractBuyboxMerchantIdFromHtml(html);
  const buyboxId =
    Number.isFinite(buyboxIdFromUrl) ? buyboxIdFromUrl : Number(buyboxIdFromHtml ?? NaN);

  const collectableCouponRe = /"collectableCouponDiscount"\s*:\s*(\d+(?:\.\d+)?)/;
  const collectableMap = buildCollectableCouponMap(html);
  const merchantQtyMap = buildMerchantQuantityMap(html, buyboxId);
  const domCollectable = await readCollectableCouponFromDomWithRetry();
  const nameRe = /"name"\s*:\s*"([^"]+)"/;
  const scoreRe = /"sellerScore"\s*:\s*\{[^}]*?"value"\s*:\s*([0-9]+(?:\.[0-9]+)?)/;
  const discountedPriceRe = /"discountedPrice"\s*:\s*\{[^}]*?"value"\s*:\s*([0-9]+(?:\.[0-9]+)?)/g;
  const sellingPriceRe = /"sellingPrice"\s*:\s*\{[^}]*?"value"\s*:\s*([0-9]+(?:\.[0-9]+)?)/g;
  const urlRe = /"url"\s*:\s*"([^"]+)"/;

  const arrayKeys = ['otherMerchants', 'sellers', 'merchants', 'merchantListings'];
  const sellerBlocks = [];

  for (const key of arrayKeys) {
    const blocks = extractObjectBlocksFromArray(html, key);
    if (blocks.length) sellerBlocks.push(...blocks);
  }

  const merchantListingBlock = extractObjectBlockByKey(html, 'merchantListing');
  if (merchantListingBlock) {
    const merchantBlock = extractObjectBlockByKey(merchantListingBlock, 'merchant');
    const buyboxRow = extractBuyboxFromMerchantListing(
      merchantListingBlock,
      merchantBlock,
      merchantQtyMap,
      nameRe,
      scoreRe,
      discountedPriceRe,
      sellingPriceRe,
      urlRe,
      collectableCouponRe
    );
    if (buyboxRow) {
      const merchantId = buyboxRow.merchantId;
      if (buyboxRow.coupon2 == null && collectableMap.has(merchantId)) {
        buyboxRow.coupon2 = collectableMap.get(merchantId);
      }
      if (buyboxRow.coupon2 == null && Number.isFinite(domCollectable)) {
        buyboxRow.coupon2 = domCollectable;
      }
      if (buyboxRow.quantity != null) {
        const prevQty = qtyMap.get(merchantId);
        qtyMap.set(
          merchantId,
          prevQty == null ? buyboxRow.quantity : Math.max(prevQty, buyboxRow.quantity)
        );
      }
      const existing = embeddedRowsMap.get(merchantId);
      if (
        !existing ||
        (Number.isFinite(buyboxRow.price) && buyboxRow.price < (existing.price ?? Infinity))
      ) {
        embeddedRowsMap.set(merchantId, buyboxRow);
      }
      if (!orderMap.has(merchantId)) {
        orderMap.set(merchantId, -1);
      }
    }
  }

  for (let idx = 0; idx < sellerBlocks.length; idx++) {
    const block = sellerBlocks[idx];
    if (
      !block.includes('"variants"') ||
      !block.includes('"price"') ||
      !block.includes('"sellerScore"')
    ) {
      continue;
    }

    const idMatch = block.match(/"id"\s*:\s*(\d{1,12})/);
    const merchantId = idMatch ? Number(idMatch[1]) : null;
    if (!Number.isFinite(merchantId)) continue;

    const nameMatch = block.match(nameRe);
    const scoreMatch = block.match(scoreRe);
    const prices = getPricesFromBlock(block, discountedPriceRe, sellingPriceRe);
    const price = prices.discountedPrice ?? prices.sellingPrice ?? null;
    const urlMatch = block.match(urlRe);
    const couponMatch = block.match(collectableCouponRe);
    const collectableCoupon = couponMatch ? Number(couponMatch[1]) : null;
    const collectableFromMap = collectableMap.get(merchantId);

    const merchantName = nameMatch ? nameMatch[1] : null;
    const merchantScore = normalizeScoreValue(scoreMatch ? Number(scoreMatch[1]) : null);
    const quantity = merchantQtyMap.get(merchantId) ?? null;
    const url = urlMatch ? urlMatch[1] : null;
    if (url && url.includes('merchantId=')) {
      const urlId = Number((url.match(/merchantId=(\d{1,12})/) || [])[1]);
      if (Number.isFinite(urlId) && urlId !== merchantId) continue;
    }

    if (quantity != null) {
      const prevQty = qtyMap.get(merchantId);
      qtyMap.set(merchantId, prevQty == null ? quantity : Math.max(prevQty, quantity));
    }

    let coupon = null;
    if (Number.isFinite(prices.sellingPrice) && Number.isFinite(prices.discountedPrice)) {
      const diff = prices.sellingPrice - prices.discountedPrice;
      if (diff > 0.009) coupon = +diff.toFixed(2);
    }
    if (coupon == null && Number.isFinite(collectableCoupon) && collectableCoupon > 0) {
      coupon = +collectableCoupon.toFixed(2);
    }
    if (coupon == null && Number.isFinite(collectableFromMap) && collectableFromMap > 0) {
      coupon = +collectableFromMap.toFixed(2);
    }

    if (merchantName && Number.isFinite(price)) {
      const existing = embeddedRowsMap.get(merchantId);
      const next = {
        merchantId,
        merchantName,
        merchantScore,
        price,
        coupon,
        coupon2: Number.isFinite(collectableCoupon)
          ? +collectableCoupon.toFixed(2)
          : Number.isFinite(collectableFromMap)
            ? +collectableFromMap.toFixed(2)
            : null,
        quantity,
        url,
      };
      if (!existing) {
        embeddedRowsMap.set(merchantId, next);
      } else {
        const replaceByPrice =
          Number.isFinite(next.price) &&
          Number.isFinite(existing.price) &&
          next.price < existing.price;
        const replaceByCoupon2 = existing.coupon2 == null && next.coupon2 != null;
        if (replaceByPrice || replaceByCoupon2) {
          embeddedRowsMap.set(merchantId, { ...existing, ...next });
        }
      }
      if (!orderMap.has(merchantId)) {
        orderMap.set(merchantId, idx);
      }
    }
  }

  __PAGE_SOURCE_CACHE = { embeddedRowsMap, qtyMap, buyboxId, orderMap, collectableMap };
  return __PAGE_SOURCE_CACHE;
}

function mergeApiWithEmbedded(
  apiRows,
  embeddedRowsMap,
  qtyMap,
  buyboxId,
  pageUrl,
  orderMap,
  collectableMap
) {
  const out = new Map();

  for (const r of apiRows || []) {
    const merchantId = Number(r.merchantId);
    const embedded = embeddedRowsMap.get(merchantId);
    const quantity = embedded?.quantity ?? qtyMap.get(merchantId) ?? null;
    const coupon = embedded?.coupon ?? null;
    const coupon2 = embedded?.coupon2 ?? collectableMap?.get(merchantId) ?? null;
    const merged = {
      ...r,
      quantity,
      coupon,
      coupon2,
      isBuybox: isBuyboxSeller(merchantId, buyboxId, embedded?.url, pageUrl),
    };
    const existing = out.get(merchantId);
    if (!existing) {
      out.set(merchantId, merged);
    } else {
      const prevPrice = Number(existing.price ?? Infinity);
      const nextPrice = Number(merged.price ?? Infinity);
      if (nextPrice < prevPrice) {
        out.set(merchantId, merged);
      }
    }
  }

  for (const [merchantId, emb] of embeddedRowsMap.entries()) {
    if (out.has(merchantId)) continue;
    const row = {
      merchantId: emb.merchantId,
      merchantName: emb.merchantName,
      merchantScore: emb.merchantScore,
      price: emb.price,
      coupon: emb.coupon ?? null,
      coupon2: emb.coupon2 ?? null,
      quantity: emb.quantity ?? qtyMap.get(merchantId) ?? null,
      isBuybox: isBuyboxSeller(merchantId, buyboxId, emb.url, pageUrl),
    };
    out.set(merchantId, row);
  }

  const rows = [...out.values()];
  rows.sort((a, b) => {
    if (a.isBuybox && !b.isBuybox) return -1;
    if (!a.isBuybox && b.isBuybox) return 1;
    const ao = orderMap?.get(Number(a.merchantId));
    const bo = orderMap?.get(Number(b.merchantId));
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
    const ap = Number(a.price ?? Infinity);
    const bp = Number(b.price ?? Infinity);
    if (ap !== bp) return ap - bp;
    return 0;
  });

  return rows;
}

function getBuyboxMerchantIdFromUrl(url) {
  try {
    const u = new URL(url, location.origin);
    const v = u.searchParams.get('merchantId');
    const id = v ? Number(v) : null;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function extractBuyboxMerchantIdFromHtml(html) {
  if (!html) return null;

  const objectAnchors = ['buyboxMerchant', 'merchantListing', 'merchantInfo', 'merchant'];
  for (const key of objectAnchors) {
    const block = extractObjectBlockByKey(html, key);
    if (!block) continue;

    const parsed = safeJsonParse(block);
    if (parsed && typeof parsed === 'object') {
      const directId = Number(parsed?.merchantId ?? parsed?.id);
      if (Number.isFinite(directId)) return directId;

      const nestedMerchantId = Number(parsed?.merchant?.merchantId ?? parsed?.merchant?.id);
      if (Number.isFinite(nestedMerchantId)) return nestedMerchantId;
    }

    const idMatch = block.match(/"(?:merchantId|id)"\s*:\s*(\d{1,12})/);
    const id = idMatch ? Number(idMatch[1]) : null;
    if (Number.isFinite(id)) return id;
  }

  return null;
}

function isBuyboxSeller(merchantId, buyboxId, embeddedUrl, pageUrl) {
  if (Number.isFinite(buyboxId) && merchantId === buyboxId) return true;
  const target = String(buyboxId ?? '');
  if (!target) return false;
  if (embeddedUrl && embeddedUrl.includes(`merchantId=${target}`)) return true;
  if (pageUrl && String(pageUrl).includes(`merchantId=${target}`)) return true;
  return false;
}

function buildCollectableCouponMap(html) {
  const map = new Map();
  const re =
    /"merchantId"\s*:\s*(\d{1,12})[\s\S]{0,5000}?"collectableCouponDiscount"\s*:\s*(\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(html))) {
    const merchantId = Number(m[1]);
    const value = Number(m[2]);
    if (!Number.isFinite(merchantId) || !Number.isFinite(value)) continue;
    const prev = map.get(merchantId);
    map.set(merchantId, prev == null ? value : Math.max(prev, value));
  }
  return map;
}

function buildMerchantQuantityMap(html, buyboxId) {
  const map = new Map();
  // Generic quantity scans leak variant/global stock across sellers; parse seller-scoped merchants JSON only.
  const otherMerchantsText = extractArrayBlockByKey(html, 'otherMerchants');
  const otherMerchants = safeJsonParse(otherMerchantsText);
  if (Array.isArray(otherMerchants)) {
    for (const merchant of otherMerchants) {
      const merchantId = Number(merchant?.id);
      if (!Number.isFinite(merchantId)) continue;
      const qty = pickQuantityFromVariants(merchant?.variants);
      if (!Number.isFinite(qty)) continue;
      const prev = map.get(merchantId);
      map.set(merchantId, prev == null ? qty : Math.max(prev, qty));
    }
  }

  // Prefer winnerVariant.quantity for buybox when present.
  if (Number.isFinite(buyboxId)) {
    const winnerQty = extractWinnerVariantQuantity(html);
    if (Number.isFinite(winnerQty)) {
      map.set(buyboxId, winnerQty);
    } else if (!map.has(buyboxId)) {
      // Buybox merchant can be outside otherMerchants; extract only from buybox-adjacent seller block.
      const buyboxQty = extractBuyboxQuantityFromHtml(html, buyboxId);
      if (Number.isFinite(buyboxQty)) {
        map.set(buyboxId, buyboxQty);
      }
    }
  }

  return map;
}

function pickQuantityFromVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return null;

  let maxQty = null;
  for (const v of variants) {
    const runningOut = v?.isRunningOut === true ? Number(v?.runningOutQuantity) : null;
    const qty = Number(v?.quantity);
    const candidate = Number.isFinite(runningOut) && runningOut > 0 ? runningOut : qty;
    if (!Number.isFinite(candidate)) continue;
    maxQty = maxQty == null ? candidate : Math.max(maxQty, candidate);
  }
  return maxQty;
}

function extractArrayBlockByKey(html, key) {
  if (!html) return null;
  const needle = `"${key}":[`;
  const idx = html.indexOf(needle);
  if (idx === -1) return null;

  const start = html.indexOf('[', idx + needle.length - 1);
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === '\\') {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }

    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractWinnerVariantQuantity(html) {
  const winnerVariantText = extractObjectBlockByKey(html, 'winnerVariant');
  const winnerVariant = safeJsonParse(winnerVariantText);
  const qty = Number(winnerVariant?.quantity);
  return Number.isFinite(qty) ? qty : null;
}

function extractBuyboxQuantityFromHtml(html, buyboxId) {
  if (!html || !Number.isFinite(buyboxId)) return null;

  const idPattern = String(Math.trunc(buyboxId));
  const anchors = [
    new RegExp(`"buyboxMerchant"\\s*:\\s*\\{[\\s\\S]{0,1200}?"(?:id|merchantId)"\\s*:\\s*${idPattern}\\b`, 'g'),
    new RegExp(`"merchantInfo"\\s*:\\s*\\{[\\s\\S]{0,1200}?"(?:id|merchantId)"\\s*:\\s*${idPattern}\\b`, 'g'),
    new RegExp(`"merchant"\\s*:\\s*\\{[\\s\\S]{0,1200}?"(?:id|merchantId)"\\s*:\\s*${idPattern}\\b`, 'g'),
    new RegExp(`"(?:id|merchantId)"\\s*:\\s*${idPattern}\\b`, 'g'),
  ];

  for (const re of anchors) {
    let m;
    while ((m = re.exec(html))) {
      const start = m.index + m[0].length;
      const windowText = html.slice(start, start + 5000);
      const variantsIdx = windowText.indexOf('"variants":[');
      if (variantsIdx === -1) continue;

      const arrayStart = start + variantsIdx + '"variants":'.length;
      const variantsText = extractArrayBlockFromIndex(html, arrayStart);
      if (!variantsText) continue;

      const variants = safeJsonParse(variantsText);
      if (Array.isArray(variants)) {
        const q = pickQuantityFromVariants(variants);
        if (Number.isFinite(q)) return q;
      }

      const qMatch = variantsText.match(/"quantity"\s*:\s*(\d{1,9})/);
      const q = qMatch ? Number(qMatch[1]) : null;
      if (Number.isFinite(q)) return q;
    }
  }

  return null;
}

function extractArrayBlockFromIndex(text, startIndex) {
  if (!text || !Number.isFinite(startIndex) || startIndex < 0 || startIndex >= text.length) {
    return null;
  }
  if (text[startIndex] !== '[') return null;

  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === '\\') {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return null;
}

function readCollectableCouponFromDom() {
  try {
    const el = document.querySelector(
      ".coupons [data-testid='coupon-container'] .coupon-discount span"
    );
    if (!el) return null;
    const text = el.textContent || '';
    const m = text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const normalized = String(m[1]).replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function readCollectableCouponFromDomWithRetry() {
  for (let i = 0; i < 5; i++) {
    const v = readCollectableCouponFromDom();
    if (v != null) return v;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

function extractBuyboxFromMerchantListing(
  block,
  merchantBlock,
  merchantQtyMap,
  nameRe,
  scoreRe,
  discountedPriceRe,
  sellingPriceRe,
  urlRe,
  collectableCouponRe
) {
  if (!merchantBlock) return null;

  const idMatch = merchantBlock.match(/"id"\s*:\s*(\d{1,12})/);
  const merchantId = idMatch ? Number(idMatch[1]) : null;
  if (!Number.isFinite(merchantId)) return null;

  const nameMatch = merchantBlock.match(nameRe);
  const scoreMatch = merchantBlock.match(scoreRe);
  const prices = getPricesFromBlock(block, discountedPriceRe, sellingPriceRe);
  const price = prices.discountedPrice ?? prices.sellingPrice ?? null;
  const couponMatch = block.match(collectableCouponRe);
  const collectableCoupon = couponMatch ? Number(couponMatch[1]) : null;
  const urlMatch = block.match(urlRe);

  const merchantName = nameMatch ? nameMatch[1] : null;
  const merchantScore = normalizeScoreValue(scoreMatch ? Number(scoreMatch[1]) : null);
  const quantity = merchantQtyMap.get(merchantId) ?? null;
  const url = urlMatch ? urlMatch[1] : null;

  if (!merchantName) return null;

  let coupon = null;
  if (Number.isFinite(prices.sellingPrice) && Number.isFinite(prices.discountedPrice)) {
    const diff = prices.sellingPrice - prices.discountedPrice;
    if (diff > 0.009) coupon = +diff.toFixed(2);
  }
  if (coupon == null && Number.isFinite(collectableCoupon) && collectableCoupon > 0) {
    coupon = +collectableCoupon.toFixed(2);
  }

  return {
    merchantId,
    merchantName,
    merchantScore,
    price,
    coupon,
    coupon2: Number.isFinite(collectableCoupon) ? +collectableCoupon.toFixed(2) : null,
    quantity,
    url,
  };
}

function getPricesFromBlock(block, discountedPriceRe, sellingPriceRe) {
  let lastDiscounted = null;
  let lastSelling = null;

  discountedPriceRe.lastIndex = 0;
  let dm;
  while ((dm = discountedPriceRe.exec(block))) {
    const v = Number(dm[1]);
    if (Number.isFinite(v)) lastDiscounted = v;
  }

  sellingPriceRe.lastIndex = 0;
  let sm;
  while ((sm = sellingPriceRe.exec(block))) {
    const v = Number(sm[1]);
    if (Number.isFinite(v)) lastSelling = v;
  }

  return { discountedPrice: lastDiscounted, sellingPrice: lastSelling };
}

function extractObjectBlocksFromArray(html, key) {
  const blocks = [];
  const needle = `"${key}":[`;
  let idx = 0;
  while ((idx = html.indexOf(needle, idx)) !== -1) {
    const arrayStart = html.indexOf('[', idx + needle.length - 1);
    if (arrayStart === -1) break;

    let i = arrayStart;
    let depth = 0;
    let inStr = false;
    let esc = false;
    let arrayEnd = -1;

    for (; i < html.length; i++) {
      const ch = html[i];
      if (inStr) {
        if (esc) {
          esc = false;
        } else if (ch === '\\') {
          esc = true;
        } else if (ch === '"') {
          inStr = false;
        }
        continue;
      }
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === '[') depth++;
      if (ch === ']') {
        depth--;
        if (depth === 0) {
          arrayEnd = i;
          break;
        }
      }
    }

    if (arrayEnd === -1) break;
    const arrayText = html.slice(arrayStart + 1, arrayEnd);

    let objStart = -1;
    depth = 0;
    inStr = false;
    esc = false;
    for (let j = 0; j < arrayText.length; j++) {
      const ch = arrayText[j];
      if (inStr) {
        if (esc) {
          esc = false;
        } else if (ch === '\\') {
          esc = true;
        } else if (ch === '"') {
          inStr = false;
        }
        continue;
      }
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === '{') {
        if (depth === 0) objStart = j;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && objStart !== -1) {
          blocks.push(arrayText.slice(objStart, j + 1));
          objStart = -1;
        }
      }
    }

    idx = arrayEnd + 1;
  }
  return blocks;
}

function extractObjectBlockByKey(html, key) {
  const needle = `"${key}":{`;
  const idx = html.indexOf(needle);
  if (idx === -1) return null;

  const start = html.indexOf('{', idx + needle.length - 1);
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === '\\') {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return html.slice(start, i + 1);
      }
    }
  }

  return null;
}

// ================= SELLER FETCH =================

async function fetchProductDetailJson(productId) {
  const urls = [
    `https://apigw.trendyol.com/discovery-web-productgw-service/api/productDetail/${productId}`,
    `https://apigw.trendyol.com/discovery-web-productgw-service/api/productDetail?contentId=${productId}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      const json = await res.json();
      if (json) return json;
    } catch {}
  }
  return null;
}

function extractSellersFromApi(apiJson) {
  const out = [];

  const buyboxMerchant = apiJson?.result?.merchant ?? null;
  const buyboxPrice = apiJson?.result?.price ?? null;
  if (buyboxMerchant?.id && buyboxMerchant?.name && buyboxPrice) {
    const merchantId = Number(buyboxMerchant.id);
    const merchantName = String(buyboxMerchant.name);
    const merchantScore = normalizeScoreValue(buyboxMerchant.sellerScore);
    const price = buyboxPrice?.discountedPrice?.value ?? buyboxPrice?.sellingPrice?.value ?? null;

    let coupon = null;
    const s = buyboxPrice?.sellingPrice?.value;
    const d = buyboxPrice?.discountedPrice?.value;
    if (Number.isFinite(s) && Number.isFinite(d) && s > d) {
      coupon = +(s - d).toFixed(2);
    }

    if (Number.isFinite(merchantId) && Number.isFinite(price)) {
      out.push({
        merchantId,
        merchantName,
        merchantScore,
        price,
        coupon,
        quantity: null,
      });
    }
  }

  const otherMerchants = apiJson?.result?.otherMerchants;
  if (!Array.isArray(otherMerchants)) return out;
  const existingIds = new Set(out.map((r) => r.merchantId));

  for (const it of otherMerchants) {
    if (!it?.merchant?.id || !it?.merchant?.name || !it?.price) continue;

    const merchantId = Number(it.merchant.id);
    if (existingIds.has(merchantId)) continue;
    const merchantName = String(it.merchant.name);
    const merchantScore = normalizeScoreValue(it.merchant.sellerScore);

    const price = it?.price?.discountedPrice?.value ?? it?.price?.sellingPrice?.value ?? null;

    let coupon = null;
    const s = it?.price?.sellingPrice?.value;
    const d = it?.price?.discountedPrice?.value;
    if (Number.isFinite(s) && Number.isFinite(d) && s > d) {
      coupon = +(s - d).toFixed(2);
    }

    out.push({
      merchantId,
      merchantName,
      merchantScore,
      price,
      coupon,
      quantity: null,
    });
  }

  return out;
}

function normalizeScoreValue(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    return value <= 5 ? +(value * 2).toFixed(1) : value;
  }

  if (typeof value === 'object') {
    const raw = value?.value ?? value?.averageRating ?? value?.rating ?? null;
    if (typeof raw === 'number') {
      return raw <= 5 ? +(raw * 2).toFixed(1) : raw;
    }
  }

  return null;
}


