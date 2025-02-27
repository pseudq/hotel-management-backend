import pool from "../config/db";
import type { DichVu, SuDungDichVu } from "../types";

export const findAll = async (): Promise<DichVu[]> => {
  const result = await pool.query("SELECT * FROM dich_vu ORDER BY ten_dich_vu");
  return result.rows;
};

export const findById = async (id: number): Promise<DichVu | null> => {
  const result = await pool.query("SELECT * FROM dich_vu WHERE id = $1", [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const create = async (dichVu: DichVu): Promise<DichVu> => {
  const result = await pool.query(
    "INSERT INTO dich_vu (ten_dich_vu, gia, mo_ta) VALUES ($1, $2, $3) RETURNING *",
    [dichVu.ten_dich_vu, dichVu.gia, dichVu.mo_ta]
  );
  return result.rows[0];
};

export const update = async (
  id: number,
  dichVu: DichVu
): Promise<DichVu | null> => {
  const result = await pool.query(
    `UPDATE dich_vu SET 
      ten_dich_vu = $1, 
      gia = $2, 
      mo_ta = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4 RETURNING *`,
    [dichVu.ten_dich_vu, dichVu.gia, dichVu.mo_ta, id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const remove = async (id: number): Promise<DichVu | null> => {
  const result = await pool.query(
    "DELETE FROM dich_vu WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const isInUse = async (id: number): Promise<boolean> => {
  const result = await pool.query(
    "SELECT COUNT(*) FROM su_dung_dich_vu WHERE dich_vu_id = $1",
    [id]
  );
  return Number.parseInt(result.rows[0].count) > 0;
};

export const addServiceToBooking = async (
  suDungDichVu: SuDungDichVu
): Promise<SuDungDichVu> => {
  const result = await pool.query(
    `INSERT INTO su_dung_dich_vu (
      dat_phong_id, dich_vu_id, so_luong, gia_tien, thoi_gian_su_dung, ghi_chu
    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      suDungDichVu.dat_phong_id,
      suDungDichVu.dich_vu_id,
      suDungDichVu.so_luong || 1,
      suDungDichVu.gia_tien,
      suDungDichVu.thoi_gian_su_dung || new Date(),
      suDungDichVu.ghi_chu,
    ]
  );
  return result.rows[0];
};

export const getServicesByBooking = async (
  datPhongId: number
): Promise<any[]> => {
  const result = await pool.query(
    `
    SELECT sd.*, dv.ten_dich_vu
    FROM su_dung_dich_vu sd
    JOIN dich_vu dv ON sd.dich_vu_id = dv.id
    WHERE sd.dat_phong_id = $1
    ORDER BY sd.thoi_gian_su_dung
  `,
    [datPhongId]
  );
  return result.rows;
};

export const removeServiceUsage = async (
  id: number
): Promise<SuDungDichVu | null> => {
  const result = await pool.query(
    "DELETE FROM su_dung_dich_vu WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};
