import MicrosoftUser from "./microsoftUser.model";

interface Base {
  _id: string;
  status: string;
  mailRequestId: string;
  acknowledgedBy?: string;
  acceptedBy?: string;
  rejectedBy?: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

interface MicrosoftUserOverride extends Base {
  toUserId: string;
  reportees: string[];
  removedReportees: string[];
}

interface PopulateMicrosoftUserOverride extends Base {
  toUser: MicrosoftUser;
  reportees: MicrosoftUser[];
  removedReportees: MicrosoftUser[];
}

export { MicrosoftUserOverride, PopulateMicrosoftUserOverride };
