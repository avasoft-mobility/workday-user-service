import MicrosoftUser from "./microsoftUser.model";

interface AlteredReporteeList {
  existingReportees: MicrosoftUser[];
  removedReportees: MicrosoftUser[];
  newReportees: MicrosoftUser[];
}

export default AlteredReporteeList;
