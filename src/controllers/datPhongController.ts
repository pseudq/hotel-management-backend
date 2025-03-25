import type { Request, Response } from "express";
import pool from "../config/db";
import type { DatPhong } from "../types";
import { calculateOptimalRoomCharge } from "../models/hoaDon";

export const getAllDatPhong = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT dp.*, 
        kh.ho_ten, kh.cmnd,
        p.so_phong, p.so_tang,
        lp.ten_loai_phong
      FROM dat_phong dp
      JOIN khach_hang kh ON dp.khach_hang_id = kh.id
      JOIN phong p ON dp.phong_id = p.id
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      ORDER BY dp.thoi_gian_vao DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching dat phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDatPhongById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const datPhongResult = await pool.query(
      `
      SELECT dp.*, 
        kh.ho_ten, kh.cmnd,
        p.so_phong, p.so_tang,
        lp.ten_loai_phong
      FROM dat_phong dp
      JOIN khach_hang kh ON dp.khach_hang_id = kh.id
      JOIN phong p ON dp.phong_id = p.id
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      WHERE dp.id = $1
    `,
      [id]
    );

    if (datPhongResult.rows.length === 0) {
      return res.status(404).json({ message: "Đặt phòng không tồn tại" });
    }

    // Lấy thông tin dịch vụ đã sử dụng
    const dichVuResult = await pool.query(
      `
      SELECT sd.*, dv.ten_dich_vu
      FROM su_dung_dich_vu sd
      JOIN dich_vu dv ON sd.dich_vu_id = dv.id
      WHERE sd.dat_phong_id = $1
    `,
      [id]
    );

    const response = {
      ...datPhongResult.rows[0],
      dich_vu: dichVuResult.rows,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching dat phong by id:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createDatPhong = async (req: Request, res: Response) => {
  const {
    khach_hang_id,
    phong_id,
    thoi_gian_vao,
    thoi_gian_du_kien_ra,
    trang_thai,
    ghi_chu,
  } = req.body as DatPhong;

  // Validate thời gian vào
  if (new Date(thoi_gian_vao) > new Date()) {
    return res
      .status(400)
      .json({ message: "Thời gian vào không thể trong tương lai" });
  }

  // Bắt đầu transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Kiểm tra xem phòng có sẵn sàng không
    const checkPhong = await client.query(
      "SELECT trang_thai FROM phong WHERE id = $1",
      [phong_id]
    );

    if (checkPhong.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Phòng không tồn tại" });
    }

    if (checkPhong.rows[0].trang_thai !== "trống" && trang_thai === "đã nhận") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Phòng không sẵn sàng để nhận khách" });
    }

    // Đảm bảo thời gian vào được lưu đúng định dạng UTC
    const thoiGianVao = new Date(thoi_gian_vao);
    // Sử dụng trực tiếp thời gian từ client mà không thay đổi timezone
    const datPhongResult = await client.query(
      `INSERT INTO dat_phong (
        khach_hang_id, phong_id, thoi_gian_vao, thoi_gian_du_kien_ra,
        trang_thai, ghi_chu
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        khach_hang_id,
        phong_id,
        thoiGianVao, // Sử dụng trực tiếp thời gian từ request
        thoi_gian_du_kien_ra,
        trang_thai || "đã nhận",
        ghi_chu,
      ]
    );

    // Cập nhật trạng thái phòng nếu trang thái là 'đã nhận'
    if (trang_thai === "đã nhận") {
      await client.query(
        "UPDATE phong SET trang_thai = 'đang sử dụng', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [phong_id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json(datPhongResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating dat phong:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

export const updateDatPhong = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    khach_hang_id,
    phong_id,
    thoi_gian_vao,
    thoi_gian_du_kien_ra,
    trang_thai,
    ghi_chu,
  } = req.body as DatPhong;

  // Bắt đầu transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lấy thông tin đặt phòng hiện tại
    const currentDatPhong = await client.query(
      "SELECT * FROM dat_phong WHERE id = $1",
      [id]
    );

    if (currentDatPhong.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Đặt phòng không tồn tại" });
    }

    const current = currentDatPhong.rows[0];

    // Cập nhật đặt phòng
    const datPhongResult = await client.query(
      `UPDATE dat_phong SET 
        khach_hang_id = $1, 
        phong_id = $2, 
        thoi_gian_vao = $3, 
        thoi_gian_du_kien_ra = $4,
        trang_thai = $5, 
        ghi_chu = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 RETURNING *`,
      [
        khach_hang_id || current.khach_hang_id,
        phong_id || current.phong_id,
        thoi_gian_vao || current.thoi_gian_vao,
        thoi_gian_du_kien_ra,
        trang_thai || current.trang_thai,
        ghi_chu || current.ghi_chu,
        id,
      ]
    );

    // Xử lý thay đổi trạng thái
    if (trang_thai && trang_thai !== current.trang_thai) {
      // Nếu trả phòng
      if (trang_thai === "đã trả") {
        await client.query(
          "UPDATE phong SET trang_thai = 'đang dọn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [phong_id || current.phong_id]
        );
      }
      // Nếu nhận phòng
      else if (trang_thai === "đã nhận") {
        await client.query(
          "UPDATE phong SET trang_thai = 'đang sử dụng', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [phong_id || current.phong_id]
        );
      }
      // Nếu hủy đặt phòng
      else if (trang_thai === "đã hủy" && current.trang_thai === "đã nhận") {
        await client.query(
          "UPDATE phong SET trang_thai = 'đang dọn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [current.phong_id]
        );
      }
    }

    // Xử lý thay đổi phòng
    if (
      phong_id &&
      phong_id !== current.phong_id &&
      current.trang_thai === "đã nhận"
    ) {
      // Đổi trạng thái phòng cũ
      await client.query(
        "UPDATE phong SET trang_thai = 'đang dọn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [current.phong_id]
      );

      // Đổi trạng thái phòng mới
      await client.query(
        "UPDATE phong SET trang_thai = 'đang sử dụng', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [phong_id]
      );
    }

    await client.query("COMMIT");

    res.status(200).json(datPhongResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating dat phong:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

export const traPhong = async (req: Request, res: Response) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const datPhongResult = await client.query(
      `SELECT dp.*, p.id as phong_id, p.loai_phong_id, lp.*
       FROM dat_phong dp 
       JOIN phong p ON dp.phong_id = p.id 
       JOIN loai_phong lp ON p.loai_phong_id = lp.id
       WHERE dp.id = $1`,
      [id]
    );

    if (datPhongResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Đặt phòng không tồn tại" });
    }

    const datPhong = datPhongResult.rows[0];

    if (datPhong.trang_thai !== "đã nhận") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Chỉ có thể trả phòng đang được sử dụng" });
    }

    // Sử dụng thời gian hiện tại UTC
    const thoiGianRa = new Date();

    // Cập nhật trạng thái
    await client.query(
      "UPDATE dat_phong SET trang_thai = 'đã trả', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );
    await client.query(
      "UPDATE phong SET trang_thai = 'đang dọn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [datPhong.phong_id]
    );

    // Tính tiền dịch vụ
    const dichVuResult = await client.query(
      "SELECT SUM(gia_tien * so_luong) as tong_tien_dich_vu FROM su_dung_dich_vu WHERE dat_phong_id = $1",
      [id]
    );

    const tongTienDichVu = Number.parseFloat(
      dichVuResult.rows[0].tong_tien_dich_vu || 0
    );

    // Tính tiền phòng với thời gian UTC
    const ketQuaTinhTien = calculateOptimalRoomCharge(
      new Date(datPhong.thoi_gian_vao),
      thoiGianRa,
      datPhong
    );

    // Tạo hóa đơn
    const hoaDonResult = await client.query(
      `INSERT INTO hoa_don (
          dat_phong_id, khach_hang_id, thoi_gian_tra, 
          tong_tien_phong, tong_tien_dich_vu, tong_tien,
          trang_thai_thanh_toan
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        id,
        datPhong.khach_hang_id,
        thoiGianRa.toISOString(), // Lưu thời gian UTC
        ketQuaTinhTien.tongTien,
        tongTienDichVu,
        ketQuaTinhTien.tongTien + tongTienDichVu,
        "chưa thanh toán",
      ]
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "Trả phòng thành công",
      hoaDon: {
        ...hoaDonResult.rows[0],
        chi_tiet_tinh_tien: ketQuaTinhTien.chiTiet,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing tra phong:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

export const getKhachDangO = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
        SELECT * FROM khach_dang_o ORDER BY so_tang, so_phong
      `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching khach dang o:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const tinhGiaTamThoi = async (req: Request, res: Response) => {
  const { dat_phong_id } = req.params;

  try {
    const datPhongResult = await pool.query(
      `
      SELECT dp.*, p.loai_phong_id, lp.*
      FROM dat_phong dp
      JOIN phong p ON dp.phong_id = p.id
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      WHERE dp.id = $1 AND dp.trang_thai = 'đã nhận'
    `,
      [dat_phong_id]
    );

    if (datPhongResult.rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin đặt phòng hoặc phòng chưa được nhận",
      });
    }

    const datPhong = datPhongResult.rows[0];

    // Convert stored UTC times to local timezone (UTC+7)
    const TIMEZONE_OFFSET = 7; // hours

    const convertToLocalTime = (date: Date): Date => {
      const localDate = new Date(date);
      localDate.setTime(localDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      return localDate;
    };

    const convertToDisplay = (date: Date): string => {
      const localDate = convertToLocalTime(date);
      return localDate.toISOString();
    };

    // Convert check-in time to local
    const thoiGianVao = new Date(datPhong.thoi_gian_vao);
    const localThoiGianVao = convertToLocalTime(thoiGianVao);

    // Get current time in local timezone
    const now = new Date();
    const localNow = convertToLocalTime(now);

    // Calculate prices using local time
    const tinhTienPhong = calculateOptimalRoomCharge(
      localThoiGianVao,
      localNow,
      datPhong
    );

    // Tính tiền dịch vụ đã sử dụng
    const dichVuResult = await pool.query(
      `
      SELECT SUM(gia_tien * so_luong) as tong_tien_dich_vu
      FROM su_dung_dich_vu
      WHERE dat_phong_id = $1
    `,
      [dat_phong_id]
    );

    const tongTienDichVu = Number(dichVuResult.rows[0].tong_tien_dich_vu || 0);

    // Chi tiết dịch vụ đã sử dụng
    const chiTietDichVu = await pool.query(
      `
      SELECT sd.*, dv.ten_dich_vu
      FROM su_dung_dich_vu sd
      JOIN dich_vu dv ON sd.dich_vu_id = dv.id
      WHERE sd.dat_phong_id = $1
      ORDER BY sd.thoi_gian_su_dung
    `,
      [dat_phong_id]
    );

    // Format response with converted times for display
    const response = {
      thoi_gian_vao: convertToDisplay(thoiGianVao),
      thoi_gian_hien_tai: convertToDisplay(now),
      tien_phong: {
        tongTien: tinhTienPhong.tongTien,
        chiTiet: tinhTienPhong.chiTiet.map((item) => ({
          ...item,
          donGia: Number(item.donGia),
          thanhTien: Number(item.thanhTien),
        })),
      },
      tien_dich_vu: {
        tong_tien: tongTienDichVu,
        chi_tiet: chiTietDichVu.rows.map((item) => ({
          ...item,
          gia_tien: Number(item.gia_tien),
          so_luong: Number(item.so_luong),
          thoi_gian_su_dung: convertToDisplay(new Date(item.thoi_gian_su_dung)),
        })),
      },
      tong_tien: Number(tinhTienPhong.tongTien) + Number(tongTienDichVu),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error calculating temporary price:", error);
    res.status(500).json({ message: "Server error" });
  }
};
