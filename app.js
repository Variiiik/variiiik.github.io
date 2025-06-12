let drivers = [];
let timerInterval = null;
let startTime = null;

// Lae andmebaasist sõitjad
async function loadDriversFromDB() {
  try {
    const response = await fetch('https://spotter-backend-asvo.onrender.com/api/drivers');
    const data = await response.json();

    if (Array.isArray(data)) {
      render(data);
    } else {
      console.error('Saadud andmed ei ole massiiv:', data);
    }
  } catch (error) {
    console.error('Viga sõitjate laadimisel:', error);
  }
}


// Kujunda sõitjate nimekiri
function render() {
  const driverList = document.getElementById('driverList');
  driverList.innerHTML = '';

  drivers.forEach(driver => {
    const el = document.createElement('div');
    el.className = 'driver';
    el.textContent = `${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality})`;
    driverList.appendChild(el);
  });
}

// Start/Stop nupud
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

// Sõitja lisamine
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
    const res = await fetch('/api/drivers', {
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

// Lae alguses
loadDriversFromDB();
