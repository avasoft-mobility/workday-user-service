interface MicrosoftUserOverride {
  _id: string;
  toUserId: string;
  reportees: string[];
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

export default MicrosoftUserOverride;
