let currentPage = 0;
let toastTimer = null;
let deckConfig = null;

async function sendAction(actionObj) {
    try {
        const res = await fetch('/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actionObj)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
    } catch (e) {
        showToast(`⚠ ${e.message}`);
    }
}

function showToast(msg, dur = 2000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

function adjustWidgetHeights() {
    document.querySelectorAll('.page-content').forEach(content => {
        const btn = content.querySelector('.btn');
        const widgets = content.querySelectorAll('.vol-card');
        if (btn && widgets.length > 0) {
            const btnHeight = btn.getBoundingClientRect().height;
            if (btnHeight > 0) {
                const twoBoxHeight = Math.round(2 * btnHeight + 12);
                widgets.forEach(w => {
                    w.style.height = `${twoBoxHeight}px`;
                });
            }
        }
    });
}

window.addEventListener('resize', adjustWidgetHeights);

function createSliderWidget(idPrefix, title, icon, colorClass, actionType) {
    const card = document.createElement('div');
    card.className = 'vol-card';
    card.title = title;
    card.innerHTML = `
        <div class="vol-header">
            <div class="vol-title"><img src="${icon}" alt="${title}"></div>
            <div class="vol-value ${colorClass}" id="${idPrefix}Val">50%</div>
        </div>
        <div class="vol-track" id="${idPrefix}Track" role="slider" aria-label="${title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <div class="vol-fill ${colorClass}" id="${idPrefix}Fill" style="height:50%"></div>
            <div class="vol-thumb ${colorClass}" id="${idPrefix}Thumb" style="bottom:calc(50% - 9px)"></div>
        </div>
    `;

    let currentVal = 50;
    let debounceTimer = null;

    function updateUI(pct) {
        currentVal = Math.max(0, Math.min(100, Math.round(pct)));
        const fill = card.querySelector(`#${idPrefix}Fill`);
        const thumb = card.querySelector(`#${idPrefix}Thumb`);
        const val = card.querySelector(`#${idPrefix}Val`);
        const track = card.querySelector(`#${idPrefix}Track`);

        if (fill) fill.style.height = `${currentVal}%`;
        if (thumb) thumb.style.bottom = `calc(${currentVal}% - 9px)`;
        if (val) val.textContent = `${currentVal}%`;
        if (track) track.setAttribute('aria-valuenow', currentVal);
    }

    function dispatchAction(immediate = false) {
        clearTimeout(debounceTimer);
        if (immediate) {
            sendAction({ type: actionType, value: currentVal });
        } else {
            debounceTimer = setTimeout(() => {
                sendAction({ type: actionType, value: currentVal });
            }, 80);
        }
    }

    function calculateValueFromEvent(e) {
        const track = card.querySelector(`#${idPrefix}Track`);
        if (!track) return 50;
        const rect = track.getBoundingClientRect();
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        const offsetY = rect.bottom - clientY;
        const rawPct = (offsetY / rect.height) * 100;
        return Math.max(0, Math.min(100, rawPct));
    }

    let isDragging = false;

    function handleStart(e) {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        const pct = calculateValueFromEvent(e);
        updateUI(pct);
        dispatchAction(false);
    }

    function handleMove(e) {
        if (!isDragging) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        const pct = calculateValueFromEvent(e);
        updateUI(pct);
        dispatchAction(false);
    }

    function handleEnd(e) {
        if (!isDragging) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        isDragging = false;
        dispatchAction(true);
    }

    // Pointer Events (Unified touch, mouse, stylus)
    card.addEventListener('pointerdown', (e) => {
        try { card.setPointerCapture(e.pointerId); } catch (_) {}
        handleStart(e);
    });

    card.addEventListener('pointermove', (e) => {
        if (isDragging) handleMove(e);
    });

    card.addEventListener('pointerup', (e) => {
        if (isDragging) {
            try { card.releasePointerCapture(e.pointerId); } catch (_) {}
            handleEnd(e);
        }
    });

    card.addEventListener('pointercancel', (e) => {
        if (isDragging) {
            try { card.releasePointerCapture(e.pointerId); } catch (_) {}
            handleEnd(e);
        }
    });

    // Touch Event fallbacks (for older WebKit versions)
    card.addEventListener('touchstart', (e) => {
        if (!window.PointerEvent) handleStart(e);
    }, { passive: false });

    card.addEventListener('touchmove', (e) => {
        if (!window.PointerEvent && isDragging) handleMove(e);
    }, { passive: false });

    card.addEventListener('touchend', (e) => {
        if (!window.PointerEvent && isDragging) handleEnd(e);
    }, { passive: false });

    return card;
}

/* ──────────────────────────────────────
   DYNAMIC DECK RENDERER (from /config)
────────────────────────────────────── */
async function loadConfig() {
    try {
        const res = await fetch('/config');
        if (!res.ok) throw new Error("Failed to load config.json");
        deckConfig = await res.json();
        renderDeck(deckConfig);
    } catch (e) {
        showToast(`⚠ Config Error: ${e.message}`, 4000);
    }
}

function renderDeck(config) {
    const tabsContainer = document.getElementById('tabsContainer');
    const pagesTrack = document.getElementById('pagesTrack');
    const dotsContainer = document.getElementById('dotsContainer');

    tabsContainer.innerHTML = '';
    pagesTrack.innerHTML = '';
    dotsContainer.innerHTML = '';

    const pages = config.pages || [];

    pages.forEach((page, pIdx) => {
        // 1. Render Tab Button
        const tabBtn = document.createElement('button');
        tabBtn.className = `tab ${pIdx === 0 ? 'active' : ''}`;
        tabBtn.dataset.page = pIdx;
        tabBtn.id = `tab-${pIdx}`;
        tabBtn.role = 'tab';
        tabBtn.setAttribute('aria-selected', pIdx === 0);
        tabBtn.innerHTML = `<img src="${page.icon}" alt=""> ${page.name}`;
        tabBtn.addEventListener('click', () => goToPage(pIdx));
        tabsContainer.appendChild(tabBtn);

        // 2. Render Page Container
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.role = 'tabpanel';
        pageDiv.setAttribute('aria-labelledby', `tab-${pIdx}`);

        const hasWidgets = page.widgets && Array.isArray(page.widgets) && page.widgets.length > 0;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = `page-content ${hasWidgets ? '' : 'no-widgets'}`;

        // 2a. Key Button Grid (Left Side)
        const gridDiv = document.createElement('div');
        gridDiv.className = 'grid';

        (page.buttons || []).forEach((btnConfig) => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.title = btnConfig.name;

            const isSysIcon = btnConfig.icon.includes('skip-') || btnConfig.icon.includes('play.svg') ||
                              btnConfig.icon.includes('pause.svg') || btnConfig.icon.includes('volume-') ||
                              btnConfig.icon.includes('shuffle.svg') || btnConfig.icon.includes('repeat.svg') ||
                              btnConfig.icon.includes('night-shift') || btnConfig.icon.includes('dnd.svg') ||
                              btnConfig.icon.includes('screenshot');

            btn.innerHTML = `
                <img class="btn-icon ${isSysIcon ? 'sys-icon' : ''}" src="${btnConfig.icon}" alt="${btnConfig.name}">
                <span class="btn-label">${btnConfig.name}</span>
            `;

            // Touch press feedback
            btn.addEventListener('touchstart', () => btn.classList.add('pressed'), { passive: true });
            btn.addEventListener('touchend', () => btn.classList.remove('pressed'), { passive: true });
            btn.addEventListener('touchcancel', () => btn.classList.remove('pressed'), { passive: true });

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                sendAction(btnConfig.action);
                showToast(`Activated: ${btnConfig.name}`);
            });

            gridDiv.appendChild(btn);
        });

        contentDiv.appendChild(gridDiv);

        // 2b. Vertical Sliders Widgets (Right Corner - 2 boxes tall)
        if (hasWidgets) {
            const widgetsRow = document.createElement('div');
            widgetsRow.className = 'widgets-container';

            if (page.widgets.includes('sys_volume')) {
                widgetsRow.appendChild(createSliderWidget('sysVol', 'Sys Vol', '/icons/volume-high.svg', '', 'volume'));
            }
            if (page.widgets.includes('app_volume')) {
                widgetsRow.appendChild(createSliderWidget('spotVol', 'App Vol', '/icons/spotify.svg', 'green', 'spotify_volume'));
            }
            if (page.widgets.includes('brightness')) {
                widgetsRow.appendChild(createSliderWidget('bright', 'Bright', '/icons/sun.svg', 'purple', 'brightness'));
            }

            contentDiv.appendChild(widgetsRow);
        }

        pageDiv.appendChild(contentDiv);
        pagesTrack.appendChild(pageDiv);

        // 3. Render Navigation Dot
        const dot = document.createElement('div');
        dot.className = `dot ${pIdx === 0 ? 'active' : ''}`;
        dotsContainer.appendChild(dot);
    });

    // Dynamically adjust widget heights to match 2 key box heights
    setTimeout(adjustWidgetHeights, 50);
}

/* ──────────────────────────────────────
   NAVIGATION & HORIZONTAL TOUCH SWIPE
────────────────────────────────────── */
function goToPage(idx) {
    const total = deckConfig?.pages?.length || 1;
    currentPage = Math.max(0, Math.min(total - 1, idx));
    const track = document.getElementById('pagesTrack');
    track.style.transform = `translateX(${-currentPage * 100}%)`;

    document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', i === currentPage);
        t.setAttribute('aria-selected', i === currentPage);
    });
    document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentPage));

    // Re-adjust widget heights on page switch
    setTimeout(adjustWidgetHeights, 50);
}

let tx = 0, ty = 0;
const wrap = document.getElementById('pagesWrap');
wrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) goToPage(currentPage + (dx < 0 ? 1 : -1));
}, { passive: true });

/* ──────────────────────────────────────
   HEALTH CHECK (Low Frequency: 60s)
────────────────────────────────────── */
async function checkHealth() {
    const dot = document.getElementById('statusDot');
    try {
        const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
        dot.style.background = res.ok ? 'var(--green)' : 'var(--amber)';
        dot.style.boxShadow = res.ok ? '0 0 10px rgba(29, 185, 84, 0.6)' : '0 0 10px rgba(245, 158, 11, 0.6)';
    } catch {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
    }
}

// Initial Load
loadConfig();
checkHealth();
setInterval(checkHealth, 60000);
