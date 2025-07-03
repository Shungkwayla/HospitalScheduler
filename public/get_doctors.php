<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$mysqli = new mysqli("localhost", "Group8Admin", "jobscheduler8", "hospitalscheduler");
if ($mysqli->connect_error) {
  echo json_encode(["status" => "error", "message" => "DB connection failed"]);
  exit;
}

$sql = "SELECT idDoctor, DoctorName, Specialization, AvailableDays, ShiftStart, ShiftEnd, Notes FROM doctor";
$res = $mysqli->query($sql);

$doctors = [];
while ($row = $res->fetch_assoc()) {
  $doctors[] = $row;
}

echo json_encode([
  "status" => "success",
  "doctors" => $doctors
]);
$mysqli->close();
