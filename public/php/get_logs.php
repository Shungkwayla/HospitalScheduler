<?php
header('Content-Type: application/json');
date_default_timezone_set('Asia/Manila');

$mysqli = new mysqli("localhost", "Group8Admin", "jobscheduler8", "hospitalscheduler");
if ($mysqli->connect_error) {
  http_response_code(500);
  echo json_encode(["status"=>"error","message"=>"DB connect failed"]);
  exit;
}

$sql = "
SELECT
  l.TimeLogged,
  p.PatientName,
  l.`Condition`,
  d.DoctorName,
  l.Duration,
  l.StartTime,
  l.EndTime
FROM logs l
JOIN patient p  ON p.idPatient = l.idPatient
JOIN doctor  d  ON d.idDoctor  = l.idDoctor
WHERE l.DateLogged = CURDATE()
  AND l.EndTime    >= CURTIME()
ORDER BY l.TimeLogged
";

$res = $mysqli->query($sql);
$rows = [];
while ($row = $res->fetch_assoc()) {
  
  $row['TimeLogged'] = date("h:i A", strtotime($row['TimeLogged']));
  $row['StartTime']  = date("h:i A", strtotime($row['StartTime']));
  $row['EndTime']    = date("h:i A", strtotime($row['EndTime']));
  $rows[] = $row;
}

echo json_encode(["status"=>"success","logs"=>$rows]);
?>
