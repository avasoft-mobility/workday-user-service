import axios from "axios";
import express, { Request, Response } from "express";
import moment from "moment";
import { isValidObjectId } from "mongoose";
import { migrate } from "../../migrate";
import LambdaClient from "../helpers/LambdaClient";
import { Rollbar } from "../helpers/Rollbar";
import AttendanceStats from "../models/Attendance-Stats.model";
import MicrosoftUser from "../models/microsoftUser.model";
import MyStats from "../models/myStats.model";
import TeamStats from "../models/teamStats.model";
import TodoStats from "../models/Todo-Stats.model";
import { Todo } from "../models/Todos.model";
import UserTodoStatistics from "../models/userTodoStatistics.model";
import microsoftUserOverrideSchema from "../schema/microsoftUserOverrideSchema";
import microsoftUser from "../schema/microsoftUserSchema";
import {
  acceptMigrationRequest,
  alterCollection,
  getAllDomains,
  getAllUsers,
  getMigration,
  getMultipleMicrosoftUsers,
  getMyTeamReport,
  rejectMigrationRequest,
  requestReporteesMigration,
  updateAcknowledgementDetails,
} from "../services/microsoftUser.service";
import {
  exceptionalValidation,
  getGraphViewData,
  graphReportingsValidation,
} from "../services/users.services";

const router = express.Router();

router.get("/check", (req, res) => {
  return res.send({ message: "Users Service is working fine" });
});

router.get("/todos", (req, res) => {
  return res.send({ message: "Todo Service is working fine" });
});

router.get("/mobile", (req, res) => {
  return res.send({ message: "Mobile Service is working fine" });
});

router.post("/attendance", (req, res) => {
  return res.send({ message: "Attendance Service is working fine" });
});

router.post("/migrate", async (req, res) => {
  const migrationDetails = req.body;

  await migrate(migrationDetails);

  return res.send({ message: "Migration done" });
});

router.post(
  "/remove-resources-reportings",
  async (req: Request, res: Response) => {
    try {
      const emailIds = req.body.emailIds as string[];

      const emailRegex = emailIds.map(function (email) {
        return new RegExp(email, "i");
      });

      const usersToRemove: MicrosoftUser[] = await microsoftUser.find({
        mail: { $in: emailRegex },
      });

      const idsToRemove: string[] = usersToRemove.map((user) => {
        return user.userId;
      });

      const users: MicrosoftUser[] = await microsoftUser.find({
        reportings: { $in: idsToRemove },
      });

      const filteredUsers: MicrosoftUser[] = users.filter((user) => {
        return !usersToRemove.find((userToRemove) => {
          return userToRemove.userId === user.userId;
        });
      });

      let result: any = [];
      for (const idToRemove of idsToRemove) {
        result = filteredUsers.map((user) => {
          user.reportings = user.reportings.filter((id: string) => {
            return idToRemove !== id;
          });
          return user;
        });
      }

      const updateResponse: any = [];
      for (const data of result) {
        const result = await microsoftUser.updateOne(
          {
            userId: data.userId,
          },
          {
            $set: {
              reportings: data.reportings,
            },
          }
        );
        updateResponse.push(result);
      }

      await Promise.all(updateResponse);
      res.status(200).json({ result: result, updateResponse: updateResponse });
    } catch {}
  }
);

//Get all users
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await getAllUsers();
    if (!result) {
      return res.status(400).send({ message: "No users found." });
    }
    if (result) {
      return res.status(200).send(result);
    }
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).send({ message: (error as unknown as Error).message });
  }
});

router.get("/admin-access-token", async (req: Request, res: Response) => {
  try {
    const body = {
      client_id: "d9aa0b7c-c26e-49e9-8c9e-dcbd94a17947",
      scope: "https://graph.microsoft.com/.default",
      client_secret: "dEr8Q~pqBvfbaFn7tUjSv6i_SP6_zMY4.vHZSdcX",
      grant_type: "client_credentials",
    };

    const params = new URLSearchParams();
    params.append("client_id", "d9aa0b7c-c26e-49e9-8c9e-dcbd94a17947");
    params.append("scope", "https://graph.microsoft.com/.default");
    params.append("client_secret", "dEr8Q~pqBvfbaFn7tUjSv6i_SP6_zMY4.vHZSdcX");
    params.append("grant_type", "client_credentials");

    const response = await axios.post(
      "https://login.microsoftonline.com/716f83c3-7abd-42a1-86d2-e0207f4aa981/oauth2/v2.0/token",
      params
    );
    return res.json(response.data);
  } catch (error) {
    return res
      .status(500)
      .send({ message: (error as unknown as Error).message });
  }
});

//Get All domains
router.get("/domains", async (req: Request, res: Response) => {
  try {
    const result = await getAllDomains();
    if (!result) {
      return res.status(400).send({ message: "No domains found." });
    }
    if (result) {
      return res.status(200).send(result);
    }
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).send({ message: (error as unknown as Error).message });
  }
});

router.get("/add-hive-properties", async (req: Request, res: Response) => {
  try {
    const response = await alterCollection();

    res.status(200).json(response);
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).json({ message: (error as unknown as Error).message });
  }
});

// Get a specific user detail
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId === null || userId === "" || userId === undefined) {
      res.status(400).send({ message: "userId is required" });
      return;
    }

    const result = await getUserById(userId.toString());
    if (!result) {
      return res
        .status(400)
        .send({ message: "User for the given userId was not found" });
    }
    if (result) {
      return res.status(200).send(result);
    }
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).send({ message: (error as unknown as Error).message });
  }
});

// Get a specific user detail
router.get("/:userId/managers", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId === null || userId === "" || userId === undefined) {
      res.status(400).send({ message: "userId is required" });
      return;
    }

    const result = await getUserById(userId.toString());
    if (!result) {
      return res
        .status(400)
        .send({ message: "User for the given userId was not found" });
    }

    const managers = await getManagerOfUser(userId.toString());
    return res.status(200).send(managers);
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).send({ message: (error as unknown as Error).message });
  }
});

// clone Reportings
router.get(
  "/users/:userId/clone-reportings",
  async (req: Request, res: Response) => {
    try {
      const authorisedCloneReportingUsers: string[] = [
        "d12d68ea-b04f-4bd8-9124-becae7acb9b5",
        "0d5fd023-dbba-4996-8752-52aa716e83a3",
        "4853e42e-0927-4daa-987a-a361c83fb6be",
        "1ffd7271-6822-43e2-a3a8-2bac5839f7a7",
        "781d5e17-5dff-48da-a84f-c9420c0ed957",
      ];

      const { fromUserId, toUserId } = req.query;
      const { userId } = req.params;

      if (!userId) {
        res.status(400).send({ message: "UserId doesn't exist" });
      }
      if (!fromUserId) {
        res.status(400).send({ message: "fromUserId doesn't exist" });
      }
      if (!toUserId) {
        res.status(400).send({ message: "touserId doesn't exist" });
      }
      if (userId) {
        if (!authorisedCloneReportingUsers.includes(userId.toString())) {
          res.status(401).send({ message: "Unauthorised userId" });
        }
      }

      var fromUserIdQuery = {
        userId: fromUserId,
      };
      var toUserIdQuery = {
        userId: toUserId,
      };

      var fromUserIdDResult: any = await microsoftUser.findOne(fromUserIdQuery);
      var toUserIdResult: any = await microsoftUser.findOne(toUserIdQuery);

      if (fromUserIdDResult.reportings.length <= 1) {
        res.status(400).send({
          message: "Reportings was not exists for the given fromUserId",
        });
      }

      var mergeResults = await fromUserIdDResult.reportings.concat(
        toUserIdResult.reportings
      );
      const filteredReportings = mergeResults.filter(
        (reportings: string, index: number) =>
          mergeResults.indexOf(reportings) === index
      );
      const finalReportings = filteredReportings.filter(
        (id: string) => id !== fromUserId
      );

      const response = await microsoftUser.findByIdAndUpdate(
        toUserIdResult._id,
        {
          reportings: finalReportings,
        }
      );
      return res.status(200).send(response);
    } catch (error) {
      res.status(500).send({ message: error });
    }
  }
);

// Get statistics for that user
router.get("/:userId/statistics", async (req: Request, res: Response) => {
  try {
    if (
      req.params["userId"] === null ||
      req.params["userId"] === "" ||
      req.params["userId"] === undefined
    ) {
      res.status(400).send({ message: "userId is required" });
      return;
    }
    const result = await getStats(req.params["userId"]);

    return res.status(200).send(result);
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).send({ message: (error as unknown as Error).message });
  }
});

router.get(
  "/:userId/graph-reportings/:targetUserId",
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId as string;
      const targetUserId = req.params.targetUserId as string;
      const date = req.query.date;

      const validationResponse = graphReportingsValidation(
        userId,
        targetUserId
      );

      if (validationResponse?.code === 400) {
        return res
          .status(validationResponse.code)
          .json({ message: validationResponse.message });
      }

      const loggedInUser = await microsoftUser.findOne({
        userId: userId,
      });

      if (!loggedInUser) {
        return res.status(404).send({ message: "user not found" });
      }

      const authorizationResponse = exceptionalValidation(loggedInUser);

      if (!authorizationResponse.hasAccess) {
        return res.status(authorizationResponse.code).json({
          message: "Access Denied",
        });
      }

      const response = await getGraphViewData(
        authorizationResponse.user,
        targetUserId,
        date as string
      );

      res.status(validationResponse.code).json(response);
    } catch (error) {
      Rollbar.error(error as unknown as Error, req);
      res.status(500).json({ message: (error as unknown as Error).message });
    }
  }
);

router.get(
  "/:userId/reportee-migration/:migrationId",
  async (req: Request, res: Response) => {
    try {
      //Below userId is not used currenlty It will be used for the future Authorization and Authentication purpose
      const userId = req.params.userId as string;
      const migrationId = req.params.migrationId as string;

      const response = await getMigration(migrationId);

      if (response.code === 200) {
        return res.status(response.code).json(response.body);
      }

      return res.status(response.code).json({ message: response.message });
    } catch (error) {
      Rollbar.error(error as unknown as Error, req);
      res.status(500).send({ message: (error as unknown as Error).message });
    }
  }
);

router.post(
  "/:userId/reportee-migration/request",
  async (req: Request, res: Response) => {
    try {
      //Below userId is not used currenlty It will be used for the future Authorization and Authentication purpose
      const userId = req.params.userId;
      const toUser = req.body.toUser;
      const requestReporteeIds = req.body.reportees;
      const origin: string | undefined = req.headers.origin;

      const response = await requestReporteesMigration(
        toUser,
        requestReporteeIds,
        origin!
      );
      if (response.code === 200) {
        return res.status(response.code).json({ message: response.message });
      }

      return res.status(response.code).json({ message: response.message });
    } catch (error) {
      Rollbar.error(error as unknown as Error, req);
      res.status(500).send({ message: (error as unknown as Error).message });
    }
  }
);

router.get(
  "/:userId/reportee-migration/:migrationId/acknowledge",
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const migrationId = req.params.migrationId;
      const origin: string | undefined = req.headers.origin;


      if (!isValidObjectId(migrationId)) {
        return res
          .status(400)
          .send({ message: "Migration Id is not a valid object Id" });
      }

      if (!userId) {
        return res.status(400).send({ message: "userId doesn't exist" });
      }

      if (!migrationId) {
        return res.status(400).send({ message: "migrationId doesn't exist" });
      }

      const users = await microsoftUser.findOne({ userId: userId });
      if (!users) {
        return res
          .status(400)
          .send({ message: "user doesn't exist for this userId" });
      }

      const migrationDetails = await microsoftUserOverrideSchema.findOne({
        _id: migrationId,
      });

      if (!migrationDetails) {
        return res.status(400).send({
          message: "migration Details doesn't exist for this migrationId",
        });
      }

      if (migrationDetails?.status === "acknowledged") {
        return res.status(400).send({
          message: "This migration has already in acknowledged status",
        });
      }

      if (
        migrationDetails?.status === "accepted" ||
        migrationDetails?.status === "rejected"
      ) {
        return res
          .status(400)
          .send({ message: "The migration should be in requested status" });
      }

      const result = await updateAcknowledgementDetails(
        users!,
        migrationDetails!,
        origin!
      );
      if (result) {
        return res.status(result.code).send({ message: result.message });
      }
    } catch (error) {
      Rollbar.error(error as unknown as Error, req);
      res.status(500).send({ message: (error as unknown as Error).message });
    }
  }
);

router.get(
  "/:userId/reportee-migration/:migrationId/accept",
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const migrationId = req.params.migrationId;

      const response = await acceptMigrationRequest(userId, migrationId);
      if (response.code === 200) {
        return res.status(response.code).send({ message: response.message });
      }

      return res.status(response.code).send({ message: response.message });
    } catch (error) {
      Rollbar.error(error as unknown as Error, req);
      res.status(500).send({ message: (error as unknown as Error).message });
    }
  }
);

router.get(
  "/:userId/reportee-migration/:migrationId/reject",
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const migrationId = req.params.migrationId;

      const response = await rejectMigrationRequest(userId, migrationId);
      if (response.code === 200) {
        return res.status(response.code).send({ message: response.message });
      }

      return res.status(response.code).send({ message: response.message });
    } catch (error) {
      Rollbar.error(error as unknown as Error, req);
      res.status(500).send({ message: (error as unknown as Error).message });
    }
  }
);

router.post("/multiple_users", async (req: Request, res: Response) => {
  try {
    const userIds = req.body.userIds;

    if (!userIds || (userIds as string[]).length === 0) {
      res.status(400).send({ message: "Atleast one userId is required" });
      return;
    }

    const result = await getMultipleMicrosoftUsers(userIds as string[]);
    if (result) {
      return res.status(200).send(result);
    }
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).send({ message: (error as unknown as Error).message });
  }
});

// function to get stats of user
async function getStats(userId: string): Promise<UserTodoStatistics> {
  try {
    const result: UserTodoStatistics = {
      myStatistics: {
        myCurrentwrkgHrs: -1,
        myPreWekWrkngHrs: "-1",
      },
      teamStatistics: {
        avgWorkingAta: "-1",
        totalReporters: -1,
        totalWorkingAta: -1,
      },
      date: "-1",
    };
    const interestedDate = getDateForStats();
    const [fromDate, toDate] = getPreviousWeekDateRange();
    const user = await microsoftUser.findOne({ userId: userId });

    if (!user) {
      return result;
    }

    const statsTodos = await getTodosForStats(
      userId,
      moment(interestedDate).format("YYYY-MM-DD"),
      moment(fromDate).format("YYYY-MM-DD"),
      moment(toDate).format("YYYY-MM-DD"),
      user.reportings
    );

    const statsAttendance = await getAttendanceForStats(
      userId,
      moment(interestedDate).format("YYYY-MM-DD"),
      moment(fromDate).format("YYYY-MM-DD"),
      moment(toDate).format("YYYY-MM-DD"),
      user.reportings
    );

    result.myStatistics = await getMyStatistics(
      userId,
      statsTodos,
      statsAttendance
    );
    result.teamStatistics = await getTeamStatistics(
      user,
      statsTodos,
      statsAttendance
    );
    result.date = interestedDate.toString();

    return result;
  } catch (err) {
    console.log(err);

    const result: UserTodoStatistics = {
      myStatistics: {
        myCurrentwrkgHrs: -1,
        myPreWekWrkngHrs: "-1",
      },
      teamStatistics: {
        avgWorkingAta: "-1",
        totalReporters: -1,
        totalWorkingAta: -1,
      },
      date: "-1",
    };
    return result;
  }
}

const getTodosForStats = async (
  userId: string,
  interestedDate: string,
  fromDate: string,
  toDate: string,
  reportings: string[]
): Promise<TodoStats> => {
  const lambdaClient = new LambdaClient("Todos");
  const response = (await lambdaClient.post(
    "/todos/stats",
    {
      userId: userId,
    },
    {
      interestedDate: interestedDate,
      startDate: fromDate,
      endDate: toDate,
      reportings: reportings,
    }
  )) as TodoStats;
  return response;
};

const getAttendanceForStats = async (
  userId: string,
  interestedDate: string,
  fromDate: string,
  toDate: string,
  reportings: string[]
): Promise<AttendanceStats> => {
  const lambdaClient = new LambdaClient("Attendance");
  const response = (await lambdaClient.post(
    "/attendance/stats",
    {
      userId: userId,
    },
    {
      interestedDate: interestedDate,
      startDate: fromDate,
      endDate: toDate,
      reportings: reportings,
    }
  )) as AttendanceStats;
  return response;
};

const getMyStatistics = async (
  userId: string,
  statsTodos: TodoStats,
  statsAttendance: AttendanceStats
): Promise<MyStats> => {
  const result: MyStats = {
    myCurrentwrkgHrs: -1,
    myPreWekWrkngHrs: "-1",
  };
  result.myCurrentwrkgHrs = await getMyCurrentWorkingHours(
    statsTodos,
    statsAttendance
  );
  result.myPreWekWrkngHrs = await getPreviousWeekWorkingHours(
    statsTodos,
    statsAttendance
  );

  return result;
};

const getTeamStatistics = async (
  user: MicrosoftUser,
  statsTodos: TodoStats,
  statsAttendance: AttendanceStats
): Promise<TeamStats> => {
  const result: TeamStats = {
    totalReporters: -1,
    totalWorkingAta: -1,
    avgWorkingAta: "",
  };

  result.totalReporters = await getTeamTotalReportes(user);

  const [totalWorkingHours, averageWorkingHours] =
    await getTeamTotalWorkingHours(user, statsTodos, statsAttendance);

  result.totalWorkingAta = totalWorkingHours;
  result.avgWorkingAta = averageWorkingHours;

  return result;
};

const getMyCurrentWorkingHours = async (
  statsTodos: TodoStats,
  statsAttendance: AttendanceStats
): Promise<number> => {
  let totalAta = 0;

  const todos = statsTodos.interestedDateTodo;
  const attendance =
    statsAttendance.interestedDateAttendance.length > 0
      ? statsAttendance.interestedDateAttendance[0]
      : null;

  if (!attendance) {
    return 0;
  }

  if (
    attendance.attendance_status.includes("Leave") ||
    attendance.attendance_status === "Comp Off"
  ) {
    return 0;
  }

  todos.forEach((item) => {
    totalAta = totalAta + item.ata;
  });
  return totalAta;
};

router.get("/:userId/my-team", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const response = await getMyTeamReport(userId as string);

    if (response.code !== 200) {
      return res
        .status(response.code)
        .json({ code: response.code, message: response.message });
    }

    return res.status(response.code).json(response.body);
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).json({ message: (error as unknown as Error).message });
  }
});
// function to get a sepcific user detail
async function getUserById(id: String): Promise<MicrosoftUser | null> {
  var queryResult = await microsoftUser.findOne({
    userId: id,
  });
  return queryResult;
}

async function getManagerOfUser(id: String): Promise<MicrosoftUser[]> {
  const managers = await microsoftUser.find({
    $and: [
      {
        reportings: {
          $elemMatch: { $eq: id },
        },
      },
      {
        userId: { $nin: [id] },
      },
    ],
  });
  return managers;
}

const getPreviousWeekWorkingHours = async (
  statsTodos: TodoStats,
  statsAttendance: AttendanceStats
): Promise<string> => {
  const todos = statsTodos.dateIntervalTodos;
  const attendances = statsAttendance.dateIntervalAttendances;

  console.log("attendances", attendances);

  const presentAttendance = attendances
    .filter(
      (x) =>
        !x.attendance_status.includes("Leave") &&
        !(x.attendance_status === "Comp Off")
    )
    .map((x) => x.date.toString());

  let totalAta: number = 0;
  todos.forEach((todo: Todo) => {
    if (presentAttendance.includes(todo.date.toString())) {
      totalAta = totalAta + todo.ata;
    }
  });

  if (!attendances) {
    return "0";
  }

  if (totalAta === 0 || presentAttendance.length === 0) {
    return "0";
  }

  return (totalAta / presentAttendance.length).toFixed(2);
};

const getTeamTotalReportes = async (user: MicrosoftUser): Promise<number> => {
  var result: number;
  result = user.reportings.length <= 1 ? 0 : user.reportings.length - 1;
  return result;
};

const getTeamTotalWorkingHours = async (
  user: MicrosoftUser,
  statsTodos: TodoStats,
  statsAttendance: AttendanceStats
): Promise<[number, string]> => {
  let totalAta = 0;
  let totalUsers = 0;

  if (user.reportings.length > 1) {
    const reportings = user.reportings.filter((x) => x !== user.userId);
    console.log(reportings);

    for (const iterator of reportings) {
      const userAttendance =
        statsAttendance.reportingInterestedDateAttendances.find(
          (x) => x.microsoftUserID === iterator
        );
      if (!userAttendance) {
        continue;
      }

      if (
        userAttendance &&
        (userAttendance.attendance_status.includes("Leave") ||
          userAttendance.attendance_status === "Comp Off")
      ) {
        continue;
      }

      totalUsers++;

      const todos = statsTodos.reportingsInterestedDateTodos.filter(
        (x) => x.microsoftUserId === iterator
      );
      todos.forEach((element: Todo) => {
        totalAta = totalAta + element.ata;
      });
    }
  }

  if (totalUsers === 0) {
    return [totalAta, "0"];
  }

  const average = totalAta / totalUsers;

  console.log("totalAta", totalAta);
  console.log("totalUsers", totalUsers);

  if (average > 0) {
    return [totalAta, average.toFixed(1)];
  }

  return [totalAta, average.toFixed(2)];
};

const getDateForStats = (): Date => {
  let intrestedDate = new Date();
  if (new Date().getHours() >= 14) {
    intrestedDate = moment().add("-1", "days").toDate();
  } else {
    intrestedDate = moment().add("-2", "days").toDate();
  }

  if (intrestedDate.getDay() === 0) {
    intrestedDate = moment(intrestedDate).add("-2", "days").toDate();
  }
  if (intrestedDate.getDay() === 6) {
    intrestedDate = moment(intrestedDate).add("-1", "days").toDate();
  }

  return intrestedDate;
};

const getPreviousWeekDateRange = (): Date[] => {
  let fromDate = moment().subtract(1, "weeks").startOf("week").toDate();
  let toDate = moment().subtract(1, "weeks").endOf("week").toDate();
  return [fromDate, toDate];
};
export { router as microsoftUserRouter };
