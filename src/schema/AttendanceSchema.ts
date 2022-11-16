import mongoose from "mongoose";
import Attendance from "../models/Attendance.model";

const attendanceSchema = new mongoose.Schema({
  microsoftUserID: {
    type: String,
    required: true,
  },
  attendance_status: String,
  date: {
    type: Date,
    immutable: true,
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
});

export default mongoose.model<Attendance>("attendances", attendanceSchema);
