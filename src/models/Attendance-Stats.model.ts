import Attendance from "./Attendance.model";

interface AttendanceStats {
  interestedDateAttendance: Attendance[];
  dateIntervalAttendances: Attendance[];
  reportingInterestedDateAttendances: Attendance[];
}

export default AttendanceStats;
