import AttendanceModel from "./Attendance.model";
import Todo from "./todo.model";


interface GraphViewUser {
  _id: string;
  userId: string;
  name: string;
  role: string;
  practice: string;
  mail: string;
  reportings: string[];
  reportingDetails?: GraphViewUser[];
  managerId: string;
  order?: number;
  last_access: string;
  todos?: Todo[];
  attendance?: AttendanceModel;
  __v: number;
}

export default GraphViewUser;
