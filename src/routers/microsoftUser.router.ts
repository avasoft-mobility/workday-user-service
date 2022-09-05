import express, { Request, Response } from "express";
import microsoftUser from "../schema/microsoftUserSchema";
import leaderShip from "../schema/leaderShipSchema";
import { Rollbar } from "../helpers/Rollbar";
import moment from "moment";
import UserTodoStatistics from "../models/userTodoStatistics.model";
import Todo from "../models/todo.model";
import MyStats from "../models/myStats.model";
import TeamStats from "../models/teamStats.model";
import MicrosoftUser from "../models/microsoftUser.model";
import AttendanceModel from "../models/Attendance.model";
import { getMyTeamReport } from "../services/microsoftUser.service";

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
router.get("/:userId/statistics", (req: Request, res: Response) => {
  try {
    if (
      req.params["userid"] === null ||
      req.params["userid"] === "" ||
      req.params["userid"] === undefined
    ) {
      res.status(400).send({ message: "userid is required" });
      return;
    }
    const result = getStats(req.params["userid"]);
    return res.status(200).send(result);
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
    result.myStatistics = await getMyStatistics(userId);
    result.teamStatistics = await getTeamStatistics(userId);
    result.date = await getDateForStats();

    return result;
  } catch (err) {
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

var sendDay: string;
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

  var dateQuery = {
    date: intrestedDate.setHours(0, 0, 0, 0),
    microsoftUserId: userId,
  };
  // var tempCollection = await todos.find(dateQuery);
  var tempCollection = [
    {
      _id: "6311be4ab60386082665685e",
      microsoftUserId: "d12d68ea-b04f-4bd8-9124-becae7acb9b5",
      title:
        "e6de5d6e789ce0a58cd9ce998013a87e673319287e1c596a5899964883f7c78ce184e8089024",
      comments:
        "879f7d6d7898e0928bd1cecc9a15eb7c7c371b333014546f0cacc45080e6ccd8a4b6ee14c53b32bc10e8c11f3845c535da6e89a4239ba67117a0cd10d9a4d08e1d0b267f36e1b80a021160bedd0f207d93f53a1e9220f03020ae8d1f5e16cccf24d513ff518c3527c3ecea65cef9f503ad6237ea4eae2af57dca0f19d683809e05862462475c17f858f0ecce6a56fc6fc28df5907e884215726057d2ed71a12a5f4e20d5e1c9e2564fcdbddd",
      status: "Completed",
      type: "Planned",
      eta: 5,
      ata: 6,
      __v: 0,
    },
    {
      _id: "6311be7eb603860826656ed1",
      microsoftUserId: "d12d68ea-b04f-4bd8-9124-becae7acb9b5",
      title:
        "e9d05e6a759ab5948adac4cc8f5ab87c613306327e1b587c58a58b4488fe849ca4a1",
      comments:
        "879f677e7389a5c68294d08f9c13bb6b333c19347e11586d19a5c4438ce4c194aea7e0198b2066a31df38c7d3512fe3cd52b93b73e80b17157f89c10c2add4801c4a677d27e7a3101f1a64eadc15207d93ef72178f63fd3d63",
      status: "Completed",
      type: "Planned",
      eta: 1,
      ata: 1,
      __v: 0,
    },
    {
      _id: "6311bec6b6038608266576a7",
      microsoftUserId: "d12d68ea-b04f-4bd8-9124-becae7acb9b5",
      title:
        "e9d054693cdbe0b6b194f1899813ae68607a17283a5d74611cacc4749cf5c39db2a3e4138b27",
      comments: "879f62696a94a59186d08398861feb5c7c3e13663f13532e289b97",
      status: "Completed",
      type: "Planned",
      eta: 1,
      ata: 1,
      __v: 0,
    },
  ];
  // var attendance = await attendanceSchema.findOne({
  //   date: intrestedDate.setHours(0, 0, 0, 0),
  //   microsoftUserID: userId,
  // });
  var attendance = {
    _id: "631065ec85b15e6c2dafe5b7",
    microsoftUserID: "d12d68ea-b04f-4bd8-9124-becae7acb9b5",
    __v: 0,
    attendance_status: "Working",
  };
  sendDay = intrestedDate.toISOString();

  if (!attendance) {
    return 0;
  }
  if (
    attendance.attendance_status.includes("Leave") ||
    attendance.attendance_status === "Comp Off"
  ) {
    return 0;
  }
  tempCollection.forEach((item) => {
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
  let fromDate: Date = new Date();
  let toDate: Date = new Date();
  fromDate = moment().add("-7", "days").toDate();
  toDate = moment().add("-3", "days").toDate();
  var dateQuery = {
    $and: [
      { date: { $gte: new Date(fromDate.setHours(0, 0, 0, 0)) } },
      { date: { $lte: new Date(toDate.setHours(0, 0, 0, 0)) } },
      { microsoftUserId: { $eq: userId } },
    ],
  };
  // var tempCollection = await todos.find(dateQuery);4
  var tempCollection: any[] = [];

  // var attendance = await attendanceSchema.find({
  //   $and: [
  //     { date: { $gte: new Date(fromDate.setHours(0, 0, 0, 0)) } },
  //     { date: { $lte: new Date(toDate.setHours(0, 0, 0, 0)) } },
  //     { microsoftUserID: { $eq: userId } },
  //   ],
  // });
  var attendance: any[] = [];

  const presentAttendance = attendance
    .filter(
      (x) =>
        !x.attendance_status.includes("Leave") &&
        !(x.attendance_status === "Comp Off")
    )
    .map((x) => x.date.toString());

  let totalAta: number = 0;
  tempCollection.forEach((todo: Todo) => {
    if (presentAttendance.includes(todo.date.toString())) {
      totalAta = totalAta + todo.ata;
    }
  });

  if (!attendance) {
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

  // if (queryResult.reportings.length > 1) {
  //   const reportings = queryResult.reportings.remove(userId);
  //   for (const iterator of reportings) {
  //     const userAttendance = await attendanceSchema.findOne({
  //       date: new Date(intrestedDate.setHours(0, 0, 0, 0)),
  //       microsoftUserID: iterator,
  //     });
  //     if (!userAttendance) {
  //       continue;
  //     }

  //     if (
  //       userAttendance &&
  //       (userAttendance.attendance_status.includes("Leave") ||
  //         userAttendance.attendance_status === "Comp Off")
  //     ) {
  //       continue;
  //     }

  //     var tempCollection = await todos.find({
  //       microsoftUserId: iterator,
  //       date: intrestedDate.setHours(0, 0, 0, 0),
  //     });
  //     var tempCollection: Todo[] = [];
  //     tempCollection.forEach((element: Todo) => {
  //       totalAta = totalAta + element.ata;
  //     });
  //   }
  // }
  return totalAta;
};

const getTeamAverageWorkingHours = async (
  totalWorkingHours: number,
  userId: String
): Promise<string> => {
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

  var totalUsers = 0;
  const queryForReportings = (await microsoftUser.findOne({
    userId: userId,
  })) as MicrosoftUser;
  // for await (const iterator of queryForReportings.reportings) {
  //   if (iterator !== userId) {
  //     const userAttendance = await attendanceSchema.findOne({
  //       date: new Date(intrestedDate.setHours(0, 0, 0, 0)),
  //       microsoftUserID: iterator,
  //     });
  //     if (
  //       userAttendance &&
  //       !userAttendance.attendance_status.includes("Leave") &&
  //       !(userAttendance.attendance_status === "Comp Off")
  //     ) {
  //       totalUsers++;
  //     }
  //   }
  // }
  if (totalUsers == 0) {
    return "0";
  }

  const average = totalWorkingHours / totalUsers;
  if (average > 0) {
    average.toFixed(1);
  }
  return average.toFixed(2);
};

async function getDateForStats(): Promise<string> {
  return sendDay;
}
export { router as microsoftUserRouter };
