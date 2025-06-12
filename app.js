const API_URL = "https://spotter-backend-asvo.onrender.com/api"; // Asenda vajadusel oma backendiga
let drivers = [];
let activeDriverId = null;
let startTime = null;

const driverSelect = document.getElementById("driverSelect");
const driverInfo = document.getElementById("driverInfo");
const log = document.getElementById("log");

// Lae võistlejad
fetch(`${API_URL}/drivers`)
  .then(res => res.json())
  .then(data => {
    drivers = data;
    driverSelect.innerHTML = "";
    data.forEach(driver => {
      const option = document.createElement("option");
      option.value = driver._id;
      option.textContent = `${driver.competitionNumbers} – ${driver.competitorName}`;
      driverSelect.appendChild(option);
    });
    updateDriverInfo();
  });

driverSelect.addEventListener("change", updateDriverInfo);

function updateDriverInfo() {
  const selectedId = driverSelect.value;
  const driver = drivers.find(d => d._id === selectedId);
  activeDriverId = selectedId;
  if (!driver) return;
  driverInfo.innerHTML = `
    <p><strong>${driver.competitorName}</strong> (${driver.nationality})</p>
    <p>Auto: ${driver.car || '–'}</p>
    <p>Vanus: ${driver.age || '–'} | Meeskond: ${driver.teamName || '–'}</p>
    <p>Parim kvalifikatsioon: ${driver.qualificationsBestResult || '–'} (${driver.qualificationsHighestScore || 0}p)</p>
  `;
}

function startTiming() {
  if (!activeDriverId) return;
  startTime = Date.now();
  logMessage("Taimer käivitatud...");
}

function stopTiming() {
  if (!activeDriverId || !startTime) return;
  const endTime = Date.now();
  const seconds = ((endTime - startTime) / 1000).toFixed(2);
  const note = prompt("Lisa märkus (valikuline):", "");

  fetch(`${API_URL}/drivers/${activeDriverId}/times`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ time: seconds, note })
  })
    .then(res => res.json())
    .then(() => {
      logMessage(`⏱️ ${seconds}s salvestatud${note ? ` – ${note}` : ''}`);
    })
    .catch(() => logMessage("❌ Viga salvestamisel"));

  startTime = null;
}

function logMessage(msg) {
  const p = document.createElement("p");
  p.textContent = msg;
  log.prepend(p);
}
