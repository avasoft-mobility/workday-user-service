import express, { Request, Response } from "express";
import microsoftUser from "../schema/microsoftUserSchema";
import leaderShip from "../schema/leaderShipSchema";
import { Rollbar } from "../helpers/Rollbar";
import moment from "moment";
import UserTodoStatistics from "../models/userTodoStatistics.model";
import Todo from "../models/Todos.model";
import MyStats from "../models/myStats.model";
import TeamStats from "../models/teamStats.model";
import MicrosoftUser from "../models/microsoftUser.model";
import { getMyTeamReport } from "../services/microsoftUser.service";
import {
  graphReportingsValidation,
  exceptionalValidation,
  getGraphViewData,
} from "../services/users.services";
import LambdaClient from "../helpers/LambdaClient";
import Attendance from "../models/Attendance.model";

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
        targetUserId
      );
      
      res.status(validationResponse.code).json(response);
    } catch (error) {
      Rollbar.error(error as unknown as Error, req);
      res.status(500).json({ message: (error as unknown as Error).message });
    }
  }
);


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
    result.myStatistics = await getMyStatistics(userId);
    result.teamStatistics = await getTeamStatistics(userId);
    result.date = getDateForStats().toString();

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

const getMyStatistics = async (userId: string): Promise<MyStats> => {
  const result: MyStats = {
    myCurrentwrkgHrs: -1,
    myPreWekWrkngHrs: "-1",
  };
  result.myCurrentwrkgHrs = await getMyCurrentWorkingHours(userId);
  result.myPreWekWrkngHrs = await getPreviousWeekWorkingHours(userId);

  return result;
};

const getTeamStatistics = async (userId: string): Promise<TeamStats> => {
  const result: TeamStats = {
    totalReporters: -1,
    totalWorkingAta: -1,
    avgWorkingAta: "",
  };
  result.totalReporters = await getTeamTotalReportes(userId);
  result.totalWorkingAta = await getTeamTotalWorkingHours(userId);
  result.avgWorkingAta = await getTeamAverageWorkingHours(
    result.totalWorkingAta,
    userId
  );

  return result;
};

const getMyCurrentWorkingHours = async (userId: string): Promise<number> => {
  let totalAta = 0;

  let intrestedDate = getDateForStats();

  var query = {
    date: moment(intrestedDate).format("YYYY-MM-DD"),
    userId: userId,
  };

  console.log(
    "moment(intrestedDate).format()",
    moment(intrestedDate).format("YYYY-MM-DD")
  );

  const todoLambdaClient = new LambdaClient("Todos");
  const todos = (await todoLambdaClient.get(`/todos`, query)) as Todo[];

  console.log("intrestedDate.toISOString()", intrestedDate.toISOString());

  const attendanceLambdaClient = new LambdaClient("Attendance");
  const attendance = (await attendanceLambdaClient.get(`/attendance`, {
    object: "true",
    date: intrestedDate.toISOString(),
    userId: userId,
  })) as Attendance;

  console.log(attendance);

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

const getPreviousWeekWorkingHours = async (userId: string): Promise<string> => {
  let fromDate = moment().subtract(1, "weeks").startOf("week").toDate();
  let toDate = moment().subtract(1, "weeks").endOf("week").toDate();

  console.log("fromDate", fromDate);
  console.log("toDate", toDate);

  const todoLambdaClient = new LambdaClient("Todos");
  const todos = (await todoLambdaClient.get(`/todos`, {
    startDate: moment(new Date(fromDate.setHours(0, 0, 0, 0))).format(
      "YYYY-MM-DD"
    ),
    endDate: moment(new Date(toDate.setHours(0, 0, 0, 0))).format("YYYY-MM-DD"),
    userId: userId,
  })) as Todo[];

  console.log("Previous week todos", todos);

  const attendanceLambdaClient = new LambdaClient("Attendance");
  const attendances = (await attendanceLambdaClient.get(`/attendance`, {
    fromDate: moment(new Date(fromDate.setHours(0, 0, 0, 0))).format(
      "YYYY-MM-DD"
    ),
    toDate: moment(new Date(toDate.setHours(0, 0, 0, 0))).format("YYYY-MM-DD"),
    userId: userId,
    object: "true",
  })) as Attendance[];

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

const getTeamTotalReportes = async (userId: string): Promise<number> => {
  const queryResult = (await microsoftUser.findOne({
    userId: userId,
  })) as MicrosoftUser;
  var result: number;
  result =
    queryResult.reportings.length <= 1 ? 0 : queryResult.reportings.length - 1;
  return result;
};

const getTeamTotalWorkingHours = async (userId: string): Promise<number> => {
  let totalAta = 0;
  const queryResult: any = await microsoftUser.findOne({
    userId: userId,
  });

  let intrestedDate = getDateForStats();

  if (queryResult.reportings.length > 1) {
    const reportings = queryResult.reportings.remove(userId);
    for (const iterator of reportings) {
      const attendanceLambdaClient = new LambdaClient("Attendance");
      const userAttendance = (await attendanceLambdaClient.get(`/attendance`, {
        date: new Date(intrestedDate.setHours(0, 0, 0, 0)).toISOString(),
        userId: iterator,
        object: "true",
      })) as Attendance;

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

      const todoLambdaClient = new LambdaClient("Todos");
      const todos = (await todoLambdaClient.get(`/todos`, {
        userId: iterator,
        date: new Date(intrestedDate.setHours(0, 0, 0, 0)).toISOString(),
      })) as Todo[];

      todos.forEach((element: Todo) => {
        totalAta = totalAta + element.ata;
      });
    }
  }
  return totalAta;
};

const getTeamAverageWorkingHours = async (
  totalWorkingHours: number,
  userId: String
): Promise<string> => {
  let intrestedDate = getDateForStats();

  var totalUsers = 0;
  const queryForReportings = (await microsoftUser.findOne({
    userId: userId,
  })) as MicrosoftUser;
  for await (const iterator of queryForReportings.reportings) {
    if (iterator !== userId) {
      const attendanceLambdaClient = new LambdaClient("Attendance");
      const userAttendance = (await attendanceLambdaClient.get(`/attendance`, {
        date: new Date(intrestedDate.setHours(0, 0, 0, 0)).toISOString(),
        userId: iterator,
        object: "true",
      })) as Attendance;

      if (
        userAttendance &&
        !userAttendance.attendance_status.includes("Leave") &&
        !(userAttendance.attendance_status === "Comp Off")
      ) {
        totalUsers++;
      }
    }
  }
  if (totalUsers == 0) {
    return "0";
  }

  const average = totalWorkingHours / totalUsers;
  if (average > 0) {
    average.toFixed(1);
  }
  return average.toFixed(2);
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
export { router as microsoftUserRouter };
