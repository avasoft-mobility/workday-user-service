import MicrosoftUser from "./microsoftUser.model";

interface ModifiedReporteeList {
  existingReportees: MicrosoftUser[];
  removedReportees: MicrosoftUser[];
  newReportees: MicrosoftUser[];
}

export default ModifiedReporteeList;
