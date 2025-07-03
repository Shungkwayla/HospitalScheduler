<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$mysqli = new mysqli("localhost", "Group8Admin", "jobscheduler8", "hospitalscheduler");
if ($mysqli->connect_error) {
  http_response_code(500);
  echo json_encode(["status" => "error", "message" => "Database connection failed"]);
  exit;
}

$name         = $_POST['fullname'] ?? '';
$age          = intval($_POST['age'] ?? 0);
$sex          = $_POST['sex'] ?? '';
$allergies    = $_POST['allergies'] ?? '';
$chronic      = $_POST['illnesses'] ?? '';
$condition    = $_POST['condition'] ?? '';
$patientPhone = $_POST['mobile'] ?? '';
$ecName       = $_POST['contactName'] ?? '';
$ecPhone      = $_POST['contactNo'] ?? '';
$startTime    = $_POST['start_time'] ?? '';
$endTime      = $_POST['end_time'] ?? '';

if (!$name || !$condition || !$patientPhone || !$ecName || !$ecPhone || $age <= 0 || !$startTime || !$endTime) {
  echo json_encode(["status" => "error", "message" => "Missing or invalid input"]);
  exit;
}

$docSql = "SELECT idDoctor, DoctorName FROM doctor ORDER BY RAND() LIMIT 1";
$doc = $mysqli->query($docSql)->fetch_assoc();
if (!$doc) {
  echo json_encode(["status" => "no_doctor"]);
  exit;
}
$idDoctor = $doc['idDoctor'];
$docName = $doc['DoctorName'];

$patStmt = $mysqli->prepare(
  "INSERT INTO patient (PatientName, PatientAge, PatientAllergies, PatientChronicIll, PatientContactNo, ContactPerson, ContactPersonNo)
   VALUES (?, ?, ?, ?, ?, ?, ?)"
);
$patStmt->bind_param("sisssss", $name, $age, $allergies, $chronic, $patientPhone, $ecName, $ecPhone);
if (!$patStmt->execute()) {
  echo json_encode(["status" => "error", "message" => $patStmt->error]);
  exit;
}
$idPatient = $patStmt->insert_id;
$patStmt->close();


$now = new DateTime('now', new DateTimeZone('Asia/Manila'));
$dateLogged = $now->format('Y-m-d');
$timeLogged = $now->format('H:i:s');
$durationMinutes = intval($_POST['duration'] ?? 30);
$duration = "{$durationMinutes} mins";

$logStmt = $mysqli->prepare(
  "INSERT INTO logs (DateLogged, TimeLogged, idPatient, `Condition`, idDoctor, Duration, StartTime, EndTime)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
$logStmt->bind_param("ssisisss", $dateLogged, $timeLogged, $idPatient, $condition, $idDoctor, $duration, $startTime, $endTime);
if (!$logStmt->execute()) {
  echo json_encode(["status" => "error", "message" => $logStmt->error]);
  exit;
}
$logStmt->close();

$startTimeObj = new DateTime($startTime, new DateTimeZone('Asia/Manila'));
$endTimeObj = new DateTime($endTime, new DateTimeZone('Asia/Manila'));

echo json_encode([
  "status" => "success",
  "row" => [
    "TimeLogged" => $now->format("h:i A"),
    "PatientName" => $name,
    "Condition" => $condition,
    "DoctorName" => $docName,
    "Duration" => $duration,
    "StartTime" => $startTimeObj->format("h:i A"),
    "EndTime" => $endTimeObj->format("h:i A")
  ]
]);
?>
