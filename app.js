const API_BASE = 'https://spotter-backend-asvo.onrender.com';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function openTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  const el = document.getElementById(tabId);
  if (el) el.style.display = 'block';

  if (tabId === 'analyse') {
    loadAnalysis();
  } else if (tabId === 'compareTab') {
    loadCompareDrivers();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let drivers = [];
  let activeClass = 'Pro';
  let globalTimerInterval = null;
  let globalTimerStart = null;
  let globalTimerDisplay = null;

  async function loadDriversFromDB(classFilter = null) {
    if (classFilter) activeClass = classFilter;
    try {
      const response = await fetch(`${API_BASE}/api/drivers`);
      const data = await response.json();
      if (Array.isArray(data)) {
        drivers = classFilter ? data.filter(d => d.competitionClass === classFilter) : data;
        render();
      } else {
        console.error('Vigane andmevorming:', data);
      }
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
        const timesHtml = driver.times.map((t, i) => {
          const formattedTime = formatTime(t.time * 1000);
          const timestamp = new Date(t.date).getTime();
          return `
            <div>
              <strong>Katse ${i + 1}:</strong>
              <span class="value">${formattedTime}</span>
              <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteTime('${driver.competitorId}', '${timestamp}', this)">Kustuta</button>
            </div>
          `;
        }).join('');
        detailsEl.innerHTML += `<div><strong>Ajad:</strong></div>${timesHtml}`;
      } else {
        detailsEl.innerHTML += `<div><strong>Ajad:</strong> <span class="value">—</span></div>`;
      }

      // Märkus
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
              setTimeout(() => {
                saveStatus.style.display = 'none';
              }, 2000);
            }
          } catch (err) {
            console.error('Märkuse salvestamine ebaõnnestus:', err);
          }
        }, 1000);
      });

      detailsEl.appendChild(noteLabel);
      detailsEl.appendChild(noteTextarea);
      detailsEl.appendChild(saveStatus);
      wrapper.appendChild(detailsEl);

    } catch (err) {
      console.error('Detailide laadimine ebaõnnestus:', err);
    }
  }

  async function syncDrivers(driverClass) {
    try {
      const response = await fetch(`${API_BASE}/api/sync-driver/${driverClass}`, { method: 'POST' });
      if (response.ok) {
        await loadDriversFromDB(driverClass);
      } else {
        console.error('Sünkroonimine ebaõnnestus');
      }
    } catch (err) {
      console.error('Sünkroonimisviga:', err);
    }
  }

  const syncProBtn = document.getElementById('syncPro');
  if (syncProBtn) syncProBtn.addEventListener('click', () => syncDrivers('Pro'));

  setupGlobalTimer();
  loadDriversFromDB('Pro');
});

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
        <td>${formatTime(d.averageTime * 1000)}</td>
        <td>${formatTime(d.bestTime * 1000)}</td>
        <td>${d.attemptCount}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Analüüsi laadimine ebaõnnestus:', err);
  }
}

async function deleteTime(competitorId, timestamp, btnEl) {
  if (!confirm('Kas soovid selle aja kustutada?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/drivers/${competitorId}/time/${timestamp}`, { method: 'DELETE' });
    if (res.ok) {
      btnEl.parentElement.remove();
    } else {
      alert('Aja kustutamine ebaõnnestus.');
    }
  } catch (err) {
    console.error('Kustutamise viga:', err);
  }
}

async function loadCompareDrivers() {
  try {
    const res = await fetch(`${API_BASE}/api/drivers`);
    const drivers = await res.json();
    const driver1Select = document.getElementById('driver1');
    const driver2Select = document.getElementById('driver2');

    driver1Select.innerHTML = '<option value="">Vali sõitja</option>';
    driver2Select.innerHTML = '<option value="">Vali sõitja</option>';

    drivers.forEach(driver => {
      const opt = new Option(`${driver.competitorName} (#${driver.competitionNumbers})`, driver.competitorId);
      driver1Select.appendChild(opt);
      driver2Select.appendChild(opt.cloneNode(true));
    });

    driver1Select.addEventListener('change', updateComparison);
    driver2Select.addEventListener('change', updateComparison);
  } catch (err) {
    console.error('Viga sõitjate laadimisel võrdluses:', err);
  }
}

async function updateComparison() {
  const id1 = document.getElementById('driver1').value;
  const id2 = document.getElementById('driver2').value;

  if (!id1 || !id2 || id1 === id2) {
    document.getElementById('compareResult').innerHTML = '<p class="text-warning">Vali kaks erinevat sõitjat.</p>';
    return;
  }

  try {
    const [res1, res2] = await Promise.all([
      fetch(`${API_BASE}/api/drivers/${id1}`),
      fetch(`${API_BASE}/api/drivers/${id2}`)
    ]);
    const [d1, d2] = await Promise.all([res1.json(), res2.json()]);

    const avg1 = d1.times?.length ? d1.times.reduce((sum, t) => sum + t.time, 0) / d1.times.length : 0;
    const avg2 = d2.times?.length ? d2.times.reduce((sum, t) => sum + t.time, 0) / d2.times.length : 0;

    document.getElementById('compareResult').innerHTML = `
      <table class="table table-bordered table-dark">
        <thead>
          <tr>
            <th>Võrdlus</th>
            <th>${d1.competitorName}</th>
            <th>${d2.competitorName}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Katsete arv</td>
            <td>${d1.times?.length || 0}</td>
            <td>${d2.times?.length || 0}</td>
          </tr>
          <tr>
            <td>Keskmine aeg</td>
            <td>${formatTime(avg1 * 1000)}</td>
            <td>${formatTime(avg2 * 1000)}</td>
          </tr>
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Viga võrdluse laadimisel:', err);
  }
}
