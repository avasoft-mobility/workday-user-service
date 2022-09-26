import moment from "moment";
import LambdaClient from "../helpers/LambdaClient";
import AttendanceModel from "../models/Attendance.model";
import MicrosoftUser from "../models/microsoftUser.model";
import MicrosoftUserOverride from "../models/microsoftUserOverride.model";
import TeamReport from "../models/TeamReport.model";
import microsoftUserOverrideSchema from "../schema/microsoftUserOverrideSchema";
import microsoftUsersSchema from "../schema/microsoftUserSchema";
const axios = require("axios");

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

  if (reportingsAttendance) {
    reportingUsers = mapUsersWithAttendance(
      reportingsDetail,
      reportingsAttendance
    );

    reportingUsers = mapUsersWithReporterName(reportingUsers, currentUser);
  }

  if (!reportingsAttendance) {
    reportingUsers = mapUsersWithReporterName(reportingsDetail, currentUser);
  }

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
      date: moment(new Date()).add(1).format("YYYY-MM-DD"),
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

const getAllUsers = async (): Promise<TeamReport[]> => {
  const allUsers = (await microsoftUsersSchema.find()) as TeamReport[];
  return allUsers;
};

const getAllDomains = async (): Promise<string[]> => {
  const allDomains = (await microsoftUsersSchema.distinct(
    "practice"
  )) as string[];
  return allDomains;
};

const requestReportees = async (
  userId: string,
  reportee: string[],
  requestStatus: string
): Promise<MicrosoftUserOverride> => {
  console.log(reportee);
  const requestedData = {
    toUserId: userId,
    reportees: reportee,
    status: requestStatus,
  };
  const response = await microsoftUserOverrideSchema.create(requestedData);
  return response;
};

const updateRequestStatus = async (
  migrationId: string,
  requestStatus: string
): Promise<MicrosoftUserOverride | null> => {
  const response = await microsoftUserOverrideSchema.findOneAndUpdate(
    { _id: migrationId },
    { $set: { status: requestStatus } }
  );

  return response;
};

const migrateReportees = async (
  toUserId: string,
  reportees: string[]
): Promise<MicrosoftUser | null> => {
  const response = await microsoftUsersSchema.findOneAndUpdate(
    { userId: toUserId },
    { $set: { reportings: reportees } }
  );
  return response;
};

const getUserReportees = async (
  userId: string
): Promise<MicrosoftUser | null> => {
  const response = await microsoftUsersSchema.findOne({
    userId:userId
  });
  return response;
};

const getReporteeDetails = async (
  reporteesId: string[]
): Promise<MicrosoftUser[] | null> => {
  const response = await microsoftUsersSchema.find({
    userId: { $in: reporteesId },
  });
  return response;
};

export {
  getMyTeamReport,
  getAllUsers, 
  getAllDomains ,
  requestReportees, 
  updateRequestStatus,
  migrateReportees,
  getUserReportees,
  getReporteeDetails,
};
