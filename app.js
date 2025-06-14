const API_BASE = 'https://spotter-backend-asvo.onrender.com';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  let drivers = [];
  let globalTimerInterval = null;
  let globalTimerStart = null;
  let globalTimerDisplay = null;

  async function loadDriversFromDB(classFilter = null) {
    try {
      const response = await fetch(`${API_BASE}/api/drivers`);
      const data = await response.json();
      drivers = classFilter ? data.filter(d => d.competitionClass === classFilter) : data;
      render();
    } catch (err) {
      console.error('Viga laadimisel:', err);
    }
  }

  function setupGlobalTimer() {
    const container = document.getElementById('globalTimerArea');
    if (!container) return;

    globalTimerDisplay = document.createElement('div');
    globalTimerDisplay.className = 'timer my-3';
    globalTimerDisplay.textContent = '00:00.00';

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start';
    startBtn.className = 'btn btn-success me-2';
    startBtn.addEventListener('click', () => {
      if (globalTimerInterval) return;

      globalTimerStart = Date.now();
      globalTimerInterval = setInterval(() => {
        const ms = Date.now() - globalTimerStart;
        globalTimerDisplay.textContent = formatTime(ms);
      }, 50);
    });

    container.appendChild(globalTimerDisplay);
    container.appendChild(startBtn);
  }

  async function render() {
    const driverList = document.getElementById('driverList');
    if (!driverList) return;
    driverList.innerHTML = '';

    for (const driver of drivers) {
      const wrapper = document.createElement('div');
      wrapper.className = 'driver-wrapper';

      const el = document.createElement('div');
      el.className = 'driver';
      el.textContent = `${driver.nationality}${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality})`;

      el.addEventListener('click', () => {
        toggleDetails(driver, wrapper);
      });

      wrapper.appendChild(el);
      driverList.appendChild(wrapper);
    }
  }

  async function toggleDetails(driver, wrapper) {
    document.querySelectorAll('.driverDetails').forEach(el => el.remove());

    if (wrapper.classList.contains('open')) {
      wrapper.classList.remove('open');
      return;
    }

    document.querySelectorAll('.driver-wrapper').forEach(w => w.classList.remove('open'));
    wrapper.classList.add('open');

    try {
      const res = await fetch(`${API_BASE}/api/drivers/${driver.competitorId}`);
      const detail = await res.json();
      driver.details = detail;

      const statusIcon = driver.status === 1
        ? '<i class="bi bi-check-circle-fill text-success"></i>'
        : '<i class="bi bi-exclamation-circle-fill text-warning"></i>';

      const detailsEl = document.createElement('div');
      detailsEl.className = 'driverDetails';
      detailsEl.innerHTML = `
        <div><strong>Auto:</strong> <span class="value">${detail.car || '—'}</span></div>
        <div><strong>Meeskond:</strong> <span class="value">${detail.teamName || '—'}</span></div>
        <div><strong>Kvalifikatsioon:</strong> <span class="value">${detail.qualificationsBestResult || '—'} (max: ${detail.qualificationsHighestScore || 0})</span></div>
        <div><strong>Tandem:</strong> <span class="value">${detail.tandemsBestResult || '—'}</span></div>
        <div><strong>Riik:</strong> <span class="value">${driver.nationality || '—'}</span></div>
        <div><strong>Staatus:</strong> <span class="value">${statusIcon}</span></div>
      `;

      if (driver.times && driver.times.length > 0) {
        const timesHtml = driver.times
          .map((t, i) => {
            const formattedTime = formatTime(t.time * 1000);
            const timestamp = new Date(t.date).getTime();
            return `
              <div>
                <strong>Katse ${i + 1}:</strong> 
                <span class="value">${formattedTime}</span>
                <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteTime('${driver.competitorId}', '${timestamp}', this)">Kustuta</button>
              </div>
            `;
          })
          .join('');
        detailsEl.innerHTML += `<div><strong>Ajad:</strong></div>${timesHtml}`;
      } else {
        detailsEl.innerHTML += `<div><strong>Ajad:</strong> <span class="value">—</span></div>`;
      }

      const stopBtn = document.createElement('button');
      stopBtn.textContent = 'Stop ja salvesta aeg';
      stopBtn.className = 'btn btn-warning btn-sm mt-2';
      stopBtn.addEventListener('click', async () => {
        if (!globalTimerInterval || globalTimerStart === null) {
          alert('Taimer ei tööta!');
          return;
        }

        const final = Date.now() - globalTimerStart;
        clearInterval(globalTimerInterval);
        globalTimerInterval = null;
        globalTimerStart = null;
        globalTimerDisplay.textContent = formatTime(final);

        const seconds = Math.floor(final / 1000);
        const centis = Math.floor((final % 1000) / 10);
        const totalSeconds = seconds + centis / 100;

        try {
          const res = await fetch(`${API_BASE}/api/drivers/${driver.competitorId}/time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: totalSeconds })
          });

          if (res.ok) {
            await loadDriversFromDB();
          } else {
            console.error('Salvestamine ebaõnnestus');
          }
        } catch (err) {
          console.error('Võrguviga:', err);
        }
      });

      const noteLabel = document.createElement('label');
      noteLabel.textContent = 'Märkus:';
      noteLabel.className = 'mt-3';

      const noteTextarea = document.createElement('textarea');
      noteTextarea.className = 'form-control mb-2';
      noteTextarea.rows = 2;
      noteTextarea.value = driver.note || '';
      noteTextarea.placeholder = 'Sisesta märkus...';

      const saveStatus = document.createElement('div');
      saveStatus.className = 'text-success small mb-2';
      saveStatus.style.display = 'none';
      saveStatus.textContent = '💾 Salvestatud';

      let noteTimer = null;
      noteTextarea.addEventListener('input', () => {
        if (noteTimer) clearTimeout(noteTimer);
        noteTimer = setTimeout(async () => {
          try {
            const res = await fetch(`${API_BASE}/api/drivers/${driver.competitorId}/note`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ note: noteTextarea.value.trim() })
            });
            if (res.ok) {
              saveStatus.style.display = 'block';
              setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
            } else {
              console.error('Märkuse salvestamine ebaõnnestus');
            }
          } catch (err) {
            console.error('Võrguviga märkuse salvestamisel:', err);
          }
        }, 1000);
      });

      detailsEl.appendChild(stopBtn);
      detailsEl.appendChild(noteLabel);
      detailsEl.appendChild(noteTextarea);
      detailsEl.appendChild(saveStatus);
      wrapper.appendChild(detailsEl);
    } catch (err) {
      console.error('Detailide laadimine ebaõnnestus:', err);
    }
  }

  async function deleteTime(competitorId, timestamp, btnEl) {
    if (!confirm('Kas soovid selle aja kustutada?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/drivers/${competitorId}/time/${timestamp}`, { method: 'DELETE' });
      if (res.ok) btnEl.parentElement.remove();
      else alert('Aja kustutamine ebaõnnestus.');
    } catch (err) {
      console.error('Kustutamise viga:', err);
    }
  }

  function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
    });

    const el = document.getElementById(tabId);
    if (el) el.style.display = 'block';

    if (tabId === 'analyse') {
      loadAnalysis();
    }
  }

  async function loadAnalysis() {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/top`);
      const data = await res.json();
      const tbody = document.querySelector('#topDriversTable tbody');
      tbody.innerHTML = '';

      data.forEach((d, index) => {
        const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${d.competitorName}</td>
        <td>${d.competitionNumbers || '—'}</td>
        <td>${Number.isFinite(d.bestConsecutiveAvg3) ? formatTime(d.bestConsecutiveAvg3 * 1000) : '—'}</td>
        <td>${formatTime(d.bestTime * 1000)}</td>
        <td>${formatTime(d.averageTime * 1000)}</td>
        <td>${d.attemptCount || 0}</td>
      `;


        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Analüüsi laadimine ebaõnnestus:', err);
    }
  }

  window.deleteTime = deleteTime;
  window.openTab = openTab;
  window.loadAnalysis = loadAnalysis;

  document.getElementById('syncPro')?.addEventListener('click', () => loadDriversFromDB('Pro'));
  setupGlobalTimer();
  loadDriversFromDB('Pro');
});
