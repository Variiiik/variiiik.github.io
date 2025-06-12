const API_BASE = 'https://spotter-backend-asvo.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  let drivers = [];
  let timerInterval = null;
  let startTime = null;

  // Lae andmed
  async function loadDriversFromDB(classFilter = null) {
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

  // Kuvamine
    function render() {
    const driverList = document.getElementById('driverList');
    if (!driverList) return;
    driverList.innerHTML = '';
  
    drivers.forEach(driver => {
      const wrapper = document.createElement('div');
      wrapper.className = 'driver-wrapper';
  
      const el = document.createElement('div');
      el.className = 'driver';
      el.textContent = `${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality || driver.countryCode})`;
      el.addEventListener('click', () => toggleDetails(driver, wrapper));
  
      wrapper.appendChild(el);
      driverList.appendChild(wrapper);
    });
  }
  
  function toggleDetails(driver, wrapper) {
    // Eemalda teistelt detailid
    document.querySelectorAll('.driverDetails').forEach(el => el.remove());
  
    // Kui detailid juba avatud selles wrapperis, siis sulge
    if (wrapper.classList.contains('open')) {
      wrapper.classList.remove('open');
      return;
    }
  
    // Sulge teised
    document.querySelectorAll('.driver-wrapper').forEach(w => w.classList.remove('open'));
    wrapper.classList.add('open');
  
    const details = document.createElement('div');
    details.className = 'driverDetails';
    details.innerHTML = `
      <div><strong>Auto:</strong> ${driver.car || '—'}</div>
      <div><strong>Meeskond:</strong> ${driver.teamName || '—'}</div>
      <div><strong>Kvalifikatsioon:</strong> ${driver.qualificationsBestResult || '—'} (max: ${driver.qualificationsHighestScore || 0})</div>
      <div><strong>Tandem:</strong> ${driver.tandemsBestResult || '—'}</div>
      <div><strong>Riik:</strong> ${driver.countryCode || driver.nationality || '—'}</div>
    `;
  
    wrapper.appendChild(details);
  }

  // Start/Stop taimer
  document.getElementById('startBtn').addEventListener('click', () => {
    if (!timerInterval) {
      startTime = Date.now();
      timerInterval = setInterval(updateTimer, 100);
    }
  });

  document.getElementById('stopBtn').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
  });

  function updateTimer() {
    const now = Date.now();
    const diff = now - startTime;
    const seconds = Math.floor(diff / 1000);
    const milliseconds = diff % 1000;
    document.getElementById('timerDisplay').textContent =
      `${seconds}.${milliseconds.toString().padStart(3, '0')} s`;
  }

  // Lisa uus sõitja vormi kaudu
  document.getElementById('addDriverForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('nameInput').value;
    const number = document.getElementById('numberInput').value;
    const nationality = document.getElementById('nationalityInput').value;

    const newDriver = {
      competitorName: name,
      competitionNumbers: number,
      mostCommonNr: parseInt(number),
      nationality: nationality,
      competitionClass: 'Pro',
      status: 1
    };

    try {
      const res = await fetch(`${API_BASE}/api/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDriver)
      });

      if (res.ok) {
        await loadDriversFromDB();
        document.getElementById('addDriverForm').reset();
      } else {
        console.error('Lisamine ebaõnnestus');
      }
    } catch (err) {
      console.error('Viga lisamisel:', err);
    }
  });

  // Sünkrooni – töötab POST-iga
  window.syncDrivers = async function(driverClass) {
    try {
      const response = await fetch(`${API_BASE}/api/sync-driver/${driverClass}`, {
        method: 'POST'
      });
      if (response.ok) {
        console.log(`${driverClass} sünkroonitud`);
        await loadDriversFromDB(driverClass); // ← siit tuleb nüüd ainult see klass
      } else {
        console.error('Sünkroonimine ebaõnnestus');
      }
    } catch (err) {
      console.error('Sünkroonimisviga:', err);
    }
  };

  // Käivitamine
 // loadDriversFromDB();

  // Nupud (sünk)
  const syncProBtn = document.getElementById('syncPro');
  const syncPro2Btn = document.getElementById('syncPro2');

  if (syncProBtn) syncProBtn.addEventListener('click', () => syncDrivers('Pro'));
  if (syncPro2Btn) syncPro2Btn.addEventListener('click', () => syncDrivers('Pro2'));
});
