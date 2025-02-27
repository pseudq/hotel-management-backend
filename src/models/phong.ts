import pool from "../config/db";
import type { Phong } from "../types";

export const findAll = async (): Promise<Phong[]> => {
  const result = await pool.query(`
    SELECT p.*, lp.ten_loai_phong 
    FROM phong p
    JOIN loai_phong lp ON p.loai_phong_id = lp.id
    ORDER BY p.so_tang, p.so_phong
  `);
  return result.rows;
};

export const findById = async (id: number): Promise<Phong | null> => {
  const result = await pool.query(
    `
    SELECT p.*, lp.ten_loai_phong 
    FROM phong p
    JOIN loai_phong lp ON p.loai_phong_id = lp.id
    WHERE p.id = $1
  `,
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const findByRoomNumber = async (
  soPhong: string
): Promise<Phong | null> => {
  const result = await pool.query("SELECT * FROM phong WHERE so_phong = $1", [
    soPhong,
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const create = async (phong: Phong): Promise<Phong> => {
  const result = await pool.query(
    "INSERT INTO phong (so_phong, so_tang, loai_phong_id, trang_thai) VALUES ($1, $2, $3, $4) RETURNING *",
    [
      phong.so_phong,
      phong.so_tang,
      phong.loai_phong_id,
      phong.trang_thai || "trống",
    ]
  );
  return result.rows[0];
};

export const update = async (
  id: number,
  phong: Phong
): Promise<Phong | null> => {
  const result = await pool.query(
    "UPDATE phong SET so_phong = $1, so_tang = $2, loai_phong_id = $3, trang_thai = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *",
    [phong.so_phong, phong.so_tang, phong.loai_phong_id, phong.trang_thai, id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const remove = async (id: number): Promise<Phong | null> => {
  const result = await pool.query(
    "DELETE FROM phong WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const findAvailableRooms = async (): Promise<Phong[]> => {
  const result = await pool.query(`
    SELECT p.*, lp.ten_loai_phong 
    FROM phong p
    JOIN loai_phong lp ON p.loai_phong_id = lp.id
    WHERE p.trang_thai = 'trống'
    ORDER BY p.so_tang, p.so_phong
  `);
  return result.rows;
};

export const updateStatus = async (
  id: number,
  status: string
): Promise<Phong | null> => {
  const result = await pool.query(
    "UPDATE phong SET trang_thai = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [status, id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const isRoomInUse = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    "SELECT COUNT(*) FROM dat_phong WHERE phong_id = $1 AND trang_thai IN ('đã đặt', 'đã nhận')",
    [id]
  );
  return Number.parseInt(result.rows[0].count) > 0;
};
