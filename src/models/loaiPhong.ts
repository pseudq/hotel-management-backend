import pool from "../config/db";
import type { LoaiPhong } from "../types";

export const findAll = async (): Promise<LoaiPhong[]> => {
  const result = await pool.query("SELECT * FROM loai_phong ORDER BY id");
  return result.rows;
};

export const findById = async (id: number): Promise<LoaiPhong | null> => {
  const result = await pool.query("SELECT * FROM loai_phong WHERE id = $1", [
    id,
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const create = async (loaiPhong: LoaiPhong): Promise<LoaiPhong> => {
  const result = await pool.query(
    "INSERT INTO loai_phong (ten_loai_phong, gia_qua_dem, gia_gio_dau, gia_theo_gio, gia_qua_ngay) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [
      loaiPhong.ten_loai_phong,
      loaiPhong.gia_qua_dem,
      loaiPhong.gia_gio_dau,
      loaiPhong.gia_theo_gio,
      loaiPhong.gia_qua_ngay,
    ]
  );
  return result.rows[0];
};

export const update = async (
  id: number,
  loaiPhong: LoaiPhong
): Promise<LoaiPhong | null> => {
  const result = await pool.query(
    "UPDATE loai_phong SET ten_loai_phong = $1, gia_qua_dem = $2, gia_gio_dau = $3, gia_theo_gio = $4, gia_qua_ngay = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *",
    [
      loaiPhong.ten_loai_phong,
      loaiPhong.gia_qua_dem,
      loaiPhong.gia_gio_dau,
      loaiPhong.gia_theo_gio,
      loaiPhong.gia_qua_ngay,
      id,
    ]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const remove = async (id: number): Promise<LoaiPhong | null> => {
  const result = await pool.query(
    "DELETE FROM loai_phong WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const isInUse = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    "SELECT COUNT(*) FROM phong WHERE loai_phong_id = $1",
    [id]
  );
  return Number.parseInt(result.rows[0].count) > 0;
};
