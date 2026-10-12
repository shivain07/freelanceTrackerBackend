import db from '../config/db.js';

export const verifyProjectOwnership = async (projectId, userId) => {
  const result = await db.query(
    `SELECT p.id
     FROM projects p
     JOIN clients c ON p.client_id = c.id
     WHERE p.id = $1 AND c.user_id = $2`,
    [projectId, userId]
  );
  return result.rows.length > 0;
};

export const getTasksByProjectId = async (projectId, userId) => {
  const isOwner = await verifyProjectOwnership(projectId, userId);
  if (!isOwner) {
    const error = new Error('Project not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const query = `
    WITH RECURSIVE task_tree AS (
      SELECT id, project_id, parent_task_id, title, is_completed, created_at,
             0 AS depth, LPAD(CAST(id AS TEXT), 5, '0') AS path
      FROM tasks
      WHERE project_id = $1 AND parent_task_id IS NULL
      
      UNION ALL
      
      SELECT t.id, t.project_id, t.parent_task_id, t.title, t.is_completed, t.created_at,
             tt.depth + 1, tt.path || '.' || LPAD(CAST(t.id AS TEXT), 5, '0')
      FROM tasks t
      INNER JOIN task_tree tt ON t.parent_task_id = tt.id
    )
    SELECT * FROM task_tree ORDER BY path;
  `;

  const result = await db.query(query, [projectId]);
  return result.rows;
};

export const createTask = async (userId, { project_id, title, parent_task_id = null }) => {
  const isOwner = await verifyProjectOwnership(project_id, userId);
  if (!isOwner) {
    const error = new Error('Project not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  if (parent_task_id) {
    const parentCheck = await db.query(
      'SELECT id FROM tasks WHERE id = $1 AND project_id = $2',
      [parent_task_id, project_id]
    );
    if (parentCheck.rows.length === 0) {
      const error = new Error('Parent task not found in this project');
      error.statusCode = 400;
      throw error;
    }
  }

  const result = await db.query(
    `INSERT INTO tasks (project_id, parent_task_id, title, is_completed)
     VALUES ($1, $2, $3, false)
     RETURNING *`,
    [project_id, parent_task_id || null, title]
  );

  return result.rows[0];
};

export const updateTaskCompletion = async (userId, taskId, isCompleted) => {
  const checkQuery = `
    SELECT t.id
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN clients c ON p.client_id = c.id
    WHERE t.id = $1 AND c.user_id = $2
  `;
  const checkResult = await db.query(checkQuery, [taskId, userId]);
  if (checkResult.rows.length === 0) {
    const error = new Error('Task not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const updateResult = await db.query(
    `UPDATE tasks
     SET is_completed = $1
     WHERE id = $2
     RETURNING *`,
    [Boolean(isCompleted), taskId]
  );

  return updateResult.rows[0];
};

export const deleteTask = async (userId, taskId) => {
  const result = await db.query(
    `DELETE FROM tasks AS t
     USING projects AS p
     JOIN clients AS c ON p.client_id = c.id
     WHERE t.project_id = p.id
       AND t.id = $1
       AND c.user_id = $2
     RETURNING t.id`,
    [taskId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Task not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  return true;
};




export default {
  getTasksByProjectId,
  createTask,
  updateTaskCompletion,
  deleteTask,
  verifyProjectOwnership
};
