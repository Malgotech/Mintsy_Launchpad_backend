import prismaService from '../service/prismaService';
import { Request, Response } from 'express';
import { emitLiveStreamChatMessage } from '../utils/socket';

export const createMessage = async (req: Request, res: Response) => {
  try {
    const { tokenId, senderId, senderName, content } = req.body;
    if (!tokenId || !senderId || !senderName || !content) {
      return res.status(400).json({ error: 'tokenId, senderId, senderName, and content are required' });
    }
    const message = await prismaService.createLiveStreamChatMessage({
      tokenId: parseInt(tokenId),
      senderId: parseInt(senderId),
      senderName,
      content,
    });
    emitLiveStreamChatMessage(message);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create message', details: error });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    if (!tokenId) {
      return res.status(400).json({ error: 'tokenId is required' });
    }
    const messages = await prismaService.getLiveStreamChatMessagesByToken(tokenId);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages', details: error });
  }
}; 