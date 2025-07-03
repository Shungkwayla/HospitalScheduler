<?php
// Show errors during dev
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Connect to DB
$mysqli = new mysqli("localhost", "Group8Admin", "jobscheduler8", "hospitalscheduler");
if ($mysqli->connect_error) {
  http_response_code(500);
  echo json_encode(["status" => "error", "message" => "Database connection failed"]);
  exit;
}

// Get POST data
$name           = $_POST['fullname'] ?? '';
$age            = intval($_POST['age'] ?? 0);
$sex            = $_POST['sex'] ?? '';
$allergies      = $_POST['allergies'] ?? '';
$chronic        = $_POST['illnesses'] ?? '';
$condition      = $_POST['condition'] ?? '';
$patientPhone   = $_POST['mobile'] ?? '';
$ecName         = $_POST['contactName'] ?? '';
$ecPhone        = $_POST['contactNo'] ?? '';
$startTime      = $_POST['start_time'] ?? '';
$endTime        = $_POST['end_time'] ?? '';
$idDoctor       = intval($_POST['idDoctor'] ?? 0);
$docName        = $_POST['DoctorName'] ?? '';
$durationMinutes = intval($_POST['duration'] ?? 30);
$duration       = "{$durationMinutes} mins";

// Validate input
if (!$name || !$condition || !$patientPhone || !$ecName || !$ecPhone || $age <= 0 || !$startTime || !$endTime || $idDoctor <= 0) {
  echo json_encode(["status" => "error", "message" => "Missing or invalid input"]);
  exit;
}

// Insert patient
$patStmt = $mysqli->prepare("
  INSERT INTO patient 
  (PatientName, PatientAge, PatientAllergies, PatientChronicIll, PatientContactNo, ContactPerson, ContactPersonNo) 
  VALUES (?, ?, ?, ?, ?, ?, ?)
");
if (!$patStmt) {
  echo json_encode(["status" => "error", "message" => "Prepare failed: " . $mysqli->error]);
  exit;
}
$patStmt->bind_param("sisssss", $name, $age, $allergies, $chronic, $patientPhone, $ecName, $ecPhone);
if (!$patStmt->execute()) {
  echo json_encode(["status" => "error", "message" => "Execute failed: " . $patStmt->error]);
  exit;
}
$idPatient = $patStmt->insert_id;
$patStmt->close();

// Insert logs
$now = new DateTime('now', new DateTimeZone('Asia/Manila'));
$dateLogged = $now->format('Y-m-d');
$timeLogged = $now->format('H:i:s');

$logStmt = $mysqli->prepare("
  INSERT INTO logs 
  (DateLogged, TimeLogged, idPatient, `Condition`, idDoctor, Duration, StartTime, EndTime)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");
if (!$logStmt) {
  echo json_encode(["status" => "error", "message" => "Prepare failed: " . $mysqli->error]);
  exit;
}
$logStmt->bind_param(
  "ssisisss",
  $dateLogged,
  $timeLogged,
  $idPatient,
  $condition,
  $idDoctor,
  $duration,
  $startTime,
  $endTime
);
if (!$logStmt->execute()) {
  echo json_encode(["status" => "error", "message" => "Execute failed: " . $logStmt->error]);
  exit;
}
$logStmt->close();

// Format for display
$startTimeObj = new DateTime($startTime, new DateTimeZone('Asia/Manila'));
$endTimeObj   = new DateTime($endTime, new DateTimeZone('Asia/Manila'));

// Return success
echo json_encode([
  "status" => "success",
  "row" => [
    "TimeLogged"   => $now->format("h:i A"),
    "PatientName"  => $name,
    "Condition"    => $condition,
    "DoctorName"   => $docName,
    "Duration"     => $duration,
    "StartTime"    => $startTimeObj->format("h:i A"),
    "EndTime"      => $endTimeObj->format("h:i A")
  ]
]);

$mysqli->close();
?>
