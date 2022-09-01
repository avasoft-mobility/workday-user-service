"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const leadership = new mongoose_1.default.Schema({
    microsoftUserId: {
        type: String
    },
    name: {
        type: String
    },
    domain: {
        type: String
    },
    mail: {
        type: String
    },
    hrpoc: {
        type: String
    },
    hrmail: {
        type: (Array)
    },
});
// collection name
exports.default = mongoose_1.default.model("leaderships", leadership);
//# sourceMappingURL=leaderShipSchema.js.map