import mongoose from "mongoose";
import {MicrosoftUserOverride} from "../models/microsoftUserOverride.model";

const microsoftUsersOverrides = new mongoose.Schema(
  {
    toUserId: {
      type: String,
      required: true,
    },
    reportees: {
      type: [String],
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    mailRequestId: {
      type: String,
      required: true,
    },
    acknowledgedBy: {
      type: String,
    },
    acceptedBy: {
      type: String,
    },
    rejectedBy: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<MicrosoftUserOverride>(
  "microsoftusersoverride",
  microsoftUsersOverrides
);
