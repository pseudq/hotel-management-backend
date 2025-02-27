import pool from "../config/db";
import type { KhachHang } from "../types";

export const findAll = async (): Promise<KhachHang[]> => {
  const result = await pool.query("SELECT * FROM khach_hang ORDER BY ho_ten");
  return result.rows;
};

export const findById = async (id: number): Promise<KhachHang | null> => {
  const result = await pool.query("SELECT * FROM khach_hang WHERE id = $1", [
    id,
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const findByCMND = async (cmnd: string): Promise<KhachHang | null> => {
  const result = await pool.query("SELECT * FROM khach_hang WHERE cmnd = $1", [
    cmnd,
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const create = async (khachHang: KhachHang): Promise<KhachHang> => {
  const result = await pool.query(
    "INSERT INTO khach_hang (ho_ten, cmnd, so_dien_thoai, email, dia_chi) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [
      khachHang.ho_ten,
      khachHang.cmnd,
      khachHang.so_dien_thoai,
      khachHang.email,
      khachHang.dia_chi,
    ]
  );
  return result.rows[0];
};

export const update = async (
  id: number,
  khachHang: KhachHang
): Promise<KhachHang | null> => {
  const result = await pool.query(
    `UPDATE khach_hang SET 
      ho_ten = $1, 
      cmnd = $2, 
      so_dien_thoai = $3, 
      email = $4, 
      dia_chi = $5,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6 RETURNING *`,
    [
      khachHang.ho_ten,
      khachHang.cmnd,
      khachHang.so_dien_thoai,
      khachHang.email,
      khachHang.dia_chi,
      id,
    ]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const remove = async (id: number): Promise<KhachHang | null> => {
  const result = await pool.query(
    "DELETE FROM khach_hang WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const hasActiveBookings = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    "SELECT COUNT(*) FROM dat_phong WHERE khach_hang_id = $1 AND trang_thai IN ('đã đặt', 'đã nhận')",
    [id]
  );
  return Number.parseInt(result.rows[0].count) > 0;
};
