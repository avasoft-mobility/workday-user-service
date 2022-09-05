interface TeamReport {
  _id: string;
  userId: string;
  name: string;
  role: string;
  practice: string;
  mail: string;
  employeeId: string;
  reportings: string[];
  managerId: string;
  last_access: string;
  __v: 0;
  attendanceStatus: string;
  reporter_name: string;
}

export default TeamReport;
