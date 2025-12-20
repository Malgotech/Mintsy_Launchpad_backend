"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const thread_controller_1 = require("../controller/thread.controller");
const router = (0, express_1.Router)();
// Create a new thread
router.post('/coins/:coinId/threads', thread_controller_1.createThread);
// Get all threads for a coin
router.get('/coins/:coinId/threads', thread_controller_1.getThreads);
// Like a thread
router.post('/threads/:threadId/like', thread_controller_1.likeThread);
// Add a reply to a thread
router.post('/threads/:threadId/replies', thread_controller_1.addReply);
// Like a reply
router.post('/threads/:threadId/replies/:replyId/like', thread_controller_1.likeReply);
exports.default = router;
