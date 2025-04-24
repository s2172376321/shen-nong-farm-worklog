const db = require('../config/database');

class WorkLog {
  static async create(workLogData) {
    try {
      const {
        user_id,
        date,
        work_type,
        description,
        hours,
        location,
        weather,
        temperature,
        humidity
      } = workLogData;

      const result = await db.query(
        `INSERT INTO work_logs (
          user_id, date, work_type, description, hours,
          location, weather, temperature, humidity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          user_id, date, work_type, description, hours,
          location, weather, temperature, humidity
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating work log:', error);
      throw error;
    }
  }

  static async findByUserId(userId, startDate, endDate) {
    try {
      const result = await db.query(
        `SELECT * FROM work_logs 
         WHERE user_id = $1 
         AND date BETWEEN $2 AND $3
         ORDER BY date DESC`,
        [userId, startDate, endDate]
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding work logs by user id:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM work_logs WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error finding work log by id:', error);
      throw error;
    }
  }

  static async update(id, workLogData) {
    try {
      const {
        date,
        work_type,
        description,
        hours,
        location,
        weather,
        temperature,
        humidity
      } = workLogData;

      const result = await db.query(
        `UPDATE work_logs 
         SET date = $1, work_type = $2, description = $3, hours = $4,
             location = $5, weather = $6, temperature = $7, humidity = $8,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING *`,
        [
          date, work_type, description, hours,
          location, weather, temperature, humidity,
          id
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error updating work log:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query(
        'DELETE FROM work_logs WHERE id = $1',
        [id]
      );
    } catch (error) {
      console.error('Error deleting work log:', error);
      throw error;
    }
  }

  static async getSummary(userId, startDate, endDate) {
    try {
      const result = await db.query(
        `SELECT 
           work_type,
           SUM(hours) as total_hours,
           COUNT(*) as total_entries
         FROM work_logs
         WHERE user_id = $1
         AND date BETWEEN $2 AND $3
         GROUP BY work_type`,
        [userId, startDate, endDate]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting work log summary:', error);
      throw error;
    }
  }
}

module.exports = WorkLog; 