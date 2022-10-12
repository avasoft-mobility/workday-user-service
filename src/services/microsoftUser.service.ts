import moment from "moment";
import { isValidObjectId } from "mongoose";
import LambdaClient from "../helpers/LambdaClient";
import { sendReporteesRequestMail } from "../helpers/SgMail";
import AttendanceModel from "../models/Attendance.model";
import MicrosoftUser from "../models/microsoftUser.model";
import {
  MicrosoftUserOverride,
  PopulateMicrosoftUserOverride,
} from "../models/microsoftUserOverride.model";
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
    userId: userId,
  });
  return response;
};

const getReporteeDetails = async (
  reporteesId: string[]
): Promise<MicrosoftUser[]> => {
  const response = await microsoftUsersSchema.find({
    userId: { $in: reporteesId },
  });

  return response;
};

const sendMailRequest = async (
  userId: string,
  migrationId: string,
  mailSubject: string,
  mailBody: string,
  mailType: string
) => {
  const getUserDetails = await getUserReportees(userId);
  let employeeDetails: MicrosoftUser[] = [];
  if (!getUserDetails) {
    return { code: 200, message: "User not available" };
  }

  if (getUserDetails) {
    //get reportee details of toUser
    employeeDetails = await getReporteeDetails(getUserDetails?.reportings);
  }

  if (employeeDetails) {
    const uniqueIds: string[] = [];
    const unique = employeeDetails.filter((element) => {
      const isDuplicate = getUserDetails.userId.includes(element.userId);

      if (!isDuplicate) {
        uniqueIds.push(element.userId);
        return true;
      }

      return false;
    });

    //mail to user
    const mailRequest = await sendReporteesRequestMail(
      "Hi " + getUserDetails?.name,
      mailType,
      mailSubject,
      migrationId,
      mailBody,
      unique,
      getUserDetails
    );
    
    if (mailRequest) {
      return mailRequest;
    }
  }
};

const alterCollection = async (): Promise<any> => {
  const params = new URLSearchParams();
  params.append("client_id", "d9aa0b7c-c26e-49e9-8c9e-dcbd94a17947");
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("client_secret", "dEr8Q~pqBvfbaFn7tUjSv6i_SP6_zMY4.vHZSdcX");
  params.append("grant_type", "client_credentials");

  const tokenResponse = await axios.post(
    "https://login.microsoftonline.com/716f83c3-7abd-42a1-86d2-e0207f4aa981/oauth2/v2.0/token",
    params
  );

  const config = {
    headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
  };

  const users = await microsoftUsersSchema.find();

  const result: any = [];
  for (const user of users) {
    let response: any;

    try {
      response = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${user.userId}?$select=displayName,employeeId&$expand=manager($select=id,displayName)`,
        config
      );

      result.push({
        userId: user.userId,
        name: user.name,
        role: user.role,
        practice: user.practice,
        mail: user.mail,
        managerId: response.data.manager ? response.data.manager.id : "Manager",
        employeeId: response.data.employeeId,
        reportings: user.reportings,
      });
    } catch (error: any) {
      console.log(error.response.config.url);
    }
  }

  const deleteManyResponse = await microsoftUsersSchema.deleteMany();

  if (deleteManyResponse) {
    const createResponse = await microsoftUsersSchema.create(result);
    return createResponse;
  }

  return { message: "Table drop error" };
};

const getMigration = async (
  migrationId: string
): Promise<{
  code: number;
  message?: string;
  body?: PopulateMicrosoftUserOverride;
}> => {
  if (!migrationId) {
    return { code: 400, message: "Migration Id is required" };
  }

  if (!isValidObjectId(migrationId)) {
    return { code: 400, message: "Migration Id is not valid" };
  }

  const result = await microsoftUserOverrideSchema.findOne({
    _id: Object(migrationId),
  });

  if (!result) {
    return {
      code: 404,
      message: `Migration detail not found for this MigrationId: ${migrationId}`,
    };
  }

  let reporteeIds = result.reportees;
  reporteeIds = reporteeIds.filter((id) => {
    return id !== result.toUserId;
  });

  const microsoftUsers = await microsoftUsersSchema.find({
    userId: { $in: reporteeIds },
  });

  const toUser = await microsoftUsersSchema.findOne({
    userId: result.toUserId,
  });

  const MicrosoftUserOverridePopulated = {
    _id: result._id,
    toUser: toUser as MicrosoftUser,
    reportees: microsoftUsers as MicrosoftUser[],
    status: result.status,
    mailRequestId: result.mailRequestId,
    acknowledgedBy: result.acknowledgedBy ? result.acknowledgedBy : undefined,
    acceptedBy: result.acceptedBy ? result.acceptedBy : undefined,
    rejectedBy: result.rejectedBy ? result.rejectedBy : undefined,
    isActive: result.isActive,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    __v: result.__v,
  };

  return {
    code: 200,
    body: MicrosoftUserOverridePopulated,
  };
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
  sendMailRequest,
  alterCollection,
  getMigration,
};
