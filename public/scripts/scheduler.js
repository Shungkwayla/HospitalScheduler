document.addEventListener("DOMContentLoaded", () => {
  const dateLabel = document.getElementById("date");
  const timeLabel = document.getElementById("time");
  const ageDropdown = document.getElementById("age");

  // Fill age dropdown with years
  for (let i = 1; i <= 110; i++) {
    const option = document.createElement("option");
    option.value = `${i} year${i > 1 ? "s" : ""}`;
    option.textContent = `${i} year${i > 1 ? "s" : ""}`;
    ageDropdown.appendChild(option);
  }

  // Update date and time every second
  function updateTime() {
    dateLabel.textContent = getCurrentDate();
    timeLabel.textContent = getCurrentTime();
  }
  updateTime();
  setInterval(updateTime, 1000);
});

function showPopup() {
  const index = Math.floor(Math.random() * 3);

    if (index === 0) {
      addPatientLog();
    } else if (index === 1) {
      document.getElementById("popup-no-doctor").style.display = "flex";
    } else if (index === 2) {
      document.getElementById("popup-timeframe").style.display = "flex";
    }
  }

  function closePopup() {
    document.getElementById("popup-no-doctor").style.display = "none";
    document.getElementById("popup-timeframe").style.display = "none";
    }

function addPatientLog() {
  const tableBody = document.getElementById("log-body");

  const fullname = document.getElementById("fullname").value || "Unknown";
  const condition = document.getElementById("admission").value || "N/A";

  const now = new Date();
  const timeLogged = now.toLocaleTimeString();
  const startTime = timeLogged;
  const endTime = new Date(now.getTime() + 30 * 60000).toLocaleTimeString(); // 30 minutes after

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${timeLogged}</td>
    <td>${fullname}</td>
    <td>${condition}</td>
    <td>${getRandomDoctor()}</td>
    <td>30 mins</td>
    <td>${startTime}</td>
    <td>${endTime}</td>
  `;
  tableBody.appendChild(row);

  document.getElementById("patient-form").reset();
}

function getRandomDoctor() {
  const doctors = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Lopez"];
  return doctors[Math.floor(Math.random() * doctors.length)];
}
