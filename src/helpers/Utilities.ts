import MicrosoftUser from "../models/microsoftUser.model";
import AlteredReporteeList from "../models/AlteredReporteeList.model";
import microsoftUsers from "../schema/microsoftUserSchema";

const alterReporteeList = async (
  toUserReporteeIds: string[],
  requestedReportees: MicrosoftUser[]
): Promise<AlteredReporteeList> => {
  const toUserReportees = await microsoftUsers.find({
    userId: { $in: toUserReporteeIds },
  });

  const existingReportees: MicrosoftUser[] = requestedReportees.filter(
    (requestedReportee: MicrosoftUser) => {
      return toUserReportees.find((toUserReportee: MicrosoftUser) => {
        return toUserReportee.userId === requestedReportee.userId;
      });
    }
  );

  const newReportees: MicrosoftUser[] = requestedReportees.filter(
    (requestedReportee: MicrosoftUser) => {
      return !toUserReportees.find((toUserReportee: MicrosoftUser) => {
        return toUserReportee.userId === requestedReportee.userId;
      });
    }
  );

  const removedReportees: MicrosoftUser[] = toUserReportees.filter(
    (toUserReportee: MicrosoftUser) => {
      return !requestedReportees.find((requestedReportee: MicrosoftUser) => {
        return toUserReportee.userId === requestedReportee.userId;
      });
    }
  );

  return {
    existingReportees: existingReportees,
    removedReportees: removedReportees,
    newReportees: newReportees,
  };
};

export default alterReporteeList;
