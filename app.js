let drivers = [];

async function loadDriversFromDB() {
  try {
    const response = await fetch('https://spotter-backend-asvo.onrender.com/api/drivers');
    if (!response.ok) throw new Error('Viga API päringus');
    drivers = await response.json();
    render();
  } catch (error) {
    console.error('Laadimine ebaõnnestus:', error);
  }
}

function render() {
  const driverList = document.getElementById('driverList');
  if (!driverList) {
    console.warn('Elementi #driverList ei leitud');
    return;
  }
  driverList.innerHTML = '';

  drivers.forEach(driver => {
    const el = document.createElement('div');
    el.className = 'driver';
    el.textContent = `${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality})`;
    driverList.appendChild(el);
  });
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  document.getElementById(tabId).style.display = 'block';
}

// Formi submit sõitja lisamiseks (näidis)
document.addEventListener('DOMContentLoaded', () => {
  loadDriversFromDB();

  const form = document.getElementById('driverForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.status = 1;
      data.competitionClass = "Pro";

      try {
        const res = await fetch('https://spotter-backend-asvo.onrender.com/api/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Lisamine ebaõnnestus');
        form.reset();
        await loadDriversFromDB();
        showTab('spotter-tab');
      } catch (err) {
        console.error('Viga lisamisel:', err);
      }
    });
  }
});
