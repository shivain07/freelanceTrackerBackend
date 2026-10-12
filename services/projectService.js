import db from '../config/db.js';

export const getProjectsDashboard = async (userId) => {
  const query = `
    SELECT 
      p.id, p.title, p.status, p.created_at,
      c.name AS client_name, c.email AS client_email, c.hourly_rate,
      COALESCE(SUM(tl.hours), 0) AS total_hours_worked,
      COALESCE(SUM(tl.hours), 0) * c.hourly_rate AS total_earned,
      COUNT(DISTINCT t.id) FILTER (WHERE t.is_completed = false) AS pending_tasks,
      COUNT(DISTINCT t.id) AS total_tasks
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN time_logs tl ON tl.task_id = t.id
    WHERE c.user_id = $1
    GROUP BY p.id, c.name, c.email, c.hourly_rate
    ORDER BY p.created_at DESC;
  `;

  const result = await db.query(query, [userId]);
  return result.rows;
};

export const createProject = async (userId, { client_id, title, status = 'active' }) => {
  // Verify client belongs to user
  const clientCheck = await db.query(
    'SELECT id FROM clients WHERE id = $1 AND user_id = $2',
    [client_id, userId]
  );

  if (clientCheck.rows.length === 0) {
    const error = new Error('Client not found or does not belong to user');
    error.statusCode = 404;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO projects (client_id, title, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [client_id, title, status]
  );

  return result.rows[0];
};

export const getProjectById = async (projectId, userId) => {
  const query = `
    SELECT p.*, c.name AS client_name, c.hourly_rate
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    WHERE p.id = $1 AND c.user_id = $2
  `;
  const result = await db.query(query, [projectId, userId]);
  return result.rows[0] || null;
};

export const deleteProject = async (projectId, userId) => {
  const result = await db.query(
    `DELETE FROM projects AS p
     USING clients AS c
     WHERE p.client_id = c.id
       AND p.id = $1
       AND c.user_id = $2
     RETURNING p.id`,
    [projectId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Project not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  return true;
};

export default {
  getProjectsDashboard,
  createProject,
  getProjectById,
  deleteProject
};
