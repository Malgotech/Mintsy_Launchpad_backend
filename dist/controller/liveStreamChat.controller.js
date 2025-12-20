"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = exports.createMessage = void 0;
const prismaService_1 = __importDefault(require("../service/prismaService"));
const socket_1 = require("../utils/socket");
const createMessage = async (req, res) => {
    try {
        const { tokenId, senderId, senderName, content } = req.body;
        if (!tokenId || !senderId || !senderName || !content) {
            return res.status(400).json({ error: 'tokenId, senderId, senderName, and content are required' });
        }
        const message = await prismaService_1.default.createLiveStreamChatMessage({
            tokenId: parseInt(tokenId),
            senderId: parseInt(senderId),
            senderName,
            content,
        });
        (0, socket_1.emitLiveStreamChatMessage)(message);
        res.status(201).json(message);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create message', details: error });
    }
};
exports.createMessage = createMessage;
const getMessages = async (req, res) => {
    try {
        const { tokenId } = req.params;
        if (!tokenId) {
            return res.status(400).json({ error: 'tokenId is required' });
        }
        const messages = await prismaService_1.default.getLiveStreamChatMessagesByToken(tokenId);
        res.status(200).json(messages);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get messages', details: error });
    }
};
exports.getMessages = getMessages;
