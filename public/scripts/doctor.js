document.addEventListener("DOMContentLoaded", () => {
  const form       = document.getElementById("scheduleForm");
  const list       = document.getElementById("doctorsList");
  const emptyState = document.getElementById("emptyState");
  const idInput    = document.getElementById("idDoctor");
  const formTitle  = document.getElementById("formTitle");
  const submitBtn  = document.getElementById("submitBtn");
  const cancelBtn  = document.getElementById("cancelEdit");

  let cache = {};

  const fmtTime = t =>
    new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US",
      { hour:"numeric", minute:"2-digit", hour12:true });

  const fmtName = n => `Dr. ${n.replace(/^(dr\.?\s*)/i,"").trim()}`;

  function renderList(rows) {
    list.innerHTML = "";
    if (!rows.length) { emptyState.style.display = "flex"; return; }
    emptyState.style.display = "none";

    rows.forEach(r => {
      const card = document.createElement("div");
      card.className = "doctor-card";
      const days = r.AvailableDays.split(",")
                    .map(d=>`<span class="schedule-day">${d}</span>`).join("");
      card.innerHTML = `
        <div class="doctor-name">${r.DoctorName}</div>
        <div class="doctor-profession">${r.Specialization}</div>
        <div class="doctor-schedule">
          ${days}
          <span class="schedule-time">${fmtTime(r.ShiftStart)} – ${fmtTime(r.ShiftEnd)}</span>
        </div>
        <div style="margin-top:.75rem;">
          <button class="edit-btn" data-id="${r.idDoctor}">Edit</button>
          <button class="del-btn"  data-id="${r.idDoctor}">Delete</button>
        </div>`;
      list.appendChild(card);
    });
  }

  async function load() {
    const res = await fetch("./php/doctors.php?ts="+Date.now());
    const rows = await res.json();
    cache = Object.fromEntries(rows.map(r=>[r.idDoctor, r]));
    renderList(rows);
  }

  function resetForm() {
    form.reset();
    idInput.value = "";
    submitBtn.textContent = "Save Schedule";
    cancelBtn.style.display = "none";
    formTitle.textContent = "Add Doctor Schedule";
  }
  cancelBtn.onclick = resetForm;

  function fillForm(r) {
    idInput.value = r.idDoctor;
    document.getElementById("doctorName").value = r.DoctorName.replace(/^Dr\.\s*/i,"");
    document.getElementById("profession").value = r.Specialization;
    document.querySelectorAll('input[name="days[]"]').forEach(cb=>{
      cb.checked = r.AvailableDays.split(",").includes(cb.value);
    });
    document.getElementById("timeIn").value  = r.ShiftStart;
    document.getElementById("timeOut").value = r.ShiftEnd;

    submitBtn.textContent = "Update Schedule";
    cancelBtn.style.display = "block";
    formTitle.textContent  = "Edit Doctor Schedule";
  }

  list.addEventListener("click", async e => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("edit-btn")) {
      return fillForm(cache[id]);
    }

    if (e.target.classList.contains("del-btn")) {
      if (!confirm("Delete this schedule?")) return;
      const fd = new FormData();
      fd.append("action","delete");
      fd.append("idDoctor",id);
      const res = await fetch("./php/doctors.php",{method:"POST",body:fd});
      const js  = await res.json();
      if (js.status === "success") load();
      else alert(js.message || "Delete failed");
    }
  });

form.addEventListener("submit", async e=>{
  e.preventDefault();
  const fd = new FormData(form);
  const days = fd.getAll("days[]");
  if (!days.length) return alert("Select at least one day.");

  if (fd.get("timeIn") === fd.get("timeOut"))
    return alert("Shift End time must be different from Shift Start time.");

    fd.set("DoctorName", fmtName(fd.get("doctorName")));
    fd.set("AvailableDays", days.join(","));
    fd.set("Specialization", fd.get("profession")); 
    fd.set("action", idInput.value ? "update" : "insert");
    fd.set("ShiftStart", fd.get("timeIn"));
    fd.set("ShiftEnd", fd.get("timeOut"));

    const res = await fetch("./php/doctors.php",{method:"POST",body:fd});
    const js  = await res.json();
    if (js.status === "success") {
      resetForm();
      load();
    } else {
      alert(js.message || "Save failed");
    }
  });

  load();
});


function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/"; 
    }
}

