<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

$mysqli = new mysqli("localhost", "Group8Admin", "jobscheduler8", "hospitalscheduler");

if ($mysqli->connect_error) {
  echo json_encode(["status" => "error", "message" => "DB connection failed"]);
  exit;
}

$doctorId = intval($_GET['doctorId'] ?? 0);

if ($doctorId <= 0) {
  echo json_encode(["status" => "error", "message" => "Invalid doctor ID"]);
  exit;
}

$sql = "SELECT EndTime 
        FROM logs 
        WHERE idDoctor = ? 
        ORDER BY EndTime DESC 
        LIMIT 1";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param("i", $doctorId);
$stmt->execute();
$stmt->bind_result($latestEnd);

if ($stmt->fetch() && $latestEnd) {
  echo json_encode([
    "status" => "success",
    "latestEndDateTime" => $latestEnd
  ]);
} else {
  echo json_encode([
    "status" => "success",
    "latestEndDateTime" => null
  ]);
}

$stmt->close();
$mysqli->close();
