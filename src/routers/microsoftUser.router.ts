import express, { Request, Response } from "express";
import microsoftUser from "../schema/microsoftUserSchema";
import leaderShip from "../schema/leaderShipSchema";
import { Rollbar } from "../helpers/Rollbar";
import ErrorResponse from "../models/ErrorResponse.model";
import {
  graphReportingsValidation,
  exceptionalValidation,
} from "../services/microsoftUserService";

const router = express.Router();

// Get a specific user detail
router.get("/users/:userId", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId === null || userId === "" || userId === undefined) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    getUserById(userId.toString()).then((result) => {
      res.status(200).json({ data: result });
    });
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).json({ message: (error as unknown as Error).message });
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
        res.status(400).json({ message: "UserId doesn't exist" });
      }
      if (!fromUserId) {
        res.status(400).json({ message: "fromUserId doesn't exist" });
      }
      if (!toUserId) {
        res.status(400).json({ message: "touserId doesn't exist" });
      }
      if (userId) {
        if (!authorisedCloneReportingUsers.includes(userId.toString())) {
          res.status(401).json({ message: "Unauthorised userId" });
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
        res.status(400).json({
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
      return res.status(200).json({ response: response });
    } catch (error) {
      res.status(500).json({ message: error });
    }
  }
);

// function to get a sepcific user detail
async function getUserById(id: String) {
  try {
    var queryResult = await microsoftUser.findOne({
      userId: id,
    });
    return queryResult;
  } catch (error: any) {
    return { message: error.message };
  }
}

export { router as microsoftUserRouter };
