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
exports.initDb = initDb;
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.findUserByGoogleId = findUserByGoogleId;
exports.createUser = createUser;
exports.upsertGoogleUser = upsertGoogleUser;
var dotenv = require("dotenv");
var path_1 = require("path");
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../../../../.env') });
var pg_1 = require("pg");
var fs_1 = require("fs");
var path_2 = require("path");
var pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
function initDb() {
    return __awaiter(this, void 0, void 0, function () {
        var schema, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    schema = fs_1.default.readFileSync(path_2.default.join(__dirname, 'schema.sql'), 'utf-8');
                    return [4 /*yield*/, pool.query(schema)];
                case 1:
                    _a.sent();
                    console.log('🔐 Auth database initialised');
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.error('Error initializing database:', err_1);
                    throw err_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function findUserByEmail(email) {
    return __awaiter(this, void 0, void 0, function () {
        var resQuery, result, err_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    resQuery = 'SELECT * FROM users WHERE email = $1';
                    return [4 /*yield*/, pool.query(resQuery, [email])];
                case 1:
                    result = _b.sent();
                    return [2 /*return*/, (_a = result.rows[0]) !== null && _a !== void 0 ? _a : null];
                case 2:
                    err_2 = _b.sent();
                    console.error('Error finding user by email:', err_2);
                    throw err_2;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function findUserById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var resQuery, result, err_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    resQuery = 'SELECT * FROM users WHERE id = $1';
                    return [4 /*yield*/, pool.query(resQuery, [id])];
                case 1:
                    result = _b.sent();
                    return [2 /*return*/, (_a = result.rows[0]) !== null && _a !== void 0 ? _a : null];
                case 2:
                    err_3 = _b.sent();
                    console.error('Error finding user by ID:', err_3);
                    throw err_3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function findUserByGoogleId(googleId) {
    return __awaiter(this, void 0, void 0, function () {
        var resQuery, result, err_4;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    resQuery = 'SELECT * FROM users WHERE google_id = $1';
                    return [4 /*yield*/, pool.query(resQuery, [googleId])];
                case 1:
                    result = _b.sent();
                    return [2 /*return*/, (_a = result.rows[0]) !== null && _a !== void 0 ? _a : null];
                case 2:
                    err_4 = _b.sent();
                    console.error('Error finding user by Google ID:', err_4);
                    throw err_4;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function createUser(data) {
    return __awaiter(this, void 0, void 0, function () {
        var dbQuery, result, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    dbQuery = "INSERT INTO users (email, name, password_hash, google_id, avatar)\n        VALUES ($1, $2, $3, $4, $5) RETURNING *";
                    return [4 /*yield*/, pool.query(dbQuery, [
                            data.email,
                            data.name,
                            data.passwordHash,
                            data.googleId,
                            data.avatar
                        ])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows[0]];
                case 2:
                    err_5 = _a.sent();
                    console.error('Error creating user:', err_5);
                    throw err_5;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function upsertGoogleUser(data) {
    return __awaiter(this, void 0, void 0, function () {
        var dbQuery, result, err_6;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    dbQuery = "INSERT INTO users (email, name, google_id, avatar)\n                        VALUES ($1, $2, $3, $4)\n                        ON CONFLICT (email) DO UPDATE SET\n                        google_id= EXCLUDED.google_id,\n                        avatar = EXCLUDED.avatar,\n                        updated_at = NOW()\n                        RETURNING *";
                    return [4 /*yield*/, pool.query(dbQuery, [data.email, data.name, data.googleId, (_a = data.avatar) !== null && _a !== void 0 ? _a : null])];
                case 1:
                    result = _b.sent();
                    return [2 /*return*/, result.rows[0]];
                case 2:
                    err_6 = _b.sent();
                    console.error('Error upserting Google user:', err_6);
                    throw err_6;
                case 3: return [2 /*return*/];
            }
        });
    });
}
