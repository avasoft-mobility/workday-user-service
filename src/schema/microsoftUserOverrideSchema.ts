import mongoose from "mongoose";
import MicrosoftUserOverride from "../models/microsoftUserOverride.model";

const microsoftUsersOverrides = new mongoose.Schema({
  toUserId: {
    type: String,
  },
  reportees: {
    type: [String],
  },
  status: {
    type: String
  }
}, 
{
    timestamps: true
});

export default mongoose.model<MicrosoftUserOverride>("microsoftusersoverride", microsoftUsersOverrides);
