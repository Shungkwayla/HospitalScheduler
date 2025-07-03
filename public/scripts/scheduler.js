document.addEventListener("DOMContentLoaded", () => {
  const dateLabel = document.getElementById("date");
  const timeLabel = document.getElementById("time");
  const ageDropdown = document.getElementById("age");
  const logBody = document.getElementById("log-body");
  const form = document.getElementById("patient-form");


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
  setInterval(removeExpiredRows, 1000);

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

    const durationMinutes = getTreatmentDuration(triage.category);
    fd.set("duration", durationMinutes);

    console.log("Fresh NOW:", new Date());

    const now = new Date();
    const deadlineMinutes = parseDeadline(triage.responseTime);
    const deadlineTime = new Date(now.getTime() + deadlineMinutes * 60000);

    console.log("Current time:", new Date());
    console.log("Deadline:", deadlineTime);
    

    const localDeadline = new Date(deadlineTime.getTime() - (deadlineTime.getTimezoneOffset() * 60000))
      .toISOString().slice(0, 19).replace("T", " ");
    fd.set("deadline", localDeadline);

    

      console.log("Deadline:", fd.get("deadline"));
      console.log("FormData before submit:");
      for (let pair of fd.entries()) {
        console.log(pair[0]+ ': ' + pair[1]);
      }

      const docRes = await fetch("doctors.php");
  const doctorList = await docRes.json();

  console.log("Specialization needed by triage:", triage.specialization);

  doctorList.forEach(doc => {
  console.log("Doctor available:", doc.DoctorName, "| Specialization:", doc.Specialization);
  });

  const allDoctors = doctorList.map(doc => ({
    id: doc.idDoctor,
    name: doc.DoctorName,
    specialization: doc.Specialization,
    availableDays: doc.AvailableDays,
    shiftStart: doc.ShiftStart,
    shiftEnd: doc.ShiftEnd
  }));

  const specialization = triage.specialization || "";
  const nowEpoch = Date.now();
  const deadlineEpoch = nowEpoch + deadlineMinutes * 60_000;

  // Filter matching specialization
  const matchedDoctors = allDoctors.filter(doc =>
    doc.specialization.toLowerCase() === specialization.toLowerCase()
  );

  if (matchedDoctors.length === 0) {
    showPopup("popup-no-doctor");
    return;
  }

  // Helper: Convert HH:MM:SS to timestamp today
  function todayTimeToEpoch(t) {
    const [h, m, s] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, s || 0, 0);
    return d.getTime();
  }

  // Choose doctor with earliest valid schedule
  let chosenDoctor = null;
  let chosenStart = null;
  let chosenEnd = null;

  const today = new Date().toLocaleString("en-US", { weekday: "short" });
  console.log("Matched doctors with correct specialization:", matchedDoctors);

  for (const doc of matchedDoctors) {
    const availableDays = doc.availableDays.split(",").map(d => d.trim());
    if (!availableDays.includes(today)) continue;
    const shiftStartEpoch = todayTimeToEpoch(doc.shiftStart);
    const shiftEndEpoch = todayTimeToEpoch(doc.shiftEnd);

    console.log(`Checking ${doc.name} – Days: ${doc.availableDays} vs Today: ${today}`);
    console.log("→ Is today in available days?", availableDays.includes(today));

    let start = Math.max(nowEpoch, shiftStartEpoch);
    let end = start + durationMinutes * 60_000;

console.log("Start:", start);
console.log("End:", end);
console.log("Shift start:", shiftStartEpoch);
console.log("Shift end:", shiftEndEpoch);
console.log("Deadline:", deadlineEpoch);
    if (start <= deadlineEpoch && end <= shiftEndEpoch) {
      chosenDoctor = doc;
      chosenStart = new Date(start);
      chosenEnd = new Date(end);
      break;
    }
  }

  if (!chosenDoctor) {
    showPopup("popup-no-doctor");
    return;
  }

  // Set final fields
  fd.set("doctor_id", chosenDoctor.id);
  fd.set("start_time", chosenStart.toISOString().slice(0, 19).replace("T", " "));
  fd.set("end_time", chosenEnd.toISOString().slice(0, 19).replace("T", " "));

  console.log("Start:", fd.get("start_time"), "End:", fd.get("end_time"));

    try {
      const res = await fetch("mysql.php", { method: "POST", body: fd });
      const data = await res.json();
      console.log("Response from backend:", data);

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
          <p><span>Start:</span> ${chosenStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          <p><span>End:</span> ${chosenEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
        </div>
      `;
        showPopup("popup-success");
        form.reset();
      } else if (data.status === "no_doctor") {
        showPopup("popup-no-doctor");
      } else if (data.status === "error") {
        console.error("Server error:", data.message);
        alert("Server error: " + data.message);
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
  <td>${r.EndTime}</td>
`;
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

const triageCategories = [
  {
    category: "Category 1 (RED)",
    severity: "Life Threatening Conditions",
    responseTime: "Seen Immediately",
    recommendedSpecialization: "Cardiologist",
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
    recommendedSpecialization: "Neurologist",
    symptoms: [
      "airway risk", "febrile neutropenia", "acute stroke", "testicular torsion",
      "severe hypertension", "toxic ingestion", "severe chest pain", "ectopic pregnancy"
    ]
  },
  {
    category: "Category 3 (GREEN)",
    severity: "Potentially Life Threatening or Severe Pain",
    responseTime: "Seen within 30 minutes",
    recommendedSpecialization: "Pediatrician",
    symptoms: [
      "vomiting", "dehydration", "seizure", "head injury", "moderate shortness of breath",
      "stable sepsis", "behavioral issue", "limb injury", "moderate blood loss"
    ]
  },
  {
    category: "Category 4 (BLUE)",
    severity: "Potentially Serious Condition",
    responseTime: "Seen within 60 minutes",
    recommendedSpecialization: "Dermatologist",
    symptoms: [
      "minor head injury", "vomiting without dehydration", "swollen eye",
      "mild pain", "soft tissue injury", "uncomplicated fracture", "fever"
    ]
  },
  {
    category: "Category 5 (WHITE)",
    severity: "Less Urgent or Administrative",
    responseTime: "Seen within 120 minutes",
    recommendedSpecialization: "General Practitioner",
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
    return {
      ...highestCategory,
      specialization: highestCategory.recommendedSpecialization
    };
  }

  return {
    category: "Unclassified",
    severity: "Unknown",
    responseTime: "Refer to triage nurse",
    specialization: "None"
  };
}

function getTreatmentDuration(category) {
  const match = category.match(/Category\s+(\d+)/);
  const cat = parseInt(match?.[1] || 0, 10);
  switch (cat) {
    case 1: return 150;
    case 2: return 90;
    case 3: return 60;
    case 4: return 45;
    case 5: return 15;
    default: return 0;
  }
}

function parseDeadline(responseTime) {
  if (responseTime.toLowerCase().includes("immediately")) {
    return 2;
  }
  const match = responseTime.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}