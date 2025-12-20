"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.likeReply = exports.addReply = exports.likeThread = exports.getThreads = exports.createThread = void 0;
const prismaService_1 = require("../service/prismaService");
const socket_1 = require("../utils/socket");
const createThread = async (req, res) => {
    const { coinId } = req.params;
    const { userId, username, message, imageUrl } = req.body;
    try {
        const thread = await prismaService_1.prisma.thread.create({
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
        (0, socket_1.getIO)().emit('thread-created', {
            channel: 'new-threads',
            data: threadPayload,
        });
        res.json({ success: true, data: thread });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.createThread = createThread;
const getThreads = async (req, res) => {
    const { coinId } = req.params;
    const { userId } = req.query;
    try {
        const threads = await prismaService_1.prisma.thread.findMany({
            where: { coin_id: coinId },
            orderBy: { created_at: 'desc' },
            include: {
                replies: {
                    orderBy: { created_at: 'asc' },
                },
            },
        });
        let threadLikesMap = {};
        let replyLikesMap = {};
        if (userId) {
            const threadIds = threads.map((t) => t.id);
            const replyIds = threads.flatMap((t) => t.replies.map((r) => r.id));
            const [threadLikes, replyLikes] = await Promise.all([
                prismaService_1.prisma.threadLike.findMany({
                    where: {
                        thread_id: { in: threadIds },
                        user_id: String(userId),
                    },
                    select: { thread_id: true },
                }),
                prismaService_1.prisma.replyLike.findMany({
                    where: {
                        reply_id: { in: replyIds },
                        user_id: String(userId),
                    },
                    select: { reply_id: true },
                })
            ]);
            threadLikesMap = threadLikes.reduce((acc, like) => {
                acc[like.thread_id] = true;
                return acc;
            }, {});
            replyLikesMap = replyLikes.reduce((acc, like) => {
                acc[like.reply_id] = true;
                return acc;
            }, {});
        }
        const data = threads.map((thread) => ({
            id: thread.id,
            coinId: thread.coin_id,
            userId: thread.user_id,
            username: thread.username,
            message: thread.message,
            imageUrl: thread.image_url,
            likes: thread.likes,
            createdAt: thread.created_at,
            likedByCurrentUser: !!threadLikesMap[thread.id],
            replies: thread.replies.map((reply) => ({
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getThreads = getThreads;
const likeThread = async (req, res) => {
    const { threadId } = req.params;
    const { userId } = req.body;
    try {
        const existing = await prismaService_1.prisma.threadLike.findFirst({
            where: { thread_id: Number(threadId), user_id: String(userId) },
        });
        let liked;
        if (existing) {
            await prismaService_1.prisma.threadLike.delete({
                where: { id: existing.id },
            });
            await prismaService_1.prisma.thread.update({
                where: { id: Number(threadId) },
                data: { likes: { decrement: 1 } },
            });
            liked = false;
        }
        else {
            await prismaService_1.prisma.threadLike.create({
                data: { thread_id: Number(threadId), user_id: String(userId) },
            });
            await prismaService_1.prisma.thread.update({
                where: { id: Number(threadId) },
                data: { likes: { increment: 1 } },
            });
            liked = true;
        }
        // Fetch the updated thread with replies and likes
        const thread = await prismaService_1.prisma.thread.findUnique({
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
            replies: thread.replies.map((reply) => ({
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
            (0, socket_1.getIO)().emit('thread-updated', {
                channel: 'thread-updates',
                data: threadPayload,
            });
        }
        res.json({ success: true, liked, likes: thread?.likes ?? 0 });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.likeThread = likeThread;
const addReply = async (req, res) => {
    const { threadId } = req.params;
    const { userId, username, message, imageUrl } = req.body;
    try {
        const createdReply = await prismaService_1.prisma.reply.create({
            data: {
                thread_id: Number(threadId),
                user_id: String(userId),
                username,
                message,
                image_url: imageUrl || null,
            },
        });
        // Fetch the updated thread with replies and likes
        const thread = await prismaService_1.prisma.thread.findUnique({
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
            replies: thread.replies.map((reply) => ({
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
            (0, socket_1.getIO)().emit('thread-updated', {
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.addReply = addReply;
const likeReply = async (req, res) => {
    const { replyId } = req.params;
    const { userId } = req.body;
    try {
        const existing = await prismaService_1.prisma.replyLike.findFirst({
            where: { reply_id: Number(replyId), user_id: String(userId) },
        });
        let liked;
        if (existing) {
            await prismaService_1.prisma.replyLike.delete({
                where: { id: existing.id },
            });
            await prismaService_1.prisma.reply.update({
                where: { id: Number(replyId) },
                data: { likes: { decrement: 1 } },
            });
            liked = false;
        }
        else {
            await prismaService_1.prisma.replyLike.create({
                data: { reply_id: Number(replyId), user_id: String(userId) },
            });
            await prismaService_1.prisma.reply.update({
                where: { id: Number(replyId) },
                data: { likes: { increment: 1 } },
            });
            liked = true;
        }
        // Fetch the updated reply
        const reply = await prismaService_1.prisma.reply.findUnique({
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
            (0, socket_1.getIO)().emit('reply-updated', {
                channel: 'reply-updates',
                data: replyPayload,
            });
        }
        res.json({ success: true, liked, likes: reply?.likes ?? 0 });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.likeReply = likeReply;
