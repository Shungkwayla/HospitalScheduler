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

function removeExpiredRows() {
  const now = new Date();

  document.querySelectorAll("#log-body tr").forEach(tr => {
    const endText = tr.dataset.end;
    if (!endText) return;

    const todayDate = now.toISOString().split("T")[0]; 

    const endDateTimeString = `${todayDate} ${endText}`;
    const endDate = new Date(endDateTimeString);

    if (isNaN(endDate.getTime())) {
      return;
    }

    if (now >= endDate) {
      tr.remove();
    }
  });
}


setInterval(removeExpiredRows, 5000);


  async function loadLogs() {
    try {
      const res = await fetch("php/get_logs.php");
      const data = await res.json();
      if (data.status === "success") {
        data.logs.forEach(insertLogRow);
      }
    } catch (err) {
    }
  }
  loadLogs();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const condition = fd.get("condition")?.trim() || "";
    if (!condition) {
      alert("Enter condition");
      return;
    }
    fd.set("age", parseInt(fd.get("age"), 10) || 0);

    const triage = findTriageCategory(condition);

    if (triage.category === "Unclassified") {
      showPopup("popup-no-doctor");
      return;
    }

    fd.set("triage_category", triage.category);
    fd.set("triage_severity", triage.severity);
    fd.set("triage_response_time", triage.responseTime);

    const durationMinutes = getTreatmentDuration(triage.category);
    fd.set("duration", durationMinutes);

    const now = new Date();
    const deadlineMinutes = parseDeadline(triage.responseTime);
    const deadlineDate = new Date(now.getTime() + deadlineMinutes * 60000);

    const schedulingResult = await assignDoctorToPatient({
      condition,
      deadline: deadlineDate.toISOString(),
      duration: durationMinutes
    });

    if (schedulingResult.status === "success") {
      fd.set("idDoctor", schedulingResult.doctor.idDoctor);
      fd.set("DoctorName", schedulingResult.doctor.DoctorName);
      fd.set("start_time", schedulingResult.start_time);
      fd.set("end_time", schedulingResult.end_time);
    } else if(schedulingResult.status === "no-specialization"){
      showPopup("popup-no-doctor");
      return;
    } else {
      showPopup("popup-timeframe");
      return;
    }

    try {
      const res = await fetch("php/mysql.php", { method: "POST", body: fd });
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
      } else {
        alert("Server error: " + data.message);
      }
    } catch (err) {
      alert("Request error: " + err.message);
    }
  });
});


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


function insertLogRow(r) {
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
  document.getElementById("log-body").appendChild(tr);
}

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

function findTriageCategory(input) {
  const lower = input.toLowerCase().trim();
  const allKeywords = [];

  for (const triage of triageCategories) {
    for (const keyword of triage.symptoms) {
      allKeywords.push({ keyword: keyword.toLowerCase(), triage });
    }
  }

  allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

  for (const { keyword, triage } of allKeywords) {
    if (lower.includes(keyword)) {
      return triage;
    }
  }

  return { category: "Unclassified", severity: "Unknown", responseTime: "Refer to triage nurse" };
}


function getTreatmentDuration(category) {
  const match = category.match(/Category\s+(\d+)/);
  const cat = parseInt(match?.[1] || 0);
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
  if (responseTime.includes("Immediately")) return 2;
  const m = responseTime.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function getSpecializationForCategory(category) {
  if (category.includes("Category 1")) {
    return ["Emergency Medicine"];
  }
  if (category.includes("Category 2")) {
    return ["Critical Care", "Emergency Medicine"];
  }
  return ["General Practitioner", "Critical Care", "Emergency Medicine"];
}

async function assignDoctorToPatient({ condition, deadline, duration }) {
  const triage = findTriageCategory(condition);
  const allowedSpecializations = getSpecializationForCategory(triage.category).map(s => s.toLowerCase());
  const deadlineDate = new Date(deadline);

  const res = await fetch("php/get_doctors.php");
  const data = await res.json();
  if (data.status !== "success") {
    return { status: "error", message: "Failed to get doctors" };
  }

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  let bestOption = null;
  let hasMatchingSpecialization = false;

  for (const doc of data.doctors) {
    if (!allowedSpecializations.includes(doc.Specialization.toLowerCase())) continue;

    hasMatchingSpecialization = true;

    const days = doc.AvailableDays.split(",").map(d => d.trim().toLowerCase());
    if (!days.includes(dayOfWeek)) continue;

    const shiftStart = parseTimeToday(doc.ShiftStart);
    const shiftEnd = parseTimeToday(doc.ShiftEnd);
    if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

    if (!(now >= shiftStart && now <= shiftEnd)) continue;

    const latestRes = await fetch(`php/get_latest_end_time.php?doctorId=${doc.idDoctor}`).then(r => r.json());
    let proposedStart;
    if (latestRes.status === "success" && latestRes.latestEndDateTime) {
      const latestEnd = new Date(latestRes.latestEndDateTime);
      proposedStart = latestEnd > now ? latestEnd : now;
    } else {
      proposedStart = now;
    }

    const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);
    if (proposedEnd > shiftEnd) continue;
    if (proposedStart > deadlineDate) continue;

    if (
      !bestOption ||
      proposedStart < bestOption.proposedStart ||
      (
        proposedStart.getTime() === bestOption.proposedStart.getTime() &&
        allowedSpecializations.indexOf(doc.Specialization.toLowerCase()) <
          allowedSpecializations.indexOf(bestOption.doctor.Specialization.toLowerCase())
      )
    ) {
      bestOption = {
        doctor: doc,
        proposedStart,
        proposedEnd
      };
    }
  }

  if (bestOption) {
    return {
      status: "success",
      doctor: bestOption.doctor,
      start_time: formatDateTime(bestOption.proposedStart),
      end_time: formatDateTime(bestOption.proposedEnd)
    };
  }

  if (!hasMatchingSpecialization) {
    return { status: "no-specialization" };
  }

  return { status: "cannot_fit" };
}

function parseTimeToday(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  now.setHours(hours, minutes || 0, 0, 0);
  return now;
}

function formatDateTime(dt) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
