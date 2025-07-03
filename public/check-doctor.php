<?php
header("Content-Type: application/json");
$mysqli = new mysqli("localhost", "Group8Admin", "jobscheduler8", "hospitalscheduler");
if ($mysqli->connect_error) {
  echo json_encode(["status" => "error", "message" => "DB connection failed"]);
  exit;
}

$triage = $_POST["triage_category"] ?? "";
$duration = intval($_POST["duration"] ?? 0);
$deadline = $_POST["deadline"] ?? "";

if (!$triage || !$duration || !$deadline) {
  echo json_encode(["status" => "error", "message" => "Missing data"]);
  exit;
}

$deadlineTime = strtotime($deadline);
if (!$deadlineTime) {
  echo json_encode(["status" => "error", "message" => "Invalid deadline"]);
  exit;
}

$doctors = $mysqli->query("SELECT idDoctor, DoctorName FROM doctor");
while ($doc = $doctors->fetch_assoc()) {
  $doctorId = $doc["idDoctor"];

  // Check last scheduled end time for this doctor
  $stmt = $mysqli->prepare("SELECT MAX(EndTime) AS last_end FROM schedule WHERE DoctorID = ?");
  $stmt->bind_param("i", $doctorId);
  $stmt->execute();
  $stmt->bind_result($lastEnd);
  $stmt->fetch();
  $stmt->close();

  $availableFrom = strtotime($lastEnd ?? "now");
  $endTime = $availableFrom + ($duration * 60);

  if ($endTime <= $deadlineTime) {
    echo json_encode([
      "status" => "available",
      "doctor" => [
        "id" => $doctorId,
        "name" => $doc["DoctorName"]
      ],
      "start_time" => date("Y-m-d H:i:s", $availableFrom),
      "end_time" => date("Y-m-d H:i:s", $endTime)
    ]);
    exit;
  }
}

echo json_encode(["status" => "unavailable"]);
