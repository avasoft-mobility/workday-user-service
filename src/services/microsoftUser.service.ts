import moment from "moment";
import { isValidObjectId } from "mongoose";
import LambdaClient from "../helpers/LambdaClient";
import sendMigrationMail from "../helpers/SesMail";
import AttendanceModel from "../models/Attendance.model";
import MailResponse from "../models/MailResponse.model";
import MicrosoftUser from "../models/microsoftUser.model";
import AttendanceSchema from "../schema/AttendanceSchema";
import {
  MicrosoftUserOverride,
  PopulateMicrosoftUserOverride,
} from "../models/microsoftUserOverride.model";
import TeamReport from "../models/TeamReport.model";
import microsoftUserOverrideSchema from "../schema/microsoftUserOverrideSchema";
import microsoftUsersSchema from "../schema/microsoftUserSchema";
import alterReporteeList from "../helpers/Utilities";
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

  let reportingsDetail = await getMultipleMicrosoftUsers(
    currentUser.reportings
  );

  let reportingsAttendance = await AttendanceSchema.find({
    microsoftUserID: { $in: currentUser.reportings },
    date: new Date().setHours(0, 0, 0, 0),
  });

  reportingUsers = mapUsersWithAttendance(
    reportingsDetail,
    reportingsAttendance
  );

  let managerIds: string[] = [];

  reportingsDetail.map((targetUser) => {
    managerIds.push(targetUser.managerId);
  });

  let managerDetails = await getMultipleMicrosoftUsers(managerIds);

  reportingUsers = mapUsersWithReporterName(reportingUsers, managerDetails);

  return { code: 200, message: "success", body: reportingUsers };
};

const getMicrosoftUser = async (userId: string): Promise<TeamReport> => {
  const currentUser = (await microsoftUsersSchema.findOne({
    userId: userId,
  })) as TeamReport;
  return currentUser;
};

const getMultipleMicrosoftUsers = async (
  userIds: string[]
): Promise<TeamReport[]> => {
  let usersDetails = (await microsoftUsersSchema.find({
    userId: { $in: userIds },
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
  managerDetails: TeamReport[]
): TeamReport[] => {
  let response = reportingsDetail.map((targetUser) => {
    let managingUser = managerDetails.find(
      (singleManager) => singleManager.userId === targetUser.managerId
    );
    if (managingUser) {
      return { ...targetUser, ...{ reporter_name: managingUser.name } };
    }
    return { ...targetUser, ...{ reporter_name: "-" } };
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

  const reportees = await getReporteeDetails(reporteeIds);

  const toUser = await microsoftUsersSchema.findOne({
    userId: result.toUserId,
  });

  if (!toUser) {
    return {
      code: 404,
      message: `To User Not Exist`,
    };
  }

  //Remove to user Id from the reporting list
  result.previousReportees = result.previousReportees.filter(
    (reporteeId: string) => {
      return reporteeId !== toUser.userId;
    }
  );

  const alteredReporteeList = await alterReporteeList(
    result.previousReportees,
    reportees
  );

  const MicrosoftUserOverridePopulated = {
    _id: result._id,
    toUser: toUser as MicrosoftUser,
    existingReportees: alteredReporteeList.existingReportees as MicrosoftUser[],
    newReportees: alteredReporteeList.newReportees as MicrosoftUser[],
    removedReportees: alteredReporteeList.removedReportees as MicrosoftUser[],
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

const requestReporteesMigration = async (
  toUser: MicrosoftUser,
  requestReporteeIds: string[],
  origin: string
): Promise<{
  code: number;
  message?: string;
  body?: MicrosoftUserOverride;
}> => {
  if (!toUser) {
    return { code: 400, message: "To user is required" };
  }

  var reportees = await getReporteeDetails(requestReporteeIds);

  const toUserId = toUser.userId as string;
  const status = "requested";

  reportees = reportees.filter(
    (value, index, self) =>
      index === self.findIndex((t) => t.userId === value.userId)
  );
  reportees = reportees.filter((reportee) => {
    return reportee.userId !== toUserId;
  });

  let toUserReportees = toUser.reportings;
  toUserReportees = toUserReportees.filter((id) => {
    return id !== toUserId;
  });

  if (requestReporteeIds.sort().join("") === toUserReportees.sort().join("")) {
    return {
      code: 400,
      message:
        "Migration request failed due to requesting for the same reporting details",
    };
  }

  const result = await microsoftUserOverrideSchema.create({
    toUserId: toUserId,
    reportees: requestReporteeIds,
    previousReportees: toUserReportees,
    status: status,
  });

  if (!result) {
    return { code: 400, message: "Creating migration data failed" };
  }

  const practiceManager = await findPracticeManager(toUserId, toUser.practice);
  const directManager = await findDirectManager(toUser.managerId);
  if (!directManager) {
    return { code: 404, message: "Direct Manger not found" };
  }

  const greetings = "Hi Team";
  const mailType = "requested";
  const mailSubject = `Migration Request - [#${result._id}] - Requested`;
  const migrationId = result._id;
  const message = "Please find the below details for reportee migration.";
  const toMails = [];
  const ccMails = [];

  if (practiceManager) {
    practiceManager.mail.toLocaleLowerCase() !==
    directManager.mail.toLocaleLowerCase()
      ? ccMails.push(practiceManager.mail.toLocaleLowerCase())
      : null;
  }
  toMails.push(directManager.mail.toLocaleLowerCase());
  ccMails.push(toUser.mail.toLocaleLowerCase());
  ccMails.push("mobility@avasoft.com");

  const mailResponse: MailResponse = await sendMigrationMail(
    greetings,
    mailType,
    mailSubject,
    migrationId,
    message,
    reportees,
    toUser,
    ccMails,
    toMails,
    origin
  );

  if (!mailResponse) {
    return {
      code: 400,
      message: "There is a problem in sending mail",
    };
  }

  const updateMailRequestId =
    await microsoftUserOverrideSchema.findByIdAndUpdate(result._id, {
      mailRequestId: mailResponse.ResponseMetadata.RequestId,
    });

  if (!updateMailRequestId) {
    return {
      code: 400,
      message: "Mail request Id not updated successfully",
    };
  }

  return { code: 200, message: "Migration request successful" };
};

const updateAcknowledgementDetails = async (
  user: MicrosoftUser,
  migrationDetails: MicrosoftUserOverride,
  origin: string
): Promise<{
  code: number;
  message?: string;
  body?: MicrosoftUserOverride;
}> => {
  const response = await microsoftUserOverrideSchema.findByIdAndUpdate(
    migrationDetails._id,
    {
      status: "acknowledged",
      acknowledgedBy: user.name,
    }
  );

  const mailSubject = `Migration Request - [#${migrationDetails._id}] - Acknowledged`;
  const mailBody =
    "This request has been acknowledged by the manager, please accept this request.";
  const mailType = "acknowledged";
  const ccMailIds: string[] = [];

  const requestedUser: MicrosoftUser | null =
    await microsoftUsersSchema.findOne({
      userId: migrationDetails.toUserId,
    });

  if (!requestedUser) {
    return { code: 404, message: "Requested user not found" };
  }
  ccMailIds.push(requestedUser.mail.toLocaleLowerCase());

  const reporteeDetails = await getReporteeDetails(migrationDetails.reportees);
  const directManager = await findDirectManager(requestedUser.managerId);
  if (!directManager) {
    return {
      code: 400,
      message: "There is a no managerId for this requested person",
    };
  }
  ccMailIds.push(directManager.mail.toLocaleLowerCase());

  const userPracticeHead = await findPracticeManager(
    requestedUser.userId,
    user.practice
  );

  if (userPracticeHead) {
    userPracticeHead.mail.toLocaleLowerCase() !==
    directManager.mail.toLocaleLowerCase()
      ? ccMailIds.push(userPracticeHead.mail.toLocaleLowerCase())
      : null;
  }

  const mailRequest = await sendMigrationMail(
    "Hi Workday Team",
    mailType,
    mailSubject,
    migrationDetails._id,
    mailBody,
    reporteeDetails,
    requestedUser!,
    ccMailIds,
    ["mobility@avasoft.com"],
    origin
  );

  if (!mailRequest) {
    return {
      code: 400,
      message: "There is a problem in sending mail request",
    };
  }
  const result = await microsoftUserOverrideSchema.findByIdAndUpdate(
    migrationDetails._id,
    {
      mailRequestId: mailRequest.ResponseMetadata.RequestId,
    }
  );
  return {
    code: 200,
    message: "Your request has been Acknowledged.",
  };
};

const acceptMigrationRequest = async (
  userId: string,
  migrationId: string
): Promise<{
  code: number;
  message?: string;
  body?: PopulateMicrosoftUserOverride;
}> => {
  if (!userId) {
    return { code: 400, message: "User Id is required" };
  }

  const currentUser = await getUserById(userId);
  if (!currentUser) {
    return { code: 404, message: "User not found" };
  }

  if (!migrationId) {
    return { code: 400, message: "Migration Id is required" };
  }

  if (!isValidObjectId(migrationId)) {
    return { code: 400, message: "Migration Id is not valid" };
  }

  const result = await microsoftUserOverrideSchema.findOne({
    _id: migrationId,
  });

  if (!result) {
    return {
      code: 404,
      message: `Migration detail is not found for this Migration Id: ${migrationId}`,
    };
  }

  if (result.status === "accepted" && result.acceptedBy && result.isActive) {
    return {
      code: 400,
      message: `Migration already updated for this migration Id: ${migrationId}`,
    };
  }

  if (result.status !== "acknowledged") {
    return { code: 400, message: "Request has not acknowledged" };
  }

  const currentActiveMigration = await microsoftUserOverrideSchema.findOne({
    toUserId: result.toUserId,
    isActive: true,
  });

  if (currentActiveMigration) {
    await currentActiveMigration.updateOne({
      $set: {
        isActive: false,
      },
    });
  }

  const updateUserOverride = await microsoftUserOverrideSchema.findOneAndUpdate(
    { _id: migrationId },
    {
      $set: {
        status: "accepted",
        acceptedBy: currentUser.name,
        isActive: true,
      },
    }
  );

  if (!updateUserOverride) {
    return { code: 400, message: "Failed to accept request" };
  }

  let reporteeIds = result.reportees;
  reporteeIds = [...new Set(reporteeIds)];
  let reportees = await getReporteeDetails(reporteeIds);
  reporteeIds.push(result.toUserId);

  const migrationResult = await migrateReportees(result.toUserId, reporteeIds);
  if (!migrationResult) {
    return { code: 400, message: "Request accepted but failed to migrate" };
  }

  const toUser = await getUserById(result.toUserId);
  if (!toUser) {
    return { code: 404, message: "To user not found" };
  }

  const practiceManager = await findPracticeManager(
    toUser.userId,
    toUser.practice
  );
  const directManager = await findDirectManager(toUser.managerId);
  if (!directManager) {
    return { code: 404, message: "Direct Manger not found" };
  }

  const greetings = `Hi ${toUser.name}`;
  const mailType = "accepted";
  const mailSubject = `Migration Request - [#${migrationId}] - Accepted`;
  const message = "Your request has been accepted and reportees are updated.";
  const toMails = [];
  const ccMails = [];

  if (practiceManager) {
    practiceManager.mail.toLocaleLowerCase() !==
    directManager.mail.toLocaleLowerCase()
      ? ccMails.push(practiceManager.mail.toLocaleLowerCase())
      : null;
  }
  toMails.push(toUser.mail.toLocaleLowerCase());
  ccMails.push(directManager.mail.toLocaleLowerCase());
  ccMails.push("mobility@avasoft.com");

  const mailResponse = await sendMigrationMail(
    greetings,
    mailType,
    mailSubject,
    migrationId,
    message,
    reportees,
    toUser,
    ccMails,
    toMails
  );

  if (!mailResponse) {
    return {
      code: 400,
      message: "There is a problem in sending mail",
    };
  }

  const updateMailRequestId =
    await microsoftUserOverrideSchema.findByIdAndUpdate(result._id, {
      mailRequestId: mailResponse.ResponseMetadata.RequestId,
    });

  if (!updateMailRequestId) {
    return {
      code: 400,
      message: "Mail request Id not updated successfully",
    };
  }

  return {
    code: 200,
    message: "Your request has been accepted and reportees are updated.",
  };
};

const rejectMigrationRequest = async (
  userId: string,
  migrationId: string
): Promise<{
  code: number;
  message?: string;
  body?: PopulateMicrosoftUserOverride;
}> => {
  if (!userId) {
    return { code: 400, message: "User Id is required" };
  }

  const currentUser = await getUserById(userId);
  if (!currentUser) {
    return { code: 404, message: "User not found" };
  }

  if (!migrationId) {
    return { code: 400, message: "Migration Id is required" };
  }

  if (!isValidObjectId(migrationId)) {
    return { code: 400, message: "Migration Id is not valid" };
  }

  const result = await microsoftUserOverrideSchema.findOne({
    _id: migrationId,
  });

  if (!result) {
    return {
      code: 404,
      message: `Migration detail is not found for this Migration Id: ${migrationId}`,
    };
  }

  if (result.status === "rejected" && result.rejectedBy && !result.isActive) {
    return {
      code: 400,
      message: `Your migration request is already rejected`,
    };
  }

  if (result.status === "accepted") {
    return {
      code: 400,
      message:
        "Accepted migration cannot reject again. Please create a new request",
    };
  }

  const updateUserOverride = await microsoftUserOverrideSchema.findOneAndUpdate(
    { _id: migrationId },
    {
      $set: {
        status: "rejected",
        rejectedBy: currentUser.name,
      },
    }
  );

  if (!updateUserOverride) {
    return { code: 400, message: "Failed to reject request" };
  }

  let reporteeIds = result.reportees;
  reporteeIds = [...new Set(reporteeIds)];
  let reportees = await getReporteeDetails(reporteeIds);

  const toUser = await getUserById(result.toUserId);
  if (!toUser) {
    return { code: 404, message: "To user not found" };
  }

  const practiceManager = await findPracticeManager(
    toUser.userId,
    toUser.practice
  );
  const directManager = await findDirectManager(toUser.managerId);
  if (!directManager) {
    return { code: 404, message: "Direct Manger not found" };
  }

  const greetings = `Hi ${toUser.name}`;
  const mailType = "rejected";
  const mailSubject = `Migration Request - [#${migrationId}] - Rejected`;
  const message =
    "Your request for migration of reportees is rejected, please contact your manager for further details";
  const toMails = [];
  const ccMails = [];

  if (practiceManager) {
    practiceManager.mail.toLocaleLowerCase() !==
    directManager.mail.toLocaleLowerCase()
      ? ccMails.push(practiceManager.mail.toLocaleLowerCase())
      : null;
  }
  toMails.push(toUser.mail.toLocaleLowerCase());
  ccMails.push(directManager.mail.toLocaleLowerCase());
  ccMails.push("mobility@avasoft.com");

  const mailResponse = await sendMigrationMail(
    greetings,
    mailType,
    mailSubject,
    migrationId,
    message,
    reportees,
    toUser,
    ccMails,
    toMails
  );

  if (!mailResponse) {
    return {
      code: 400,
      message: "There is a problem in sending mail",
    };
  }

  const updateMailRequestId =
    await microsoftUserOverrideSchema.findByIdAndUpdate(result._id, {
      mailRequestId: mailResponse.ResponseMetadata.RequestId,
    });

  if (!updateMailRequestId) {
    return {
      code: 400,
      message: "Mail request Id not updated successfully",
    };
  }

  return {
    code: 200,
    message: "Your request has been rejected",
  };
};

const findPracticeManager = async (
  userId: string,
  userPractice: string
): Promise<MicrosoftUser> => {
  const result = await microsoftUsersSchema.findOne({
    reportings: userId,
    practice: userPractice,
    role: { $regex: /practice/i },
  });
  return result as MicrosoftUser;
};

const findDirectManager = async (managerId: string): Promise<MicrosoftUser> => {
  const result = await microsoftUsersSchema.findOne({ userId: managerId });
  return result as MicrosoftUser;
};

const getReporteeDetails = async (
  reporteesId: string[]
): Promise<MicrosoftUser[]> => {
  const response = await microsoftUsersSchema
    .find({
      userId: { $in: reporteesId },
    })
    .sort({
      name: 1,
    });

  return response;
};

const migrateReportees = async (
  toUserId: string,
  reportees: string[]
): Promise<MicrosoftUser> => {
  const response = await microsoftUsersSchema.findOneAndUpdate(
    { userId: toUserId },
    { $set: { reportings: reportees } }
  );

  return response as MicrosoftUser;
};

const getUserById = async (id: String): Promise<MicrosoftUser> => {
  const queryResult = await microsoftUsersSchema.findOne({
    userId: id,
  });
  return queryResult as MicrosoftUser;
};

export {
  getMyTeamReport,
  getAllUsers,
  getAllDomains,
  acceptMigrationRequest,
  rejectMigrationRequest,
  migrateReportees,
  getReporteeDetails,
  alterCollection,
  getMigration,
  requestReporteesMigration,
  updateAcknowledgementDetails,
  getMultipleMicrosoftUsers,
};
