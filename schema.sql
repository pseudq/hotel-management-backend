-- Tạo các ENUM types
CREATE TYPE trang_thai_phong AS ENUM ('trống', 'đang sử dụng', 'đang dọn', 'bảo trì');
CREATE TYPE loai_dat_phong AS ENUM ('giờ', 'ngày', 'đêm');
CREATE TYPE trang_thai_dat_phong AS ENUM ('đã đặt', 'đã nhận', 'đã trả', 'đã hủy');
CREATE TYPE trang_thai_thanh_toan AS ENUM ('chưa thanh toán', 'đã thanh toán', 'thanh toán một phần');

-- Bảng loại phòng
CREATE TABLE loai_phong (
    id SERIAL PRIMARY KEY,
    ten_loai_phong VARCHAR(100) NOT NULL,
    gia_qua_dem DECIMAL(10,2) NOT NULL,
    gia_gio_dau DECIMAL(10,2) NOT NULL,
    gia_theo_gio DECIMAL(10,2) NOT NULL,
    gia_qua_ngay DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng phòng
CREATE TABLE phong (
    id SERIAL PRIMARY KEY,
    so_phong VARCHAR(10) NOT NULL UNIQUE,
    so_tang INTEGER NOT NULL,
    loai_phong_id INTEGER REFERENCES loai_phong(id),
    trang_thai trang_thai_phong DEFAULT 'trống',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng khách hàng
CREATE TABLE khach_hang (
    id SERIAL PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    cmnd VARCHAR(20) NOT NULL UNIQUE,
    so_dien_thoai VARCHAR(15),
    email VARCHAR(100),
    dia_chi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng đặt phòng
CREATE TABLE dat_phong (
    id SERIAL PRIMARY KEY,
    khach_hang_id INTEGER REFERENCES khach_hang(id),
    phong_id INTEGER REFERENCES phong(id),
    thoi_gian_vao TIMESTAMP NOT NULL,
    thoi_gian_du_kien_ra TIMESTAMP,
    loai_dat TEXT,
    trang_thai trang_thai_dat_phong DEFAULT 'đã đặt',
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng dịch vụ
CREATE TABLE dich_vu (
    id SERIAL PRIMARY KEY,
    ten_dich_vu VARCHAR(100) NOT NULL,
    gia DECIMAL(10,2) NOT NULL,
    mo_ta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng sử dụng dịch vụ
CREATE TABLE su_dung_dich_vu (
    id SERIAL PRIMARY KEY,
    dat_phong_id INTEGER REFERENCES dat_phong(id),
    dich_vu_id INTEGER REFERENCES dich_vu(id),
    so_luong INTEGER DEFAULT 1,
    gia_tien DECIMAL(10,2) NOT NULL,
    thoi_gian_su_dung TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng hóa đơn
CREATE TABLE hoa_don (
    id SERIAL PRIMARY KEY,
    dat_phong_id INTEGER REFERENCES dat_phong(id),
    khach_hang_id INTEGER REFERENCES khach_hang(id),
    thoi_gian_tra TIMESTAMP NOT NULL,
    tong_tien_phong DECIMAL(10,2) NOT NULL,
    tong_tien_dich_vu DECIMAL(10,2) NOT NULL,
    tong_tien DECIMAL(10,2) NOT NULL,
    phuong_thuc_thanh_toan VARCHAR(50),
    trang_thai_thanh_toan trang_thai_thanh_toan DEFAULT 'chưa thanh toán',
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo view khách đang ở
CREATE OR REPLACE VIEW khach_dang_o AS
SELECT 
    dp.id as dat_phong_id,
    kh.id as khach_hang_id,
    kh.ho_ten,
    kh.cmnd,
    kh.so_dien_thoai,
    p.id as phong_id,
    p.so_phong,
    p.so_tang,
    lp.ten_loai_phong,
    dp.thoi_gian_vao,
    dp.thoi_gian_du_kien_ra,
    dp.loai_dat
FROM dat_phong dp
JOIN khach_hang kh ON dp.khach_hang_id = kh.id
JOIN phong p ON dp.phong_id = p.id
JOIN loai_phong lp ON p.loai_phong_id = lp.id
WHERE dp.trang_thai = 'đã nhận';

-- Tạo triggers để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loai_phong_updated_at
    BEFORE UPDATE ON loai_phong
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phong_updated_at
    BEFORE UPDATE ON phong
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_khach_hang_updated_at
    BEFORE UPDATE ON khach_hang
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dat_phong_updated_at
    BEFORE UPDATE ON dat_phong
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dich_vu_updated_at
    BEFORE UPDATE ON dich_vu
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_su_dung_dich_vu_updated_at
    BEFORE UPDATE ON su_dung_dich_vu
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hoa_don_updated_at
    BEFORE UPDATE ON hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Thêm một số dữ liệu mẫu
INSERT INTO loai_phong (ten_loai_phong, gia_qua_dem, gia_gio_dau, gia_theo_gio, gia_qua_ngay) VALUES
('Phòng Đơn', 200000, 50000, 30000, 300000),
('Phòng Đôi', 300000, 70000, 40000, 400000),
('Phòng VIP', 500000, 100000, 60000, 700000);

INSERT INTO phong (so_phong, so_tang, loai_phong_id, trang_thai) VALUES
('101', 1, 1, 'trống'),
('102', 1, 1, 'trống'),
('201', 2, 2, 'trống'),
('202', 2, 2, 'trống'),
('301', 3, 3, 'trống');

INSERT INTO dich_vu (ten_dich_vu, gia, mo_ta) VALUES
('Nước suối', 10000, 'Chai 500ml'),
('Coca Cola', 15000, 'Lon'),
('Mì tôm', 20000, 'Gói'),
('Giặt ủi', 50000, 'Kg'),
('Dọn phòng', 100000, 'Lần');

-- Tạo index để tối ưu truy vấn
CREATE INDEX idx_phong_trang_thai ON phong(trang_thai);
CREATE INDEX idx_dat_phong_trang_thai ON dat_phong(trang_thai);
CREATE INDEX idx_khach_hang_cmnd ON khach_hang(cmnd);
CREATE INDEX idx_dat_phong_thoi_gian ON dat_phong(thoi_gian_vao);
CREATE INDEX idx_hoa_don_thoi_gian ON hoa_don(thoi_gian_tra);

