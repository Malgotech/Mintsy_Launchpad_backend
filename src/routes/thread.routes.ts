import { Router } from 'express';
import {
  createThread,
  getThreads,
  likeThread,
  addReply,
  likeReply,
} from '../controller/thread.controller';

const router = Router();

// Create a new thread
router.post('/coins/:coinId/threads', createThread);
// Get all threads for a coin
router.get('/coins/:coinId/threads', getThreads);
// Like a thread
router.post('/threads/:threadId/like', likeThread);
// Add a reply to a thread
router.post('/threads/:threadId/replies', addReply);
// Like a reply
router.post('/threads/:threadId/replies/:replyId/like', likeReply);

export default router; 