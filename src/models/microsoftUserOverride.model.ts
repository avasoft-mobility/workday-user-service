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
}

interface PopulateMicrosoftUserOverride extends Base {
  toUserId: MicrosoftUser;
  reportees: MicrosoftUser[];
}

export { MicrosoftUserOverride, PopulateMicrosoftUserOverride };
