import express, { Request, Response } from "express";
import microsoftUser from "../schema/microsoftUserSchema";
import leaderShip from "../schema/leaderShipSchema";
import { Rollbar } from "../helpers/Rollbar";

const router = express.Router();

// Get a specific user detail
router.get("/", (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

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
