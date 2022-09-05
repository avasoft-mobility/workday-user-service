import express, { Request, Response } from "express";
import LeaderShip from "../schema/leaderShipSchema";
import { Rollbar } from "../helpers/Rollbar";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (userId) {
      const result = await getLeaderShipByUserId(userId.toString());
      if (!result) {
        return res.status(400).send({
          message: "Couldn't find leadership details for this userId",
        });
      }
      return res.status(200).send(result);
    }
    const result = await getAllLeaderShip();
    return res.status(200).send(result);
  } catch (error) {
    Rollbar.error(error as unknown as Error, req);
    res.status(500).send({ message: (error as unknown as Error).message });
  }
});

const getLeaderShipByUserId = async (userId: string) => {
  var result = await LeaderShip.findOne({
    microsoftUserId: userId,
  });
  return result;
};

const getAllLeaderShip = async () => {
  var result = await LeaderShip.find();
  return result;
};

export { router as leaderShipRouter };
