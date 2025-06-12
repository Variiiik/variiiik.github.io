const API_BASE = 'https://spotter-backend-asvo.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  let drivers = [];
  let timerInterval = null;
  let startTime = null;

  // Lae andmed
  async function loadDriversFromDB() {
    try {
      const response = await fetch(`${API_BASE}/api/drivers`);
      const data = await response.json();
      if (Array.isArray(data)) {
        drivers = data;
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
      const el = document.createElement('div');
      el.className = 'driver';
      el.textContent = `${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality || driver.countryCode})`;
      el.addEventListener('click', () => showDetails(driver));
      driverList.appendChild(el);
    });
  }

  // Detailvaade
  function showDetails(driver) {
    document.getElementById('detailName').textContent = driver.competitorName || '—';
    document.getElementById('detailCar').textContent = driver.car || '—';
    document.getElementById('detailTeam').textContent = driver.teamName || '—';
    document.getElementById('detailQual').textContent = `${driver.qualificationsBestResult || '—'} (max: ${driver.qualificationsHighestScore || 0})`;
    document.getElementById('detailTandem').textContent = driver.tandemsBestResult || '—';
    document.getElementById('detailCountry').textContent = driver.countryCode || driver.nationality || '—';

    document.getElementById('driverDetails').style.display = 'block';
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
  window.syncDrivers = async function (driverClass) {
    try {
      const response = await fetch(`${API_BASE}/api/sync-drivers/${driverClass}`, {
        method: 'POST'
      });
  
      if (response.ok) {
        console.log(`${driverClass} sünkroonitud`);
        await loadDriversFromDB();
      } else {
        console.error('Sünkroonimine ebaõnnestus');
      }
    } catch (err) {
      console.error('Sünkroonimisviga:', err);
    }
  };

  // Käivitamine
  loadDriversFromDB();

  // Nupud (sünk)
  const syncProBtn = document.getElementById('syncPro');
  const syncPro2Btn = document.getElementById('syncPro2');

  if (syncProBtn) syncProBtn.addEventListener('click', () => syncDrivers('Pro'));
  if (syncPro2Btn) syncPro2Btn.addEventListener('click', () => syncDrivers('Pro2'));
});
