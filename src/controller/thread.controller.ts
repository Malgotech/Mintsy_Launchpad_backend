import { Request, Response } from 'express';
import { prisma } from '../service/prismaService';
import { getIO } from '../utils/socket';

export const createThread = async (req: Request, res: Response) => {
  const { coinId } = req.params;
  const { userId, username, message, imageUrl } = req.body;
  try {
    const thread = await prisma.thread.create({
      data: {
        coin_id: coinId,
        user_id: String(userId),
        username,
        message,
        image_url: imageUrl || null,
      },
    });
    const threadPayload = {
      id: thread.id,
      coinId: thread.coin_id,
      userId: thread.user_id,
      username: thread.username,
      message: thread.message,
      imageUrl: thread.image_url,
      likes: thread.likes,
      createdAt: thread.created_at,
      likedByCurrentUser: false,
      replies: [],
    };
    getIO().emit('thread-created', {
      channel: 'new-threads',
      data: threadPayload,
    });
    res.json({ success: true, data: thread });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getThreads = async (req: Request, res: Response) => {
  const { coinId } = req.params;
  const { userId } = req.query;
  try {
    const threads = await prisma.thread.findMany({
      where: { coin_id: coinId },
      orderBy: { created_at: 'desc' },
      include: {
        replies: {
          orderBy: { created_at: 'asc' },
        },
      },
    });
    let threadLikesMap: Record<number, boolean> = {};
    let replyLikesMap: Record<number, boolean> = {};
    if (userId) {
      const threadIds = threads.map((t: any) => t.id);
      const replyIds = threads.flatMap((t: any) => t.replies.map((r: any) => r.id));
      const [threadLikes, replyLikes] = await Promise.all([
        prisma.threadLike.findMany({
          where: {
            thread_id: { in: threadIds },
            user_id: String(userId),
          },
          select: { thread_id: true },
        }),
        prisma.replyLike.findMany({
          where: {
            reply_id: { in: replyIds },
            user_id: String(userId),
          },
          select: { reply_id: true },
        })
      ]);
      threadLikesMap = threadLikes.reduce((acc: any, like: any) => {
        acc[like.thread_id] = true;
        return acc;
      }, {});
      replyLikesMap = replyLikes.reduce((acc: any, like: any) => {
        acc[like.reply_id] = true;
        return acc;
      }, {});
    }
    const data = threads.map((thread: any) => ({
      id: thread.id,
      coinId: thread.coin_id,
      userId: thread.user_id,
      username: thread.username,
      message: thread.message,
      imageUrl: thread.image_url,
      likes: thread.likes,
      createdAt: thread.created_at,
      likedByCurrentUser: !!threadLikesMap[thread.id],
      replies: thread.replies.map((reply: any) => ({
        id: reply.id,
        threadId: reply.thread_id,
        userId: reply.user_id,
        username: reply.username,
        message: reply.message,
        imageUrl: reply.image_url,
        likes: reply.likes,
        createdAt: reply.created_at,
        likedByCurrentUser: !!replyLikesMap[reply.id],
      })),
    }));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const likeThread = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const { userId } = req.body;
  try {
    const existing = await prisma.threadLike.findFirst({
      where: { thread_id: Number(threadId), user_id: String(userId) },
    });
    let liked;
    if (existing) {
      await prisma.threadLike.delete({
        where: { id: existing.id },
      });
      await prisma.thread.update({
        where: { id: Number(threadId) },
        data: { likes: { decrement: 1 } },
      });
      liked = false;
    } else {
      await prisma.threadLike.create({
        data: { thread_id: Number(threadId), user_id: String(userId) },
      });
      await prisma.thread.update({
        where: { id: Number(threadId) },
        data: { likes: { increment: 1 } },
      });
      liked = true;
    }
    // Fetch the updated thread with replies and likes
    const thread = await prisma.thread.findUnique({
      where: { id: Number(threadId) },
      include: {
        replies: { orderBy: { created_at: 'asc' } },
      },
    });
    const threadPayload = thread && {
      id: thread.id,
      coinId: thread.coin_id,
      userId: thread.user_id,
      username: thread.username,
      message: thread.message,
      imageUrl: thread.image_url,
      likes: thread.likes,
      createdAt: thread.created_at,
      likedByCurrentUser: false, // cannot know on backend
      replies: thread.replies.map((reply: any) => ({
        id: reply.id,
        threadId: reply.thread_id,
        userId: reply.user_id,
        username: reply.username,
        message: reply.message,
        imageUrl: reply.image_url,
        likes: reply.likes,
        createdAt: reply.created_at,
        likedByCurrentUser: false,
      })),
    };
    if (threadPayload) {
      getIO().emit('thread-updated', {
        channel: 'thread-updates',
        data: threadPayload,
      });
    }
    res.json({ success: true, liked, likes: thread?.likes ?? 0 });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addReply = async (req: Request, res: Response) => {
  const { threadId } = req.params;
  const { userId, username, message, imageUrl } = req.body;
  try {
    const createdReply = await prisma.reply.create({
      data: {
        thread_id: Number(threadId),
        user_id: String(userId),
        username,
        message,
        image_url: imageUrl || null,
      },
    });
    // Fetch the updated thread with replies and likes
    const thread = await prisma.thread.findUnique({
      where: { id: Number(threadId) },
      include: {
        replies: { orderBy: { created_at: 'asc' } },
      },
    });
    const threadPayload = thread && {
      id: thread.id,
      coinId: thread.coin_id,
      userId: thread.user_id,
      username: thread.username,
      message: thread.message,
      imageUrl: thread.image_url,
      likes: thread.likes,
      createdAt: thread.created_at,
      likedByCurrentUser: false,
      replies: thread.replies.map((reply: any) => ({
        id: reply.id,
        threadId: reply.thread_id,
        userId: reply.user_id,
        username: reply.username,
        message: reply.message,
        imageUrl: reply.image_url,
        likes: reply.likes,
        createdAt: reply.created_at,
        likedByCurrentUser: false,
      })),
    };
    if (threadPayload) {
      getIO().emit('thread-updated', {
        channel: 'thread-updates',
        data: threadPayload,
      });
    }
    // Return the created reply data
    const replyPayload = {
      id: createdReply.id,
      threadId: createdReply.thread_id,
      userId: createdReply.user_id,
      username: createdReply.username,
      message: createdReply.message,
      imageUrl: createdReply.image_url,
      likes: createdReply.likes,
      createdAt: createdReply.created_at,
      likedByCurrentUser: false,
    };
    res.json({ success: true, data: replyPayload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const likeReply = async (req: Request, res: Response) => {
  const { replyId } = req.params;
  const { userId } = req.body;
  try {
    const existing = await prisma.replyLike.findFirst({
      where: { reply_id: Number(replyId), user_id: String(userId) },
    });
    let liked;
    if (existing) {
      await prisma.replyLike.delete({
        where: { id: existing.id },
      });
      await prisma.reply.update({
        where: { id: Number(replyId) },
        data: { likes: { decrement: 1 } },
      });
      liked = false;
    } else {
      await prisma.replyLike.create({
        data: { reply_id: Number(replyId), user_id: String(userId) },
      });
      await prisma.reply.update({
        where: { id: Number(replyId) },
        data: { likes: { increment: 1 } },
      });
      liked = true;
    }
    // Fetch the updated reply
    const reply = await prisma.reply.findUnique({
      where: { id: Number(replyId) },
    });
    if (reply) {
      const replyPayload = {
        id: reply.id,
        threadId: reply.thread_id,
        userId: reply.user_id,
        username: reply.username,
        message: reply.message,
        imageUrl: reply.image_url,
        likes: reply.likes,
        createdAt: reply.created_at,
        likedByCurrentUser: false,
      };
      getIO().emit('reply-updated', {
        channel: 'reply-updates',
        data: replyPayload,
      });
    }
    res.json({ success: true, liked, likes: reply?.likes ?? 0 });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}; 