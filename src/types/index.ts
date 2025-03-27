// Các enum types
export type TrangThaiPhong = "trống" | "đang sử dụng" | "đang dọn" | "bảo trì";
export type TrangThaiDatPhong = "đã đặt" | "đã nhận" | "đã trả" | "đã hủy";
export type TrangThaiThanhToan =
  | "chưa thanh toán"
  | "đã thanh toán"
  | "thanh toán một phần";
export type VaiTroNhanVien = "quản lý" | "nhân viên";

// Interface cho chi tiết tính tiền
export interface ChiTietTinhTien {
  loaiTinh:
    | "Qua đêm"
    | "Ngày"
    | "Giờ đầu"
    | "Giờ sau"
    | "Giờ phụ trội trước"
    | "Giờ phụ trội sau";
  soLuong: number;
  donGia: number;
  thanhTien: number;
}

// Interface cho kết quả tính tiền
export interface KetQuaTinhTien {
  tongTien: number;
  chiTiet: ChiTietTinhTien[];
}

// Interface cho loại phòng
export interface LoaiPhong {
  id: number;
  ten_loai_phong: string;
  gia_qua_dem: number; // Giá qua đêm (20h -> 11h hôm sau)
  gia_gio_dau: number; // Giá giờ đầu tiên
  gia_theo_gio: number; // Giá mỗi giờ tiếp theo
  gia_qua_ngay: number; // Giá theo ngày (24h)
  created_at?: Date;
  updated_at?: Date;
}

// Interface cho phòng
export interface Phong {
  id: number;
  so_phong: string;
  so_tang: number;
  loai_phong_id: number;
  trang_thai: TrangThaiPhong;
  created_at?: Date;
  updated_at?: Date;
}

// Interface cho khách hàng
export interface KhachHang {
  id: number;
  ho_ten: string;
  cmnd: string;
  so_dien_thoai?: string;
  email?: string;
  dia_chi?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Interface cho đặt phòng
export interface DatPhong {
  id: number;
  khach_hang_id: number;
  phong_id: number;
  thoi_gian_vao: Date;
  thoi_gian_du_kien_ra?: Date; // Optional vì sẽ tính theo thời gian thực tế
  trang_thai: TrangThaiDatPhong;
  ghi_chu?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Interface cho dịch vụ
export interface DichVu {
  id: number;
  ten_dich_vu: string;
  gia: number;
  mo_ta?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Interface cho sử dụng dịch vụ
export interface SuDungDichVu {
  id: number;
  dat_phong_id: number;
  dich_vu_id: number;
  so_luong: number;
  gia_tien: number;
  thoi_gian_su_dung: Date;
  ghi_chu?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Interface cho hóa đơn
export interface HoaDon {
  id: number;
  dat_phong_id: number;
  khach_hang_id: number;
  thoi_gian_tra: Date;
  tong_tien_phong: number;
  tong_tien_dich_vu: number;
  tong_tien: number;
  phuong_thuc_thanh_toan?: string;
  trang_thai_thanh_toan: TrangThaiThanhToan;
  ghi_chu?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Interface cho kết quả tính tiền tạm thời
export interface KetQuaTinhTienTamThoi {
  thoi_gian_vao: Date;
  thoi_gian_hien_tai: Date;
  tien_phong: KetQuaTinhTien;
  tien_dich_vu: {
    tong_tien: number;
    chi_tiet: (SuDungDichVu & { ten_dich_vu: string })[];
  };
  tong_tien: number;
}

// Interface cho nhân viên
export interface NhanVien {
  id: number;
  ho_ten: string;
  ten_dang_nhap: string;
  mat_khau: string;
  email?: string;
  so_dien_thoai?: string;
  dia_chi?: string;
  ngay_sinh?: Date;
  vai_tro: VaiTroNhanVien;
  ngay_bat_dau_lam: Date;
  created_at?: Date;
  updated_at?: Date;
}
