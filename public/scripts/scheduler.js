document.addEventListener("DOMContentLoaded", () => {

  const dateLabel  = document.getElementById("date");
  const timeLabel  = document.getElementById("time");
  const ageDropdown = document.getElementById("age");
  const logBody    = document.getElementById("log-body");
  const form       = document.getElementById("patient-form");

  for (let i = 1; i <= 110; i++) {
    const op = document.createElement("option");
    op.value = i;               
    op.textContent = `${i} year${i > 1 ? "s" : ""}`;
    ageDropdown.appendChild(op);
  }

  
  const updateClock = () => {
    const now = new Date();
    dateLabel.textContent = now.toLocaleDateString();
    timeLabel.textContent = now.toLocaleTimeString([], { hour12: true });
  };
  updateClock();
  setInterval(updateClock, 1000);

  const removeExpiredRows = () => {
    const now = new Date();
    document.querySelectorAll("#log-body tr").forEach(tr => {
      const endText = tr.dataset.end;   
      if (!endText) return;

      const [timePart, modifier] = endText.split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);
      if (modifier === "PM" && hours !== 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const endDate = new Date(now);
      endDate.setHours(hours, minutes, 0, 0);

      if (now >= endDate) tr.remove();
    });
  };
  removeExpiredRows();
  setInterval(removeExpiredRows, 1_000); 

  async function loadLogs() {
    try {
      const res = await fetch("get_logs.php");
      const data = await res.json();
      if (data.status === "success") {
        data.logs.forEach(insertLogRow);
      } else {
        console.warn("Load logs failed:", data.message);
      }
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  }
  loadLogs();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    fd.set("age", parseInt(fd.get("age"), 10) || 0); 

    try {
      const res = await fetch("mysql.php", { method: "POST", body: fd });
      const data = await res.json();

      if (data.status === "success") {
        insertLogRow(data.row);
    const successDetails = document.getElementById("success-details");
          successDetails.innerHTML = `
            <div class="success-row">
              <p><span>Patient:</span> ${data.row.PatientName}</p>
              <p><span>Condition:</span> ${data.row.Condition}</p>
              <p><span>Doctor:</span> ${data.row.DoctorName}</p>
            </div>
            <div class="success-row">
              <p><span>Duration:</span> ${data.row.Duration}</p>
              <p><span>Start:</span> ${data.row.StartTime}</p>
              <p><span>End:</span> ${data.row.EndTime}</p>
            </div>
          `;
          showPopup("popup-success");
          form.reset();
        } else if (data.status === "no_doctor") {
          showPopup("popup-no-doctor");
        } else {
          showPopup("popup-timeframe");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        alert("Request error: " + err.message);
      }
    });
  });


function insertLogRow(r) {
  const body = document.getElementById("log-body");
  const tr = document.createElement("tr");
  tr.dataset.end = r.EndTime; 
  tr.innerHTML = `
    <td>${r.TimeLogged}</td>
    <td>${r.PatientName}</td>
    <td>${r.Condition}</td>
    <td>${r.DoctorName}</td>
    <td>${r.Duration}</td>
    <td>${r.StartTime}</td>
    <td>${r.EndTime}</td>`;
  body.appendChild(tr);
}

function showPopup(id) {
  document.querySelectorAll(".popup-overlay").forEach(p => p.style.display = "none");
  const el = document.getElementById(id);
  if (el) {
    el.style.display = "flex";
    el.classList.remove("bounce-animation");
    void el.offsetWidth;
    el.classList.add("bounce-animation");
  }
}

function closePopup() {
  document.querySelectorAll(".popup-overlay").forEach(p => p.style.display = "none");
}
