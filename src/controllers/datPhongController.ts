import { Request, Response } from "express";
import pool from "../config/db";
import { DatPhong } from "../types";

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
    loai_dat,
    trang_thai,
    ghi_chu,
  } = req.body as DatPhong;

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

    // Tạo đặt phòng mới
    const datPhongResult = await client.query(
      `INSERT INTO dat_phong (
        khach_hang_id, phong_id, thoi_gian_vao, thoi_gian_du_kien_ra, 
        loai_dat, trang_thai, ghi_chu
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        khach_hang_id,
        phong_id,
        thoi_gian_vao,
        thoi_gian_du_kien_ra,
        loai_dat,
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
    loai_dat,
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
        loai_dat = $5, 
        trang_thai = $6, 
        ghi_chu = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [
        khach_hang_id || current.khach_hang_id,
        phong_id || current.phong_id,
        thoi_gian_vao || current.thoi_gian_vao,
        thoi_gian_du_kien_ra || current.thoi_gian_du_kien_ra,
        loai_dat || current.loai_dat,
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

  // Bắt đầu transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lấy thông tin đặt phòng
    const datPhongResult = await client.query(
      `SELECT dp.*, p.id as phong_id 
       FROM dat_phong dp 
       JOIN phong p ON dp.phong_id = p.id 
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

    // Cập nhật trạng thái đặt phòng
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

    const tongTienDichVu = parseFloat(
      dichVuResult.rows[0].tong_tien_dich_vu || 0
    );

    // Lấy thông tin loại phòng để tính tiền phòng
    const loaiPhongResult = await client.query(
      `SELECT lp.* 
         FROM loai_phong lp
         JOIN phong p ON p.loai_phong_id = lp.id
         WHERE p.id = $1`,
      [datPhong.phong_id]
    );

    const loaiPhong = loaiPhongResult.rows[0];

    // Tính tiền phòng dựa vào loại đặt và thời gian
    const thoiGianVao = new Date(datPhong.thoi_gian_vao);
    const thoiGianRa = new Date();
    const thoiGianSuDung =
      (thoiGianRa.getTime() - thoiGianVao.getTime()) / (60 * 60 * 1000); // Số giờ

    let tongTienPhong = 0;

    if (datPhong.loai_dat === "giờ") {
      tongTienPhong =
        loaiPhong.gia_gio_dau +
        Math.max(0, Math.ceil(thoiGianSuDung) - 1) * loaiPhong.gia_theo_gio;
    } else if (datPhong.loai_dat === "ngày") {
      tongTienPhong = Math.ceil(thoiGianSuDung / 24) * loaiPhong.gia_qua_ngay;
    } else if (datPhong.loai_dat === "đêm") {
      tongTienPhong = Math.ceil(thoiGianSuDung / 24) * loaiPhong.gia_qua_dem;
    }

    const tongTien = tongTienPhong + tongTienDichVu;

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
        thoiGianRa,
        tongTienPhong,
        tongTienDichVu,
        tongTien,
        "chưa thanh toán",
      ]
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "Trả phòng thành công",
      hoaDon: hoaDonResult.rows[0],
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
