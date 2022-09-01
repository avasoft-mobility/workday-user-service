"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rollbar = void 0;
const rollbar_1 = __importDefault(require("rollbar"));
var rollbar = new rollbar_1.default({
    accessToken: "e84d1c74c2d04acaa09b157f35c098d9",
    captureUncaught: true,
    captureUnhandledRejections: true,
});
exports.Rollbar = rollbar;
//# sourceMappingURL=Rollbar.js.map