import { Request, Response } from 'express';
import { AdvanceService } from '../service/advance.service';


export class AdvanceController {
    private advanceService: AdvanceService;

    constructor() {
        this.advanceService = new AdvanceService();
    }


    public async getColumns(req: Request, res: Response) {
        try {
            const userId = req.query.userId ? Number(req.query.userId) : undefined;
            const columns = await this.advanceService.getColumns(userId);
            return res.status(200).json({
                success: true,
                data: columns
            });
        } catch (error:any) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch columns',
                error: error.message
            });
        }
    }


    public async updateColumn(req: Request, res: Response) {
        try {
            const { columnId } = req.params;
            const updateData = req.body;

            if (!columnId) {
                return res.status(400).json({
                    success: false,
                    message: 'Column ID is required'
                });
            }

            const updatedColumn = await this.advanceService.updateCard(columnId, updateData);
            return res.status(200).json({
                success: true,
                data: updatedColumn
            });
        } catch (error:any) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update column',
                error: error.message
            });
        }
    }

    // Create new column
    public async createColumn(req: Request, res: Response) {
        try {
            const columnData = req.body;

            if (!columnData.title || !columnData.type) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and type are required'
                });
            }

            const newColumn = await this.advanceService.createCard(columnData);
            return res.status(201).json({
                success: true,
                data: newColumn
            });
        } catch (error:any) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create column',
                error: error.message
            });
        }
    }



    // Delete column
    public async deleteColumn(req: Request, res: Response) {
        try {
            const { columnId } = req.params;

            if (!columnId) {
                return res.status(400).json({
                    success: false,
                    message: 'Column ID is required'
                });
            }

            await this.advanceService.deleteCard(columnId);
            return res.status(200).json({
                success: true,
                message: 'Column deleted successfully'
            });
        } catch (error:any) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete column',
                error: error.message
            });
        }
    }
}