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

    const allPopups = ["popup-success", "popup-no-doctor", "popup-timeframe"];
      allPopups.forEach(id => {
        document.getElementById(id).classList.remove("bounce-animation");
      });

      let popupId = "";
      if (index === 0) {
        popupId = "popup-success";
        addPatientLog();
      } else if (index === 1) {
        popupId = "popup-no-doctor";
      } else {
        popupId = "popup-timeframe";
      }

      const popup = document.getElementById(popupId);
      popup.style.display = "flex";
      void popup.offsetWidth;
      popup.classList.add("bounce-animation");
    }

  function closePopup() {
    document.getElementById("popup-success").style.display = "none";
    document.getElementById("popup-no-doctor").style.display = "none";
    document.getElementById("popup-timeframe").style.display = "none";
    }

function addPatientLog() {
  const tableBody = document.getElementById("log-body");

  const fullname = document.getElementById("fullname").value || "Unknown";
  const condition = document.getElementById("admission").value || "N/A";

  const now = new Date();
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  const timeLogged = now.toLocaleTimeString([], timeOptions);
  const startTime = timeLogged;
  const endTime = new Date(now.getTime() + 30 * 60000).toLocaleTimeString([], timeOptions); // 30 minutes later
  const doctor = getRandomDoctor();

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

  const successDetails = document.getElementById("success-details");
    successDetails.innerHTML = `
      <div class="success-row">
        <p><span>Patient:</span> ${fullname}</p>
        <p><span>Condition:</span> ${condition}</p>
        <p><span>Doctor:</span> ${doctor}</p>
        <p><span>Duration:</span> 30 mins</p>
      </div>
      <div class="success-row">
        <p><span>Start:</span> ${startTime}</p>
        <p><span>End:</span> ${endTime}</p>
      </div>
    `;


  document.getElementById("patient-form").reset();
}

function getRandomDoctor() {
  const doctors = ["Dr. Santos", "Dr. Reyes", "Dr. Cruz", "Dr. Lopez"];
  return doctors[Math.floor(Math.random() * doctors.length)];
}
