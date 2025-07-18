function parseDurationFromText(text) {
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;

  let [, h1, m1 = '0', mer1, h2, m2 = '0', mer2] = match;
  h1 = parseInt(h1); m1 = parseInt(m1);
  h2 = parseInt(h2); m2 = parseInt(m2);

  const toMins = (h, m, mer) => {
    if (mer) {
      if (mer.toLowerCase() === 'pm' && h !== 12) h += 12;
      if (mer.toLowerCase() === 'am' && h === 12) h = 0;
    }
    return h * 60 + m;
  };

  const start = toMins(h1, m1, mer1);
  let end = toMins(h2, m2, mer2);
  if (end < start) end += 24 * 60;

  return end - start;
}

function formatDuration(mins, format) {
  if (format === 'minutes') return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return hours ? `${hours}h${minutes ? ` ${minutes}m` : ''}` : `${minutes}m`;
}

function injectDuration(options) {
  document.querySelectorAll('div[role="button"]').forEach(eventEl => {
    const timeDiv = eventEl.querySelector('.gVNoLb');
    if (!timeDiv) return;
    const container = timeDiv.parentElement;
    if (container.querySelector('.dbr-injected')) return;

    // Parse event text and calculate duration
    const fullText = eventEl.getAttribute('aria-label') || eventEl.innerText;
    const mins = parseDurationFromText(fullText);
    if (!mins || mins < options.minimumDuration) return;

    const label = formatDuration(mins, options.durationFormat);

    const div = document.createElement('div');
    div.className = `${timeDiv.className} dbr-injected`;
    div.textContent = label;

    container.appendChild(div);
  });
}

let optionsCache = { minimumDuration: 61, durationFormat: 'hourMinutes' };

function loadOptionsAndRun() {
  chrome.storage.sync.get(optionsCache, items => {
    optionsCache = items;
    injectDuration(optionsCache);
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    Object.assign(optionsCache, {
      minimumDuration: changes.minimumDuration?.newValue ?? optionsCache.minimumDuration,
      durationFormat: changes.durationFormat?.newValue ?? optionsCache.durationFormat,
    });
    injectDuration(optionsCache);
  }
});

function runInjection() {
  injectDuration(optionsCache);
}

const observer = new MutationObserver(() => {
  clearTimeout(window.__dbr_timeout);
  window.__dbr_timeout = setTimeout(runInjection, 100);
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('load', loadOptionsAndRun);

console.log('[Event Duration] Extension loaded and observing changes.');
