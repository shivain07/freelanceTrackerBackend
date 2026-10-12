import clientService from '../services/clientService.js';

export const createClient = async (req, res, next) => {
  try {
    const { name, email, hourly_rate } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required fields'
      });
    }

    const client = await clientService.createClient(req.user.id, {
      name,
      email,
      hourly_rate
    });

    return res.status(201).json({
      success: true,
      data: client
    });
  } catch (error) {
    return next(error);
  }
};

export const getClients = async (req, res, next) => {
  try {
    const clients = await clientService.getClientsByUserId(req.user.id);
    return res.status(200).json({
      success: true,
      data: clients
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    await clientService.deleteClient(clientId, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  createClient,
  getClients,
  deleteClient
};
