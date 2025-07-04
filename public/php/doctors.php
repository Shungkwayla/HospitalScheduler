<?php
header('Content-Type: application/json; charset=utf-8');

$mysqli = new mysqli("localhost","Group8Admin","jobscheduler8","hospitalscheduler");
if ($mysqli->connect_error) {
  echo json_encode(["status"=>"error","message"=>"DB connect failed"]);
  exit;
}

if ($_SERVER['REQUEST_METHOD']==='GET') {
  $rows=[];
  $res=$mysqli->query("SELECT * FROM doctor ORDER BY idDoctor DESC");
  while($r=$res->fetch_assoc()) $rows[]=$r;
  echo json_encode($rows); exit;
}

$act = $_POST['action'] ?? '';
function need($fields){
  foreach($fields as $f){ if(empty($_POST[$f])) die(json_encode(["status"=>"error","message"=>"Missing $f"])); }
}

if ($act==='insert'){
  need(['DoctorName','Specialization','AvailableDays','ShiftStart','ShiftEnd']);
  $stmt=$mysqli->prepare(
    "INSERT INTO doctor (DoctorName,Specialization,AvailableDays,ShiftStart,ShiftEnd)
     VALUES (?,?,?,?,?)");
  $stmt->bind_param("sssss",
    $_POST['DoctorName'],$_POST['Specialization'],$_POST['AvailableDays'],
    $_POST['ShiftStart'],$_POST['ShiftEnd']);
  echo json_encode(
    $stmt->execute()?["status"=>"success"]:["status"=>"error","message"=>$stmt->error]);
  $stmt->close(); exit;
}

if ($act==='update'){
  need(['idDoctor','DoctorName','Specialization','AvailableDays','ShiftStart','ShiftEnd']);
  $stmt=$mysqli->prepare(
    "UPDATE doctor SET DoctorName=?,Specialization=?,AvailableDays=?,ShiftStart=?,ShiftEnd=? WHERE idDoctor=?");
  $stmt->bind_param("sssssi",
    $_POST['DoctorName'],$_POST['Specialization'],$_POST['AvailableDays'],
    $_POST['ShiftStart'],$_POST['ShiftEnd'],$_POST['idDoctor']);
  echo json_encode(
    $stmt->execute()?["status"=>"success"]:["status"=>"error","message"=>$stmt->error]);
  $stmt->close(); exit;
}


if ($act==='delete'){
  need(['idDoctor']);
  $stmt=$mysqli->prepare("DELETE FROM doctor WHERE idDoctor=?");
  $stmt->bind_param("i",$_POST['idDoctor']);
  echo json_encode(
    $stmt->execute()?["status"=>"success"]:["status"=>"error","message"=>$stmt->error]);
  $stmt->close(); exit;
}

echo json_encode(["status"=>"error","message"=>"Invalid action"]);
