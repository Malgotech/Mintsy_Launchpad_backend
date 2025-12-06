import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class TagController {
  // Get all tags
  getAllTags = async (req: Request, res: Response) => {
    try {
      const tags = await prisma.tag.findMany({
        where: { active: true },
        orderBy: { count: 'desc' }
      });

      return res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error("Error getting tags:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Create a new tag
  createTag = async (req: Request, res: Response) => {
    try {
      const { label } = req.body;

      if (!label) {
        return res.status(400).json({
          success: false,
          error: "Label is required"
        });
      }

      const tagId = label.toLowerCase().replace(/\s+/g, '-');

      const tag = await prisma.tag.upsert({
        where: { id: tagId },
        update: {},
        create: {
          id: tagId,
          label,
          active: true,
          count: 0
        }
      });

      return res.status(201).json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error("Error creating tag:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get tag by ID
  getTagById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const tag = await prisma.tag.findUnique({
        where: { id },
        include: {
          tokens: {
            include: {
              creator: true,
              market: true
            }
          },
          _count: {
            select: { tokens: true }
          }
        }
      });

      if (!tag) {
        return res.status(404).json({
          success: false,
          error: "Tag not found"
        });
      }

      return res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error("Error getting tag:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Update tag
  updateTag = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { label, active, count } = req.body;

      const tag = await prisma.tag.update({
        where: { id },
        data: {
          ...(label && { label }),
          ...(typeof active === 'boolean' && { active }),
          ...(typeof count === 'number' && { count })
        }
      });

      return res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error("Error updating tag:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Delete tag
  deleteTag = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.tag.delete({
        where: { id }
      });

      return res.json({
        success: true,
        message: "Tag deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting tag:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };

  // Get popular tags
  getPopularTags = async (req: Request, res: Response) => {
    try {
      const { limit = 10 } = req.query;

      const tags = await prisma.tag.findMany({
        where: { active: true },
        orderBy: { count: 'desc' },
        take: Number(limit)
      });

      return res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error("Error getting popular tags:", error);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  };
} 