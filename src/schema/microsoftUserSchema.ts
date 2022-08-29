import mongoose from "mongoose";

const microsoftUser = new mongoose.Schema({
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
export default mongoose.model("microsoftusers", microsoftUser);