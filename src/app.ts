import express, { Request, Response } from "express";
import mongoose, { mongo } from "mongoose";
import * as path from "path";
import { json } from "body-parser";
import serverless from "serverless-http";
import runMiddleware from "run-middleware";
import dotenv from "dotenv";
import { microsoftUserRouter } from "./routers/microsoftUser.router";
const app = express();
runMiddleware(app);

app.use(json());

dotenv.config();

mongoose.connect(process.env.DB_STRING!);
mongoose.connection.on("error", (err) => {
  console.log("err", err);
});

mongoose.connection.on("connected", (err, res) => {
  console.log("mongoose is connected");
});

app.use("/users", microsoftUserRouter);

app.use(
  "/users/*/functions/UsersFunction/invocations",
  (req: Request, res: Response) => {
    const payload = JSON.parse(Buffer.from(req.body).toString());
    (app as any).runMiddleware(
      payload.path,
      {
        method: payload.httpMethod,
        body: payload.body,
        query: payload.queryParams,
      },
      function (code: any, data: any) {
        res.json(data);
      }
    );
  }
);

app.get("/", (request: Request, response: Response) => {
  return response.send("Backend is fine");
});

if (process.env.LAMBDA !== "TRUE") {
  app.listen(3000, () => {
    console.log("Server is up");
  });
}

module.exports.lambdaHandler = serverless(app);
