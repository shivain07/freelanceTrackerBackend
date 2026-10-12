import express from 'express';
import clientController from '../controllers/clientController.js';
import { requireAuth } from '../middleware/auth.js'
const router = express.Router();

// Apply auth middleware to all client routes 
router.use(requireAuth);

// GET /api/clients - List all clients for the authenticated user
router.get('/', clientController.getClients);

// POST /api/clients - Create a new client
router.post('/', clientController.createClient);

// DELETE /api/clients/:clientId - Delete a client and dependent records
router.delete('/:clientId', clientController.deleteClient);

export default router;
