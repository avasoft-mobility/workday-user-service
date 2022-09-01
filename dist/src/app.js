"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const body_parser_1 = require("body-parser");
const serverless_http_1 = __importDefault(require("serverless-http"));
const microsoftUser_router_1 = require("./routers/microsoftUser.router");
const app = (0, express_1.default)();
app.use((0, body_parser_1.json)());
mongoose_1.default.connect("mongodb://localhost:27017/test");
mongoose_1.default.connection.on("error", (err) => {
    console.log("err", err);
});
mongoose_1.default.connection.on("connected", (err, res) => {
    console.log("mongoose is connected");
});
app.use("/users", microsoftUser_router_1.microsoftUserRouter);
app.get("/", (request, response) => {
    return response.send("Backend is fine");
});
if (process.env.LAMBDA !== "TRUE") {
    app.listen(3000, () => {
        console.log("Server is up");
    });
}
module.exports.lambdaHandler = (0, serverless_http_1.default)(app);
//# sourceMappingURL=app.js.map