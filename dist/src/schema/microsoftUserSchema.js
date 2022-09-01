"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const microsoftUser = new mongoose_1.default.Schema({
    userId: {
        type: String,
    },
    name: {
        type: String,
    },
    role: {
        type: String,
    },
    practice: {
        type: String,
    },
    mail: {
        type: String,
    },
    reportings: {
        type: [String],
    },
    last_access: {
        type: Date,
        default: () => Date.now(),
    },
    managerId: {
        type: String,
    },
});
// collection name
exports.default = mongoose_1.default.model("microsoftusers", microsoftUser);
//# sourceMappingURL=microsoftUserSchema.js.map