const API_BASE = 'https://spotter-backend-asvo.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  let drivers = [];
  let timerInterval = null;
  let startTime = null;
  let selectedDriverId = null;
  let activeClass = 'Pro';

  

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
      el.textContent = `${driver.nationality}${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality})`;

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
        const timestamp = new Date(t.date).getTime(); // kasutame unikaalseks id-ks
    
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

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Kustuta ajad';
    deleteBtn.className = 'btn btn-danger btn-sm mt-2';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Kas oled kindel, et soovid kõik ajad kustutada?')) return;
      try {
        await fetch(`${API_BASE}/api/drivers/${driver.competitorId}/times`, {
          method: 'DELETE'
        });
        console.log('Ajad kustutatud');
        await loadDriversFromDB(); // värskenda nimekiri
      } catch (err) {
        console.error('Viga kustutamisel:', err);
      }
    });

    // ⏱ Taimer
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
        } else {
          console.error('Salvestamine ebaõnnestus');
        }
      } catch (err) {
        console.error('Võrguviga:', err);
      }
    });

    // 📝 Märkus automaatse salvestusega
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
          } else {
            console.error('Märkuse salvestamine ebaõnnestus');
          }
        } catch (err) {
          console.error('Võrguviga märkuse salvestamisel:', err);
        }
      }, 1000);
    });

    // ➕ Lisame kõik detailid elemendile
    detailsEl.appendChild(deleteBtn);
    detailsEl.appendChild(timerEl);
    detailsEl.appendChild(startBtn);
    detailsEl.appendChild(stopBtn);
    detailsEl.appendChild(noteLabel);
    detailsEl.appendChild(noteTextarea);
    detailsEl.appendChild(saveStatus);

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
  

  loadDriversFromDB('Pro');
});
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
    }
  }
async function loadAnalysis() {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/top`);
      const data = await res.json();
      console.log('Analüüs JSON:', data);
      const tbody = document.querySelector('#topDriversTable tbody');
      tbody.innerHTML = '';

      data.forEach((d, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${d.competitorName}</td>
          <td>${d.competitionNumbers || '—'}</td>
          <td>${formatTime(d.bestConsecutiveAvg3 * 1000)}${d.isFallback ? ' *' : ''}</td>
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
async function deleteTime(competitorId, timestamp, btnEl) {
    if (!confirm('Kas soovid selle aja kustutada?')) return;
  
    try {
      const res = await fetch(`${API_BASE}/api/drivers/${competitorId}/time/${timestamp}`, {
        method: 'DELETE'
      });
  
      if (res.ok) {
        // Eemalda rida DOM-ist
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
      const option1 = document.createElement('option');
      option1.value = driver.competitorId;
      option1.textContent = `${driver.competitorName} (#${driver.competitionNumbers})`;

      const option2 = option1.cloneNode(true);

      driver1Select.appendChild(option1);
      driver2Select.appendChild(option2);
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

