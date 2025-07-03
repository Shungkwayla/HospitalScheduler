//UI backend
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


  //Database backend
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
});

  //To edit when scheduler added
 form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  fd.set("age", parseInt(fd.get("age"), 10) || 0); 

  const condition = fd.get("condition")?.trim() || "";
  if (!condition) {
    alert("Please enter a valid condition.");
    return;
  }

  const triage = findTriageCategory(condition);

   if (triage.category === "Unclassified") {
  showPopup("popup-no-specialization");
  return;
  }
   
  fd.set("triage_category", triage.category);
  fd.set("triage_severity", triage.severity);
  fd.set("triage_response_time", triage.responseTime);

  const durationMinutes = getTreatmentDuration(triage.category); //Treatment Duration
  fd.set("duration", durationMinutes);

   //Dito ilalagay yung sa deadline at scheduler siguro
   
  const now = new Date();
  // Deadline Based on Response Time
  function parseDeadline(responseTime) {
    const match = responseTime.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  const deadlineMinutes = parseDeadline(triage.responseTime);
  const deadlineTime = new Date(now.getTime() + deadlineMinutes * 60000);
  fd.set("deadline", deadlineTime.toISOString().slice(0, 19).replace('T', ' '));

  // Call Doctor Available
  let assignedDoctor = null;
  try {
    const checkDoctor = await fetch("check-doctor.php", {
      method: "POST",
      body: fd,
    });
    const checkResult = await checkDoctor.json();

    if (checkResult.status === "available") {
      assignedDoctor = checkResult.doctor;
      fd.set("doctor_id", assignedDoctor.id);
      fd.set("start_time", checkResult.start_time);
      fd.set("end_time", checkResult.end_time);
    } else {
      showPopup("popup-no-doctor");
      return;
    }
  } catch (err) {
    console.error("Error checking doctor:", err);
    alert("Unable to verify doctor availability.");
    return;
  }

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
          <p><span>Category:</span> ${triage.category}</p>
          <p><span>Severity:</span> ${triage.severity}</p>
        </div>
        <div class="success-row">
          <p><span>Duration:</span> ${durationMinutes} mins</p>
          <p><span>Start:</span> ${startTime}</p>
          <p><span>End:</span> ${endTime}</p>
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

//scheduler & triage

const triageCategories = [
  {
    category: "Category 1 (RED)",
    severity: "Life Threatening Conditions",
    responseTime: "Seen Immediately",
    symptoms: [
      "cardiac arrest", "respiratory arrest", "extreme respiratory distress",
      "severe shock", "prolonged seizure", "GCS less than 9", "IV overdose",
      "severe behavioral disorder"
    ]
  },
  {
    category: "Category 2 (ORANGE)",
    severity: "Imminently Life Threatening or Severe Pain",
    responseTime: "Seen within 10 minutes",
    symptoms: [
      "airway risk", "febrile neutropenia", "acute stroke", "testicular torsion",
      "severe hypertension", "toxic ingestion", "severe chest pain", "ectopic pregnancy"
    ]
  },
  {
    category: "Category 3 (GREEN)",
    severity: "Potentially Life Threatening or Severe Pain",
    responseTime: "Seen within 30 minutes",
    symptoms: [
      "vomiting", "dehydration", "seizure", "head injury", "moderate shortness of breath",
      "stable sepsis", "behavioral issue", "limb injury", "moderate blood loss"
    ]
  },
  {
    category: "Category 4 (BLUE)",
    severity: "Potentially Serious Condition",
    responseTime: "Seen within 60 minutes",
    symptoms: [
      "minor head injury", "vomiting without dehydration", "swollen eye",
      "mild pain", "soft tissue injury", "uncomplicated fracture", "fever"
    ]
  },
  {
    category: "Category 5 (WHITE)",
    severity: "Less Urgent or Administrative",
    responseTime: "Seen within 120 minutes",
    symptoms: [
      "mild symptoms", "minor abrasions", "medication refill", "no risk factors",
      "chronic psychiatric symptoms"
    ]
  }
];

function findTriageCategory(symptomInput) {
  const input = symptomInput.toLowerCase().split(/[,]+/).map(s => s.trim()).filter(Boolean);

  let highestCategory = null;
  let highestRank = Infinity;

  for (const triage of triageCategories) {
    const categoryNumber = parseInt(triage.category.match(/Category\s+(\d+)/)?.[1], 10);

    for (const keyword of triage.symptoms) {
      for (const symptom of input) {
        if (symptom === keyword.toLowerCase()) {
          if (categoryNumber < highestRank) {
            highestCategory = triage;
            highestRank = categoryNumber;
          }
        }
      }
    }
  }

  if (highestCategory) {
    return highestCategory;
  }

  return {
    category: "Unclassified",
    severity: "Unknown",
    responseTime: "Refer to triage nurse",
  };
}

function getTreatmentDuration(category) {
  const match = category.match(/Category\s+(\d+)/);

  const cat = parseInt(match[1], 10);
  switch (cat) {
    case 1: return 150; 
    case 2: return 90;
    case 3: return 60;
    case 4: return 45;
    case 5: return 15;
  }
}

