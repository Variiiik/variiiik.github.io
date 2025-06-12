let drivers = [];
let timerInterval = null;
let startTime = null;

async function loadDriversFromDB() {
  try {
    const response = await fetch('https://spotter-backend-asvo.onrender.com/api/drivers');
    const data = await response.json();

    if (Array.isArray(data)) {
      drivers = data;
      render();
    } else {
      console.error('Saadud andmed ei ole massiiv:', data);
    }
  } catch (error) {
    console.error('Viga sõitjate laadimisel:', error);
  }
}

function render() {
  const driverList = document.getElementById('driverList');
  driverList.innerHTML = '';

  drivers.forEach(driver => {
    const el = document.createElement('div');
    el.className = 'driver';
    el.textContent = `${driver.competitionNumbers} - ${driver.competitorName} (${driver.countryCode})`;
    el.addEventListener('click', () => showDriverDetails(driver));
    driverList.appendChild(el);
  });
}

function showDriverDetails(driver) {
  const details = `
    <h3>${driver.competitorName}</h3>
    <p><strong>Auto:</strong> ${driver.car}</p>
    <p><strong>Tiim:</strong> ${driver.teamName}</p>
    <p><strong>Riik:</strong> ${driver.countryCode}</p>
    <p><strong>Parim kvalifikatsioon:</strong> ${driver.qualificationsBestResult} (${driver.qualificationsHighestScore}p)</p>
    <p><strong>Parim tandemsõit:</strong> ${driver.tandemsBestResult}</p>
  `;

  const container = document.getElementById('driverDetails');
  container.innerHTML = details;
  container.style.display = 'block';
}

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
  document.getElementById('timerDisplay').textContent = `${seconds}.${milliseconds.toString().padStart(3, '0')} s`;
}

document.getElementById('syncBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('https://spotter-backend-asvo.onrender.com/api/sync-drivers', { method: 'POST' });
    if (res.ok) {
      alert('Sõitjad sünkroniseeritud!');
      await loadDriversFromDB();
    } else {
      alert('Sünkroniseerimine ebaõnnestus');
    }
  } catch (err) {
    console.error('Viga sünkroniseerimisel:', err);
  }
});

loadDriversFromDB();
