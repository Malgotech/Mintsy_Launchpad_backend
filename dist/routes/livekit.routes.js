"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const livekit_server_sdk_1 = require("livekit-server-sdk");
const express_1 = __importDefault(require("express"));
const liveStreamChat_controller_1 = require("../controller/liveStreamChat.controller");
const router = express_1.default.Router();
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
router.post('/token', async (req, res) => {
    const { room, user, isCreator } = req.body;
    if (!room || !user) {
        return res.status(400).json({ error: 'room and user are required' });
    }
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return res.status(500).json({ error: 'LiveKit credentials not set in environment' });
    }
    try {
        const at = new livekit_server_sdk_1.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: user,
        });
        if (isCreator) {
            at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });
        }
        else {
            at.addGrant({ roomJoin: true, room: room, canPublish: false, canSubscribe: true });
        }
        const token = await at.toJwt();
        res.json({ token });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate token', details: err.message });
    }
});
// Live stream chat message routes
router.post('/chat/message', liveStreamChat_controller_1.createMessage);
router.get('/chat/messages/:tokenId', liveStreamChat_controller_1.getMessages);
exports.default = router;
