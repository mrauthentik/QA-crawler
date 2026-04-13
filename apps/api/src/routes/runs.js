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
var bullmq_1 = require("bullmq");
var index_1 = require("../db/index");
var auth_1 = require("../middleware/auth");
var rateLimit_1 = require("../middleware/rateLimit");
var router = (0, express_1.Router)();
function getRedisConnection() {
    if (process.env.REDIS_URL) {
        return { url: process.env.REDIS_URL };
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    };
}
var connection = getRedisConnection();
var pipelineQueue = new bullmq_1.Queue('pipeline', { connection: connection });
// ─── POST /api/runs ───────────────────────────────────────────────────────────
router.post('/', rateLimit_1.runCreationLimiter, auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, url, description, authEmail, authPassword, authLoginUrl, runId, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, url = _a.url, description = _a.description, authEmail = _a.authEmail, authPassword = _a.authPassword, authLoginUrl = _a.authLoginUrl;
                if (!url || !description) {
                    return [2 /*return*/, res.status(400).json({ error: 'Both url and description are required' })];
                }
                try {
                    new URL(url);
                }
                catch (_c) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid URL format' })];
                }
                return [4 /*yield*/, (0, index_1.createTestRun)(url, description, req.userId, authEmail, authLoginUrl)];
            case 1:
                runId = _b.sent();
                return [4 /*yield*/, pipelineQueue.add('run-pipeline', { runId: runId, url: url, description: description, authEmail: authEmail, authPassword: authPassword, authLoginUrl: authLoginUrl }, { attempts: 2, backoff: { type: 'exponential', delay: 5000 } })];
            case 2:
                _b.sent();
                console.log("\uD83D\uDCE5 New run queued: ".concat(runId, " for ").concat(url, " by user ").concat(req.userId));
                return [2 /*return*/, res.status(202).json({
                        message: 'Test run queued successfully',
                        runId: runId,
                        status: 'pending',
                        pollUrl: "/api/runs/".concat(runId),
                    })];
            case 3:
                err_1 = _b.sent();
                console.error('Error creating run:', err_1);
                return [2 /*return*/, res.status(500).json({ error: 'Failed to create test run' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ─── GET /api/runs ────────────────────────────────────────────────────────────
router.get('/', auth_1.optionalAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var runs, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, index_1.getAllTestRuns)(req.userId)];
            case 1:
                runs = _a.sent();
                return [2 /*return*/, res.json({ runs: runs })];
            case 2:
                err_2 = _a.sent();
                console.error('Error fetching runs:', err_2);
                return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch runs' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ─── GET /api/runs/:id ────────────────────────────────────────────────────────
router.get('/:id', auth_1.optionalAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var run, isOwner, err_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, index_1.getTestRun)(req.params.id)];
            case 1:
                run = _a.sent();
                if (!run)
                    return [2 /*return*/, res.status(404).json({ error: 'Run not found' })];
                isOwner = req.userId && req.userId === run.user_id;
                // Private run — only owner can view
                if (!run.is_public && !isOwner) {
                    return [2 /*return*/, res.status(403).json({
                            error: 'This investigation is private',
                            code: 'PRIVATE_RUN',
                        })];
                }
                return [2 /*return*/, res.json({ run: run, isOwner: !!isOwner })];
            case 2:
                err_3 = _a.sent();
                console.error('Error fetching run:', err_3);
                return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch run' })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ─── PATCH /api/runs/:id/visibility ──────────────────────────────────────────
router.patch('/:id/visibility', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var isPublic, run, err_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                isPublic = req.body.isPublic;
                if (typeof isPublic !== 'boolean') {
                    return [2 /*return*/, res.status(400).json({ error: 'isPublic must be a boolean' })];
                }
                return [4 /*yield*/, (0, index_1.getTestRun)(req.params.id)];
            case 1:
                run = _a.sent();
                if (!run)
                    return [2 /*return*/, res.status(404).json({ error: 'Run not found' })];
                if (run.user_id !== req.userId) {
                    return [2 /*return*/, res.status(403).json({ error: 'You do not have permission to update this run' })];
                }
                return [4 /*yield*/, (0, index_1.toggleRunVisibility)(req.params.id, isPublic)];
            case 2:
                _a.sent();
                console.log("\uD83D\uDD12 Run ".concat(req.params.id, " set to ").concat(isPublic ? 'public' : 'private', " by ").concat(req.userId));
                return [2 /*return*/, res.json({
                        message: "Run is now ".concat(isPublic ? 'public' : 'private'),
                        isPublic: isPublic,
                    })];
            case 3:
                err_4 = _a.sent();
                console.error('Error updating visibility:', err_4);
                return [2 /*return*/, res.status(500).json({ error: 'Failed to update visibility' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ─── DELETE /api/runs/:id ─────────────────────────────────────────────────────
router.delete('/:id', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var run, deleted, err_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, index_1.getTestRun)(req.params.id)];
            case 1:
                run = _a.sent();
                if (!run)
                    return [2 /*return*/, res.status(404).json({ error: 'Run not found' })];
                if (run.user_id && run.user_id !== req.userId) {
                    return [2 /*return*/, res.status(403).json({ error: 'You do not have permission to delete this run' })];
                }
                return [4 /*yield*/, (0, index_1.deleteTestRun)(req.params.id)];
            case 2:
                deleted = _a.sent();
                if (!deleted)
                    return [2 /*return*/, res.status(404).json({ error: 'Run not found' })];
                console.log("\uD83D\uDDD1  Run deleted: ".concat(req.params.id, " by user ").concat(req.userId));
                return [2 /*return*/, res.json({ message: 'Run deleted successfully' })];
            case 3:
                err_5 = _a.sent();
                console.error('Error deleting run:', err_5);
                return [2 /*return*/, res.status(500).json({ error: 'Failed to delete run' })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ─── POST /api/runs/:id/rerun ─────────────────────────────────────────────────
router.post('/:id/rerun', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var original, newRunId, err_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, (0, index_1.getTestRun)(req.params.id)];
            case 1:
                original = _a.sent();
                if (!original)
                    return [2 /*return*/, res.status(404).json({ error: 'Run not found' })];
                if (original.user_id && original.user_id !== req.userId) {
                    return [2 /*return*/, res.status(403).json({ error: 'You do not have permission to re-run this investigation' })];
                }
                return [4 /*yield*/, (0, index_1.createTestRun)(original.url, original.description, req.userId)];
            case 2:
                newRunId = _a.sent();
                return [4 /*yield*/, pipelineQueue.add('run-pipeline', { runId: newRunId, url: original.url, description: original.description }, { attempts: 2, backoff: { type: 'exponential', delay: 5000 } })];
            case 3:
                _a.sent();
                console.log("\uD83D\uDD01 Re-run queued: ".concat(newRunId, " (from ").concat(req.params.id, ") by user ").concat(req.userId));
                return [2 /*return*/, res.status(202).json({
                        message: 'Re-run queued successfully',
                        runId: newRunId,
                        status: 'pending',
                        pollUrl: "/api/runs/".concat(newRunId),
                    })];
            case 4:
                err_6 = _a.sent();
                console.error('Error re-running:', err_6);
                return [2 /*return*/, res.status(500).json({ error: 'Failed to queue re-run' })];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
