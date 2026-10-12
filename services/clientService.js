import db from '../config/db.js';

export const createClient = async (userId, { name, email, hourly_rate }) => {
  const rate = hourly_rate !== undefined ? parseFloat(hourly_rate) : 50.0;
  const result = await db.query(
    `INSERT INTO clients (user_id, name, email, hourly_rate)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, name, email, rate]
  );
  return result.rows[0];
};

export const getClientsByUserId = async (userId) => {
  const result = await db.query(
    `SELECT id, user_id, name, email, hourly_rate, created_at
     FROM clients
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const getClientById = async (clientId, userId) => {
  const result = await db.query(
    `SELECT id, user_id, name, email, hourly_rate, created_at
     FROM clients
     WHERE id = $1 AND user_id = $2`,
    [clientId, userId]
  );
  return result.rows[0] || null;
};

export const deleteClient = async (clientId, userId) => {
  const result = await db.query(
    `DELETE FROM clients
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [clientId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Client not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  return true;
};

export default {
  createClient,
  getClientsByUserId,
  getClientById,
  deleteClient
};
