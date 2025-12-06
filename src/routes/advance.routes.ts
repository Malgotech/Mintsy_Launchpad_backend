import { Router } from 'express';
import { AdvanceController } from '../controller/advance.controller';

const router = Router();
const advanceController = new AdvanceController();

// Get all columns and their cards
router.get('/columns', (req, res) => advanceController.getColumns(req, res));

// Add more endpoints as needed, e.g. create column, update card, etc.
// Example placeholder endpoints (uncomment and implement in controller if needed):
// router.post('/columns', (req, res) => advanceController.createColumn(req, res));
// router.put('/cards/:id', (req, res) => advanceController.updateCard(req, res));
// router.delete('/cards/:id', (req, res) => advanceController.deleteCard(req, res));

export default router; 