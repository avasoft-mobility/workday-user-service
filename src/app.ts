import express, { Request, Response } from "express";
import mongoose, { mongo } from "mongoose";
import * as path from "path";
import { json } from "body-parser";
import serverless from "serverless-http";
import runMiddleware from "run-middleware";
import dotenv from "dotenv";
import cors from "cors";
import { microsoftUserRouter } from "./routers/microsoftUser.router";
import { conn } from "./dbconnection/dbconnect";
const app = express();
runMiddleware(app);

app.use(json());

dotenv.config();

app.use(cors());

app.use("/users", microsoftUserRouter);

const functionNames = JSON.parse(process.env.LAMBDA_FUNCTION_NAMES!);
app.use(
  `/users/*/functions/${functionNames.USERS}/invocations`,
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
        res.status(code).json(data);
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

const serverlessApp = serverless(app);
module.exports.lambdaHandler = async function (event: any, context: any) {
  context.callbackWaitsForEmptyEventLoop = false;
  conn;
  return serverlessApp(event, context);
};