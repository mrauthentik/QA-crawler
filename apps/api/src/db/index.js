"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initDb = initDb;
exports.createTestRun = createTestRun;
exports.updateTestRun = updateTestRun;
exports.saveTestResults = saveTestResults;
exports.saveRecommendations = saveRecommendations;
exports.getTestRun = getTestRun;
exports.getAllTestRuns = getAllTestRuns;
exports.saveFindings = saveFindings;
exports.deleteTestRun = deleteTestRun;
exports.toggleRunVisibility = toggleRunVisibility;
exports.saveCrawledPages = saveCrawledPages;
var pg_1 = require("pg");
var dotenv = require("dotenv");
var path_1 = require("path");
var path_2 = require("path");
var promises_1 = require("fs/promises");
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../../../.env') });
console.log('🔍 DATABASE_URL:', (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
function initDb() {
    return __awaiter(this, void 0, void 0, function () {
        var schema, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, promises_1.default.readFile(path_2.default.join(__dirname, 'schema.sql'), 'utf-8')];
                case 1:
                    schema = _a.sent();
                    return [4 /*yield*/, exports.pool.query(schema)];
                case 2:
                    _a.sent();
                    console.log('✅ Database initialised');
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.error('Error initializing database:', err_1);
                    throw err_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function createTestRun(url, description, userId, authEmail, authLoginUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.query("INSERT INTO test_runs (url, description, status, user_id, auth_email, auth_login_url)\n     VALUES ($1, $2, 'pending', $3, $4, $5) RETURNING id", [url, description, userId !== null && userId !== void 0 ? userId : null, authEmail !== null && authEmail !== void 0 ? authEmail : null, authLoginUrl !== null && authLoginUrl !== void 0 ? authLoginUrl : null])];
                case 1:
                    rows = (_a.sent()).rows;
                    return [2 /*return*/, rows[0].id];
            }
        });
    });
}
function updateTestRun(id, updates) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.query("UPDATE test_runs SET\n      status = $1,\n      score = $2,\n      grade = $3,\n      summary = $4,\n      completed_at = $5\n     WHERE id = $6", [updates.status, updates.score, updates.grade, updates.summary, updates.completedAt, id])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function saveTestResults(runId, results) {
    return __awaiter(this, void 0, void 0, function () {
        var client, _i, results_1, r, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 9, 11, 12]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 3:
                    _a.sent();
                    _i = 0, results_1 = results;
                    _a.label = 4;
                case 4:
                    if (!(_i < results_1.length)) return [3 /*break*/, 7];
                    r = results_1[_i];
                    return [4 /*yield*/, client.query("INSERT INTO test_results\n          (run_id, test_id, name, status, severity, message, duration, screenshot)\n         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [runId, r.test_id, r.name, r.status, r.severity, r.message, r.duration, r.screenshot])];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7: return [4 /*yield*/, client.query('COMMIT')];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 12];
                case 9:
                    err_2 = _a.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 10:
                    _a.sent();
                    throw err_2;
                case 11:
                    client.release();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function saveRecommendations(runId, recommendations) {
    return __awaiter(this, void 0, void 0, function () {
        var i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < recommendations.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, exports.pool.query("INSERT INTO recommendations (run_id, content, position)\n       VALUES ($1, $2, $3)", [runId, recommendations[i], i])];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getTestRun(id) {
    return __awaiter(this, void 0, void 0, function () {
        var rows, results, recs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.query('SELECT * FROM test_runs WHERE id = $1', [id])];
                case 1:
                    rows = (_a.sent()).rows;
                    if (rows.length === 0)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, exports.pool.query('SELECT * FROM test_results WHERE run_id = $1 ORDER BY created_at', [id])];
                case 2:
                    results = _a.sent();
                    return [4 /*yield*/, exports.pool.query('SELECT content FROM recommendations WHERE run_id = $1 ORDER BY position', [id])];
                case 3:
                    recs = _a.sent();
                    return [2 /*return*/, __assign(__assign({}, rows[0]), { results: results.rows, recommendations: recs.rows.map(function (r) { return r.content; }) })];
            }
        });
    });
}
function getAllTestRuns(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var rows_1, rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!userId) return [3 /*break*/, 2];
                    return [4 /*yield*/, exports.pool.query('SELECT * FROM test_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId])];
                case 1:
                    rows_1 = (_a.sent()).rows;
                    return [2 /*return*/, rows_1];
                case 2: return [4 /*yield*/, exports.pool.query('SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 50')];
                case 3:
                    rows = (_a.sent()).rows;
                    return [2 /*return*/, rows];
            }
        });
    });
}
function saveFindings(runId, findings) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.query("UPDATE test_runs SET findings = $1 WHERE id = $2", [JSON.stringify(findings), runId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function deleteTestRun(id) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.query('DELETE FROM test_runs WHERE id = $1 RETURNING id', [id])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rowCount !== null && result.rowCount > 0];
            }
        });
    });
}
function toggleRunVisibility(id, isPublic) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.query('UPDATE test_runs SET is_public = $1 WHERE id = $2 RETURNING id', [isPublic, id])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rowCount !== null && result.rowCount > 0];
            }
        });
    });
}
function saveCrawledPages(runId, pages) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.pool.query('UPDATE test_runs SET crawled_pages = $1 WHERE id = $2', [JSON.stringify(pages), runId])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
