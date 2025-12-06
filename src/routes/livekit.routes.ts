import { Router, Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import express from 'express';
import { createMessage, getMessages } from '../controller/liveStreamChat.controller';

const router = express.Router();

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

router.post('/token', async (req: Request, res: Response) => {
    const { room, user, isCreator } = req.body;

    if (!room || !user) {
        return res.status(400).json({ error: 'room and user are required' });
    }
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return res.status(500).json({ error: 'LiveKit credentials not set in environment' });
    }


    try {
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: user,
        });
        if (isCreator) {
            at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });
        } else {
            at.addGrant({ roomJoin: true, room: room, canPublish: false, canSubscribe: true });
        }
        const token = await at.toJwt();
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate token', details: (err as Error).message });
    }
});

// Live stream chat message routes
router.post('/chat/message', createMessage);
router.get('/chat/messages/:tokenId', getMessages);

export default router; 