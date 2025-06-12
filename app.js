const API_BASE = 'https://spotter-backend-asvo.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  let drivers = [];
  let timerInterval = null;
  let startTime = null;
  let selectedDriverId = null;
  let activeClass = 'Pro';

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

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

  async function render() {
    const driverList = document.getElementById('driverList');
    if (!driverList) return;
    driverList.innerHTML = '';

    for (const driver of drivers) {
      const wrapper = document.createElement('div');
      wrapper.className = 'driver-wrapper';

      const el = document.createElement('div');
      el.className = 'driver';
      el.textContent = `${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality || driver.countryCode})`;

      el.addEventListener('click', () => {
        toggleDetails(driver, wrapper);
        selectedDriverId = driver.competitorId;
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

      const detailsEl = document.createElement('div');
      detailsEl.className = 'driverDetails';
      detailsEl.innerHTML = `
        <div><strong>Auto:</strong> <span class="value">${detail.car || '—'}</span></div>
        <div><strong>Meeskond:</strong> <span class="value">${detail.teamName || '—'}</span></div>
        <div><strong>Kvalifikatsioon:</strong> <span class="value">${detail.qualificationsBestResult || '—'} (max: ${detail.qualificationsHighestScore || 0})</span></div>
        <div><strong>Tandem:</strong> <span class="value">${detail.tandemsBestResult || '—'}</span></div>
        <div><strong>Riik:</strong> <span class="value">${detail.countryCode || driver.nationality || '—'}</span></div>
      `;

      if (driver.times && driver.times.length > 0) {
        const timesHtml = driver.times
          .map((t, i) => `<div><strong>Katse ${i + 1}:</strong> <span class="value">${formatTime(t.time * 1000)}</span></div>`)
          .join('');
        detailsEl.innerHTML += `<div><strong>Ajad:</strong></div>${timesHtml}`;
      } else {
        detailsEl.innerHTML += `<div><strong>Ajad:</strong> <span class="value">—</span></div>`;
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Kustuta ajad';
      deleteBtn.style.marginTop = '10px';
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Kas oled kindel, et soovid kõik ajad kustutada?')) return;

        try {
          await fetch(`${API_BASE}/api/drivers/${selectedDriverId}/times`, {
            method: 'DELETE'
          });

          //await loadDriversFromDB(); // Värskenda list
        } catch (err) {
          console.error('Viga kustutamisel:', err);
        }
      });

      detailsEl.appendChild(deleteBtn);

      // ⏱ Taimer + nupud
      const timerEl = document.createElement('div');
      timerEl.className = 'timer mt-2';
      timerEl.textContent = '00:00.00';

      const startBtn = document.createElement('button');
      startBtn.textContent = 'Start';
      startBtn.className = 'btn btn-success btn-sm me-2 mt-2';

      const stopBtn = document.createElement('button');
      stopBtn.textContent = 'Stop';
      stopBtn.className = 'btn btn-warning btn-sm mt-2';
      stopBtn.disabled = true;

      let localStart = null;
      let localTimer = null;

      function format(ms) {
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        const cs = Math.floor((ms % 1000) / 10);
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
      }

      startBtn.addEventListener('click', () => {
        localStart = Date.now();
        localTimer = setInterval(() => {
          timerEl.textContent = format(Date.now() - localStart);
        }, 50);
        startBtn.disabled = true;
        stopBtn.disabled = false;
      });

      stopBtn.addEventListener('click', async () => {
        clearInterval(localTimer);
        const final = Date.now() - localStart;
        timerEl.textContent = format(final);
        startBtn.disabled = false;
        stopBtn.disabled = true;

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
            console.log('Aeg salvestatud');
            const newTimeEl = document.createElement('div');
            newTimeEl.innerHTML = `<strong>Katse:</strong> <span class="value">${format(final)}</span>`;
            detailsEl.appendChild(newTimeEl);
            //await loadDriversFromDB(); // värskenda
          } else {
            console.error('Salvestamine ebaõnnestus');
          }
        } catch (err) {
          console.error('Võrguviga:', err);
        }
      });

      detailsEl.appendChild(timerEl);
      detailsEl.appendChild(startBtn);
      detailsEl.appendChild(stopBtn);

      wrapper.appendChild(detailsEl);
    } catch (err) {
      console.error('Detailide laadimine ebaõnnestus:', err);
    }
  }

  const syncProBtn = document.getElementById('syncPro');
  if (syncProBtn) syncProBtn.addEventListener('click', () => syncDrivers('Pro'));

  async function syncDrivers(driverClass) {
    try {
      const response = await fetch(`${API_BASE}/api/sync-driver/${driverClass}`, {
        method: 'POST'
      });
      if (response.ok) {
        console.log(`${driverClass} sünkroonitud`);
        await loadDriversFromDB(driverClass);
      } else {
        console.error('Sünkroonimine ebaõnnestus');
      }
    } catch (err) {
      console.error('Sünkroonimisviga:', err);
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
          <td>${formatTime(d.bestConsecutiveAvg3 * 1000)}</td>
          <td>${formatTime(d.bestTime * 1000)}</td>
          <td>${formatTime(d.averageTime * 1000)}</td>
          <td>${d.attemptCount}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Analüüsi laadimine ebaõnnestus:', err);
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

  loadDriversFromDB('Pro');
});
