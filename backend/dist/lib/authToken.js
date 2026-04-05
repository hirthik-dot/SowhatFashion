"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminRequest = isAdminRequest;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function isAdminRequest(req) {
    const token = req.cookies?.token;
    if (!token || !process.env.JWT_SECRET)
        return false;
    try {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=authToken.js.map