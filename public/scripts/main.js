// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const welcomeBtn = document.getElementById("welcomeBtn");
  const currentTimeSpan = document.getElementById("currentTime");

  if (welcomeBtn) {
    welcomeBtn.addEventListener("click", showWelcome);
  }

  // Update the current time on load and every second
  if (currentTimeSpan) {
    currentTimeSpan.textContent = getCurrentTime();
    setInterval(() => {
      currentTimeSpan.textContent = getCurrentTime();
    }, 1000);
  }
});

function showWelcome() {
  alert("👋 Welcome to the Doctor Scheduler homepage!");
}
