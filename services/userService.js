import db from '../config/db.js';

export const findOrCreateGoogleUser = async ({ googleId, email, name, avatarUrl }) => {
  const existingUserResult = await db.query(
    'SELECT * FROM users WHERE google_id = $1',
    [googleId]
  );

  if (existingUserResult.rows.length > 0) {
    // Optionally update name/avatar if changed
    const updatedUser = await db.query(
      `UPDATE users 
       SET name = $1, avatar_url = $2, email = $3
       WHERE google_id = $4
       RETURNING *`,
      [name, avatarUrl, email, googleId]
    );
    return updatedUser.rows[0];
  }

  const newUserResult = await db.query(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
     [googleId, email, name, avatarUrl]
  );

  return newUserResult.rows[0];
};

export const getUserById = async (id) => {
  const result = await db.query(
    'SELECT id, google_id, email, name, avatar_url, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const getUserByGoogleId = async (googleId) => {
  const result = await db.query(
    'SELECT id, google_id, email, name, avatar_url, created_at FROM users WHERE google_id = $1',
    [googleId]
  );
  return result.rows[0] || null;
};

export default {
  findOrCreateGoogleUser,
  getUserById,
  getUserByGoogleId
};
