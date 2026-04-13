"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
var jsonwebtoken_1 = require("jsonwebtoken");
var JWT_SECRET = function () {
    return process.env.JWT_SECRET || 'qa-detective-super-secret-jwt-key-change-in-production';
};
function requireAuth(req, res, next) {
    var authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    var token = authHeader.slice(7);
    try {
        var payload = jsonwebtoken_1.default.verify(token, JWT_SECRET());
        req.userId = payload.userId;
        req.userEmail = payload.email;
        req.userName = payload.name;
        next();
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
function optionalAuth(req, _res, next) {
    var authHeader = req.headers.authorization;
    if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
        try {
            var payload = jsonwebtoken_1.default.verify(authHeader.slice(7), JWT_SECRET());
            req.userId = payload.userId;
            req.userEmail = payload.email;
            req.userName = payload.name;
        }
        catch (_a) {
            // Invalid token — continue as unauthenticated
        }
    }
    next();
}
