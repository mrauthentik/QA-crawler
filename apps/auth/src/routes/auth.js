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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var index_1 = require("../db/index");
var password_1 = require("../services/password");
var token_1 = require("../services/token");
var token_2 = require("../services/token");
var router = (0, express_1.Router)();
// POST /auth/register
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, name_1, password, passwordError, existing, password_hash, user, token, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                _a = req.body, email = _a.email, name_1 = _a.name, password = _a.password;
                if (!email || !name_1 || !password) {
                    res.status(400).json({ error: 'Email, name and password are required' });
                    return [2 /*return*/];
                }
                passwordError = (0, password_1.validatePassword)(password);
                if (passwordError) {
                    res.status(400).json({ error: passwordError });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, index_1.findUserByEmail)(email.toLowerCase())];
            case 1:
                existing = _b.sent();
                if (existing) {
                    res.status(409).json({ error: 'An account with this email already exists' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, password_1.hashPassword)(password)];
            case 2:
                password_hash = _b.sent();
                return [4 /*yield*/, (0, index_1.createUser)({
                        email: email.toLowerCase(),
                        name: name_1,
                        passwordHash: password_hash,
                    })];
            case 3:
                user = _b.sent();
                token = (0, token_1.signToken)({ userId: user.id, email: user.email, name: user.name });
                res.status(201).json({
                    token: token,
                    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
                });
                return [3 /*break*/, 5];
            case 4:
                err_1 = _b.sent();
                console.error('Register error:', err_1);
                res.status(500).json({ error: 'Registration failed' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// POST /auth/login
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, valid, token, err_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, email = _a.email, password = _a.password;
                if (!email || !password) {
                    res.status(400).json({ error: 'Email and password are required' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, index_1.findUserByEmail)(email.toLowerCase())];
            case 1:
                user = _b.sent();
                if (!user || !user.password_hash) {
                    res.status(401).json({ error: 'Invalid email or password' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, password_1.verifyPassword)(password, user.password_hash)];
            case 2:
                valid = _b.sent();
                if (!valid) {
                    res.status(401).json({ error: 'Invalid email or password' });
                    return [2 /*return*/];
                }
                token = (0, token_1.signToken)({ userId: user.id, email: user.email, name: user.name });
                res.json({
                    token: token,
                    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
                });
                return [3 /*break*/, 4];
            case 3:
                err_2 = _b.sent();
                console.error('Login error:', err_2);
                res.status(500).json({ error: 'Login failed' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// GET /auth/me
router.get('/me', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, payload, user, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                authHeader = req.headers.authorization;
                if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                    res.status(401).json({ error: 'Missing authorization header' });
                    return [2 /*return*/];
                }
                token = authHeader.slice(7);
                payload = (0, token_2.verifyToken)(token);
                return [4 /*yield*/, (0, index_1.findUserById)(payload.userId)];
            case 1:
                user = _a.sent();
                if (!user) {
                    res.status(404).json({ error: 'User not found' });
                    return [2 /*return*/];
                }
                res.json({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
                return [3 /*break*/, 3];
            case 2:
                err_3 = _a.sent();
                res.status(401).json({ error: 'Invalid or expired token' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
