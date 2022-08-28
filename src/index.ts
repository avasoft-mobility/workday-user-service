import express, { Request, Response } from "express";
import mongoose, { mongo } from "mongoose";
import * as path from "path";
import { json } from "body-parser";

const app = express();

app.use(json());

mongoose.connect("mongodb://localhost:27017/test");
mongoose.connection.on("error", (err) => {
  console.log("err", err);
});
mongoose.connection.on("connected", (err, res) => {
  console.log("mongoose is connected");
});

app.get("/", (request: Request, response: Response) => {
  return response.send("Backend is fine");
});

app.listen(3000, () => {
  console.log("Server is up");
});
