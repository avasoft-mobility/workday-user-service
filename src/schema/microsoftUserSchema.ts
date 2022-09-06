import mongoose from "mongoose";
import MicrosoftUser from "../models/microsoftUser.model";

const microsoftUsers = new mongoose.Schema({
  userId: {
    type: String,
  },
  name: {
    type: String,
  },
  role: {
    type: String,
  },
  practice: {
    type: String,
  },
  mail: {
    type: String,
  },
  employeeId: {
    type: String,
  },
  reportings: {
    type: [String],
  },
  last_access: {
    type: Date,
    default: () => Date.now(),
  },
  managerId: {
    type: String,
  },
});

// collection name
export default mongoose.model<MicrosoftUser>("microsoftusers", microsoftUsers);
