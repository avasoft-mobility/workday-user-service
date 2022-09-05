import LambdaClient from "../helpers/LambdaClient";
import AttendanceModel from "../models/Attendance.model";
import TeamReport from "../models/TeamReport.model";
import microsoftUsersSchema from "../schema/microsoftUserSchema";

interface Response {
  code: number;
  message: string;
  body: TeamReport[];
}

const getMyTeamReport = async (userId: string): Promise<Response> => {
  let reportingUsers: TeamReport[] = [];
  if (!userId) {
    return { code: 400, message: "UserId is required", body: [] };
  }

  let currentUser = await getMicrosoftUser(userId);

  if (!currentUser) {
    return { code: 404, message: "User not found", body: [] };
  }

  currentUser.reportings = currentUser?.reportings?.filter(
    (reportingId) => reportingId !== currentUser.userId
  );

  let reportingsDetail = await getMultipleMicrosoftUser(currentUser.reportings);
  let reportingsAttendance = await getMicrosoftUsersAttendance(
    currentUser.reportings
  );

  console.log("reportingsAttendance", reportingsAttendance);

  reportingUsers = mapUsersWithAttendance(
    reportingsDetail,
    reportingsAttendance
  );
  reportingUsers = mapUsersWithReporterName(reportingUsers, currentUser);

  return { code: 200, message: "success", body: reportingUsers };
};

const getMicrosoftUser = async (userId: string): Promise<TeamReport> => {
  const currentUser = (await microsoftUsersSchema.findOne({
    userId: userId,
  })) as TeamReport;
  return currentUser;
};

const getMultipleMicrosoftUser = async (
  usersId: string[]
): Promise<TeamReport[]> => {
  let usersDetails = (await microsoftUsersSchema.find({
    userId: { $in: usersId },
  })) as TeamReport[];

  usersDetails = usersDetails.map((x: any) => x._doc);

  return usersDetails;
};

const getMicrosoftUsersAttendance = async (
  usersId: string[]
): Promise<AttendanceModel[]> => {
  const lambdaClient = new LambdaClient("Attendance");
  const usersAttendance = await lambdaClient.post(
    `/attendance/bulk-retrieve`,
    undefined,
    {
      userIds: usersId,
      date: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    }
  );
  return usersAttendance;
};

const mapUsersWithAttendance = (
  reportingsDetail: TeamReport[],
  reportingsAttendance: AttendanceModel[]
): TeamReport[] => {
  let response = reportingsDetail.map((reportingDetail) => {
    let result = reportingsAttendance.find(
      (reportingAttendance) =>
        reportingAttendance.microsoftUserID === reportingDetail.userId
    );

    if (result !== undefined) {
      return {
        ...reportingDetail,
        ...{ attendanceStatus: result.attendance_status },
      };
    }
    return { ...reportingDetail, ...{ attendanceStatus: "Not Filled" } };
  });

  return response;
};

const mapUsersWithReporterName = (
  reportingsDetail: TeamReport[],
  currentUser: TeamReport
): TeamReport[] => {
  let response = reportingsDetail.map((targetUser) => {
    let managingUser = reportingsDetail.find(
      (managingUser) => managingUser.userId === targetUser.managerId
    );

    if (managingUser) {
      return { ...targetUser, ...{ reporter_name: managingUser.name } };
    }
    return { ...targetUser, ...{ reporter_name: currentUser.name } };
  });

  return response;
};

export { getMyTeamReport };
