interface Attendance {
  _id?: string;
  userId?: string;
  microsoftUserID: string;
  date: Date;
  attendance_status: string;
  __v?: number;
}

export default Attendance;
