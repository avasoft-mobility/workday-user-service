import MicrosoftUser from "./microsoftUser.model";

interface MicrosoftUserOverrideExchange {
  _id: string;
  toUserId: string;
  reportees: MicrosoftUser[];
  status: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export default MicrosoftUserOverrideExchange;
