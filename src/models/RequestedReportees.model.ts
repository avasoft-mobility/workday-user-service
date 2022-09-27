import MicrosoftUser from "./microsoftUser.model";

interface RequestedReportees {
  toUser: MicrosoftUser;
  reportees: MicrosoftUser[];
}

export default RequestedReportees;
