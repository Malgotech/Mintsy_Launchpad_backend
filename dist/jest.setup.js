"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_1 = require("./utils/socket");
const index_1 = __importDefault(require("./index"));
let server;
beforeAll((done) => {
    server = http_1.default.createServer(index_1.default);
    (0, socket_1.initSocket)(server);
    server.listen(done);
});
afterAll((done) => {
    server.close(done);
});
