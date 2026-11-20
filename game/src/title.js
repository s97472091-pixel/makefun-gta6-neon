// Solana Bay — Sunset Title Screen & Save-Slot Cards
import { CURRENCY } from './config.js';

export function createTitleScreenSystem(callbacks = {}) {
  const root = document.getElementById('title-screen');
  const slotsContainer = document.getElementById('title-slots');
  const btnContinue = document.getElementById('btn-continue');
  const btnNewGame = document.getElementById('btn-new-game');
  const btnLoadGame = document.getElementById('btn-load-game');
  const btnSettings = document.getElementById('btn-title-settings');

  let currentSlots = [null, null, null];

  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      if (callbacks.onContinue) callbacks.onContinue();
    });
  }
  if (btnNewGame) {
    btnNewGame.addEventListener('click', () => {
      if (callbacks.onNewGame) callbacks.onNewGame();
    });
  }
  if (btnLoadGame) {
    btnLoadGame.addEventListener('click', () => {
      if (slotsContainer) {
        slotsContainer.classList.add('highlight');
        setTimeout(() => slotsContainer.classList.remove('highlight'), 700);
      }
    });
  }
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      if (callbacks.onOpenSettings) callbacks.onOpenSettings();
    });
  }

  function renderSlots(slots) {
    currentSlots = slots || [null, null, null];
    if (!slotsContainer) return;

    const hasAny = currentSlots.some(Boolean);
    if (btnContinue) btnContinue.disabled = !hasAny;

    slotsContainer.innerHTML = currentSlots
      .map((slot, idx) => {
        if (!slot) {
          return `<div class="save-card empty" data-title-slot="${idx}">
            <div class="sc-head">
              <span class="sc-slot-num">SLOT 0${idx + 1}</span>
              <span class="sc-badge empty">EMPTY SLOT</span>
            </div>
            <div class="sc-empty-text">Start a fresh Solana Bay career</div>
            <div class="sc-foot">Click to start New Game</div>
          </div>`;
        }
        return `<div class="save-card filled" data-title-slot="${idx}">
          <div class="sc-head">
            <span class="sc-slot-num">SLOT 0${idx + 1} · ${slot.act}</span>
            <span class="sc-badge">${slot.completionPct}%</span>
          </div>
          <div class="sc-district">${slot.districtName}</div>
          <div class="sc-grid">
            <span>Missions ${slot.missionsDone}/${slot.missionsTotal}</span>
            <span>${CURRENCY}${slot.cash.toLocaleString()}</span>
            <span>🕒 ${slot.clock}</span>
          </div>
        </div>`;
      })
      .join('');

    for (const card of slotsContainer.querySelectorAll('[data-title-slot]')) {
      card.addEventListener('click', () => {
        const idx = Number(card.dataset.titleSlot);
        if (currentSlots[idx]) {
          if (callbacks.onLoadSlot) callbacks.onLoadSlot(idx);
        } else if (callbacks.onNewGameInSlot) {
          callbacks.onNewGameInSlot(idx);
        }
      });
    }
  }

  function show(slots) {
    renderSlots(slots);
    if (root) root.classList.remove('hidden');
  }

  function hide() {
    if (root) root.classList.add('hidden');
  }

  return {
    show,
    hide,
    renderSlots,
  };
}
