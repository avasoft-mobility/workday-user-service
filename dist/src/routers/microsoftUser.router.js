"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.microsoftUserRouter = void 0;
const express_1 = __importDefault(require("express"));
const microsoftUserSchema_1 = __importDefault(require("../schema/microsoftUserSchema"));
const Rollbar_1 = require("../helpers/Rollbar");
const router = express_1.default.Router();
exports.microsoftUserRouter = router;
router.get("/check", (req, res) => {
    return res.send("Users service is working fine");
});
// Get a specific user detail
router.get("/users/:userId", (req, res) => {
    try {
        const { userId } = req.params;
        if (userId === null || userId === "" || userId === undefined) {
            res.status(400).json({ message: "userId is required" });
            return;
        }
        getUserById(userId.toString()).then((result) => {
            res.status(200).json({ data: result });
        });
    }
    catch (error) {
        Rollbar_1.Rollbar.error(error, req);
        res.status(500).json({ message: error.message });
    }
});
// clone Reportings
router.get("/users/:userId/clone-reportings", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authorisedCloneReportingUsers = [
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
        var fromUserIdDResult = yield microsoftUserSchema_1.default.findOne(fromUserIdQuery);
        var toUserIdResult = yield microsoftUserSchema_1.default.findOne(toUserIdQuery);
        if (fromUserIdDResult.reportings.length <= 1) {
            res.status(400).json({
                message: "Reportings was not exists for the given fromUserId",
            });
        }
        var mergeResults = yield fromUserIdDResult.reportings.concat(toUserIdResult.reportings);
        const filteredReportings = mergeResults.filter((reportings, index) => mergeResults.indexOf(reportings) === index);
        const finalReportings = filteredReportings.filter((id) => id !== fromUserId);
        const response = yield microsoftUserSchema_1.default.findByIdAndUpdate(toUserIdResult._id, {
            reportings: finalReportings,
        });
        return res.status(200).json({ response: response });
    }
    catch (error) {
        res.status(500).json({ message: error });
    }
}));
// function to get a sepcific user detail
function getUserById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var queryResult = yield microsoftUserSchema_1.default.findOne({
                userId: id,
            });
            return queryResult;
        }
        catch (error) {
            return { message: error.message };
        }
    });
}
//# sourceMappingURL=microsoftUser.router.js.map