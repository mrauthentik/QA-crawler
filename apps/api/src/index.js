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
exports.app = void 0;
var dotenv = require("dotenv");
var path_1 = require("path");
dotenv.config({ path: (0, path_1.resolve)(__dirname, '../../.env') });
var express_1 = require("express");
var helmet_1 = require("helmet");
var fs_1 = require("fs");
var path_2 = require("path");
var index_1 = require("./db/index");
var runs_1 = require("./routes/runs");
var rateLimit_1 = require("./middleware/rateLimit");
var app = (0, express_1.default)();
exports.app = app;
var PORT = process.env.PORT || process.env.API_PORT || 3001;
var SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || path_2.default.join(__dirname, '../../screenshots');
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // ─── Security headers ──────────────────────────────────────────────────────
                    app.use(helmet_1.default.crossOriginResourcePolicy({ policy: 'cross-origin' }));
                    app.use((0, helmet_1.default)({
                        contentSecurityPolicy: {
                            directives: {
                                defaultSrc: ["'self'"],
                                scriptSrc: ["'self'", "'unsafe-inline'"],
                                styleSrc: ["'self'", "'unsafe-inline'"],
                                imgSrc: ["'self'", 'data:', 'https:'],
                                connectSrc: ["'self'", 'https:'],
                            },
                        },
                        hsts: {
                            maxAge: 31536000,
                            includeSubDomains: true,
                            preload: true,
                        },
                        frameguard: { action: 'deny' },
                        xssFilter: true,
                        noSniff: true,
                    }));
                    // ─── CORS ──────────────────────────────────────────────────────────────────
                    app.use(function (req, res, next) {
                        res.header('Access-Control-Allow-Origin', '*');
                        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                        res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
                        if (req.method === 'OPTIONS')
                            return res.sendStatus(204);
                        next();
                    });
                    // ─── Body parsing ──────────────────────────────────────────────────────────
                    app.use(express_1.default.json());
                    // ─── Screenshots ───────────────────────────────────────────────────────────
                    if (!fs_1.default.existsSync(SCREENSHOTS_DIR)) {
                        fs_1.default.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
                        console.log('📸 Screenshots directory created:', SCREENSHOTS_DIR);
                    }
                    app.use('/screenshots', express_1.default.static(SCREENSHOTS_DIR));
                    // ─── Rate limiting ─────────────────────────────────────────────────────────
                    app.use('/api', rateLimit_1.apiLimiter);
                    // Run creation limiter applied only in the router on POST
                    // ─── Health check ──────────────────────────────────────────────────────────
                    app.get('/health', function (_req, res) {
                        res.json({ status: 'ok', timestamp: new Date().toISOString() });
                    });
                    // ─── Routes ────────────────────────────────────────────────────────────────
                    app.use('/api/runs', runs_1.default);
                    // ─── Database ──────────────────────────────────────────────────────────────
                    return [4 /*yield*/, (0, index_1.initDb)()];
                case 1:
                    // ─── Database ──────────────────────────────────────────────────────────────
                    _a.sent();
                    // ─── Worker (in-process) ───────────────────────────────────────────────────
                    require('./workers/pipeline.worker');
                    app.listen(PORT, function () {
                        console.log('\n╔══════════════════════════════════════════════╗');
                        console.log('║      🕵️  QA Detective API — Started            ║');
                        console.log('╚══════════════════════════════════════════════╝');
                        console.log("\n\uD83D\uDE80 API running at http://localhost:".concat(PORT));
                        console.log("\u2764\uFE0F  Health:    http://localhost:".concat(PORT, "/health"));
                        console.log("\uD83D\uDCCB Runs:      http://localhost:".concat(PORT, "/api/runs"));
                        console.log('\n👷 Pipeline worker running — ready for jobs\n');
                    });
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.error('❌ Failed to start:', err_1);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
start();
