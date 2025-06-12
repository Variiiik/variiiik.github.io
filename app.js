let drivers = [];

// Lae kõik sõitjad serverist
async function loadDriversFromDB() {
  const res = await fetch('/api/drivers');
  const data = await res.json();

  drivers = data; // ← see on nüüd korrektne
  render();
}

// Lisa uus sõitja
async function addDriver() {
  const name = document.getElementById("driverName").value.trim();
  if (!name) return;

  await fetch('https://spotter-backend-asvo.onrender.com/api/drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });

  await loadDriversFromDB();
  document.getElementById("driverName").value = "";
}

// Start/Stop taimer
async function toggleTimer(index) {
  const d = drivers[index];
  if (!d.running) {
    d.startTime = Date.now();
    d.running = true;
  } else {
    const elapsed = (Date.now() - d.startTime) / 1000;
    let note = prompt("Lisa märkus (valikuline):", "");
    if (note === null) note = "";
    d.times.push({ time: elapsed.toFixed(2), note });
    d.running = false;
    d.startTime = null;

    await fetch(`https://spotter-backend-asvo.onrender.com/api/drivers/${encodeURIComponent(d.name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ times: d.times, running: d.running, startTime: d.startTime })
    });
  }
  render();
}

// UI renderdamine
function render() {
  const driverList = document.getElementById('driverList');
  driverList.innerHTML = '';

  drivers.forEach(driver => {
    const el = document.createElement('div');
    el.textContent = `${driver.competitionNumbers} - ${driver.competitorName} (${driver.nationality})`;
    driverList.appendChild(el);
  });
}

// Analüüsi tab
function renderAnalysis() {
  const a = document.getElementById("analysis");
  a.innerHTML = "";

  let globalBest = null;

  drivers.forEach((d) => {
    if (!d.times || d.times.length === 0) return;
    const times = d.times.map(t => parseFloat(t.time));
    const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
    const best = Math.min(...times).toFixed(2);

    if (!globalBest || best < globalBest.time) {
      globalBest = { name: d.name, time: best };
    }

    const div = document.createElement("div");
    div.innerHTML = `<strong>${d.name}</strong><br>Parim aeg: <span class="time">${best}s</span>, Keskmine: <span class="time">${avg}s</span><br><br>`;
    a.appendChild(div);
  });

  if (globalBest) {
    const globalDiv = document.createElement("div");
    globalDiv.innerHTML = `<hr><strong>Kõige kiirem:</strong> <span class="time">${globalBest.time}s</span> – ${globalBest.name}`;
    a.appendChild(globalDiv);
  }
}

// Tabide vahetamine
function switchTab(tab) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
  event.target.classList.add("active");
}

// Lae kõik andmed alguses
window.onload = loadDriversFromDB;
