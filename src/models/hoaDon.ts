// Helper function to convert UTC time to Vietnam time (UTC+7)
function convertToVietnamTime(utcDate: Date): Date {
  const vietnamTime = new Date(utcDate);
  vietnamTime.setHours(vietnamTime.getHours() + 7);
  return vietnamTime;
}

// Helper function to round hours based on minutes
function getHours(durationMinutes: number, minOne = false): number {
  const wholeHours = Math.floor(durationMinutes / 60);
  const remainder = durationMinutes % 60;
  // Làm tròn lên nếu phút > 5, ngược lại giữ nguyên
  let hours = wholeHours + (remainder > 5 ? 1 : 0);
  if (minOne && hours === 0) {
    hours = 1;
  }
  return hours;
}

// Tính số giờ giữa hai thời điểm, làm tròn theo quy tắc
function calculateHours(start: Date, end: Date): number {
  const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
  return getHours(durationMinutes, true);
}

// Tính số ngày giữa hai thời điểm
function calculateDays(start: Date, end: Date): number {
  const durationHours = (end.getTime() - start.getTime()) / (3600 * 1000);
  return Math.ceil(durationHours / 24);
}

// Tính giá theo giờ
function calculateHourlyPrice(
  start: Date,
  end: Date,
  giaGioDau: number,
  giaGioSau: number
): { tongTien: number; chiTiet: any[] } {
  const hours = calculateHours(start, end);
  const chiTiet = [];

  // Giờ đầu tiên
  chiTiet.push({
    loaiTinh: "Giờ đầu",
    soLuong: 1,
    donGia: giaGioDau,
    thanhTien: giaGioDau,
  });

  // Các giờ tiếp theo
  if (hours > 1) {
    chiTiet.push({
      loaiTinh: "Giờ sau",
      soLuong: hours - 1,
      donGia: giaGioSau,
      thanhTien: (hours - 1) * giaGioSau,
    });
  }

  const tongTien = giaGioDau + (hours - 1) * giaGioSau;

  return { tongTien, chiTiet };
}

// Tính giá qua đêm (19:00 - 11:00 hôm sau)
function calculateOvernightPrice(
  start: Date,
  end: Date,
  giaQuaDem: number,
  giaGioSau: number
): { tongTien: number; chiTiet: any[] } {
  const chiTiet = [];
  let tongTien = 0;

  // Tạo bản sao để không ảnh hưởng đến tham số gốc
  const checkIn = new Date(start.getTime());
  const checkOut = new Date(end.getTime());

  // Kiểm tra trường hợp đặc biệt: check-in sau nửa đêm và trước 11 giờ sáng cùng ngày với check-out
  if (
    checkIn.getUTCHours() < 11 &&
    checkIn.getUTCDate() === checkOut.getUTCDate()
  ) {
    // Đây là trường hợp đặc biệt: check-in sớm buổi sáng cùng ngày với check-out
    // Tính là 1 đêm qua đêm
    chiTiet.push({
      loaiTinh: "Qua đêm",
      soLuong: 1,
      donGia: giaQuaDem,
      thanhTien: giaQuaDem,
    });
    tongTien += giaQuaDem;

    // Kiểm tra phụ thu trả muộn nếu checkout sau 11:00
    if (
      checkOut.getUTCHours() > 11 ||
      (checkOut.getUTCHours() === 11 && checkOut.getUTCMinutes() > 0)
    ) {
      const lateStart = new Date(checkOut.getTime());
      lateStart.setUTCHours(11, 0, 0, 0);
      const lateHours = calculateHours(lateStart, checkOut);

      if (lateHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu trả muộn",
          soLuong: lateHours,
          donGia: giaGioSau,
          thanhTien: lateHours * giaGioSau,
        });
        tongTien += lateHours * giaGioSau;
      }
    }

    return { tongTien, chiTiet };
  }

  // Tính số đêm
  let soDem = 0;
  let currentNight = new Date(checkIn.getTime());

  // Điều chỉnh thời gian bắt đầu đêm đầu tiên - 19:00 UTC
  const firstNightStart = new Date(currentNight.getTime());
  firstNightStart.setUTCHours(19, 0, 0, 0);

  // Nếu check-in sau 19:00, sử dụng thời gian check-in
  // Nếu check-in trước 19:00, sử dụng 19:00
  if (checkIn.getTime() > firstNightStart.getTime()) {
    currentNight = new Date(checkIn.getTime());
  } else {
    currentNight = new Date(firstNightStart.getTime());
  }

  while (currentNight.getTime() < checkOut.getTime()) {
    // Thời gian kết thúc đêm hiện tại là 11:00 sáng hôm sau
    const nightEnd = new Date(currentNight.getTime());
    nightEnd.setUTCDate(nightEnd.getUTCDate() + 1);
    nightEnd.setUTCHours(11, 0, 0, 0);

    // Nếu checkout trước kết thúc đêm, đây là đêm cuối cùng
    if (checkOut.getTime() <= nightEnd.getTime()) {
      soDem++;
      break;
    }

    // Tăng số đêm và chuyển sang đêm tiếp theo
    soDem++;
    currentNight = new Date(nightEnd.getTime());

    // Đêm tiếp theo bắt đầu lúc 19:00
    currentNight.setUTCHours(19, 0, 0, 0);

    // Nếu có khoảng trống giữa 11:00 và 19:00, sẽ tính riêng sau
  }

  // Thêm chi tiết số đêm
  if (soDem > 0) {
    chiTiet.push({
      loaiTinh: "Qua đêm",
      soLuong: soDem,
      donGia: giaQuaDem,
      thanhTien: soDem * giaQuaDem,
    });
    tongTien += soDem * giaQuaDem;
  }

  // Tính phụ thu đến sớm (trước 19:00)
  if (checkIn.getUTCHours() < 19) {
    const earlyStart = new Date(checkIn.getTime());
    const earlyEnd = new Date(checkIn.getTime());
    earlyEnd.setUTCHours(19, 0, 0, 0);

    // Nếu check-in cùng ngày và trước 19:00
    if (earlyStart.getTime() < earlyEnd.getTime()) {
      const earlyHours = calculateHours(earlyStart, earlyEnd);
      if (earlyHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu đến sớm",
          soLuong: earlyHours,
          donGia: giaGioSau,
          thanhTien: earlyHours * giaGioSau,
        });
        tongTien += earlyHours * giaGioSau;
      }
    }
  }

  // Tính phụ thu trả muộn (sau 11:00)
  if (
    checkOut.getUTCHours() > 11 ||
    (checkOut.getUTCHours() === 11 && checkOut.getUTCMinutes() > 0)
  ) {
    const lateStart = new Date(checkOut.getTime());
    lateStart.setUTCHours(11, 0, 0, 0);
    const lateEnd = new Date(checkOut.getTime());

    // Nếu checkout cùng ngày và sau 11:00
    if (lateStart.getTime() < lateEnd.getTime()) {
      const lateHours = calculateHours(lateStart, lateEnd);
      if (lateHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu trả muộn",
          soLuong: lateHours,
          donGia: giaGioSau,
          thanhTien: lateHours * giaGioSau,
        });
        tongTien += lateHours * giaGioSau;
      }
    }
  }

  // Tính phụ thu cho khoảng thời gian giữa các đêm (11:00 - 19:00)
  if (soDem > 1) {
    const currentDay = new Date(checkIn.getTime());
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    currentDay.setUTCHours(11, 0, 0, 0);

    for (let i = 0; i < soDem - 1; i++) {
      const dayStart = new Date(currentDay.getTime());
      const dayEnd = new Date(currentDay.getTime());
      dayEnd.setUTCHours(19, 0, 0, 0);

      if (dayStart.getTime() < dayEnd.getTime()) {
        const dayHours = calculateHours(dayStart, dayEnd);
        if (dayHours > 0) {
          chiTiet.push({
            loaiTinh: "Phụ thu giữa các đêm",
            soLuong: dayHours,
            donGia: giaGioSau,
            thanhTien: dayHours * giaGioSau,
          });
          tongTien += dayHours * giaGioSau;
        }
      }

      currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    }
  }

  return { tongTien, chiTiet };
}

// Tính giá theo ngày (12:00 - 12:00 hôm sau)
function calculateDailyPrice(
  start: Date,
  end: Date,
  giaTheoNgay: number,
  giaGioSau: number
): { tongTien: number; chiTiet: any[] } {
  const chiTiet = [];
  let tongTien = 0;

  // Tạo bản sao và đảm bảo sử dụng UTC
  const checkIn = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds()
    )
  );

  const checkOut = new Date(
    Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
      end.getUTCHours(),
      end.getUTCMinutes(),
      end.getUTCSeconds()
    )
  );

  // --- FIX: Cải thiện xử lý cho trường hợp check-in gần trưa ---

  // Trường hợp 1: Check-in sau nửa đêm và trước 12 giờ trưa, check-out ngày hôm sau
  // Hoặc Trường hợp 2: Check-in trước 12 giờ trưa của ngày đầu tiên, check-out ngày hôm sau
  if (
    checkIn.getUTCDate() !== checkOut.getUTCDate() &&
    (checkIn.getUTCHours() < 12 ||
      // Bao gồm cả trường hợp gần trưa (sau 11:00, trước 12:00)
      (checkIn.getUTCHours() === 11 && checkIn.getUTCMinutes() > 0))
  ) {
    // Tính số ngày đầy đủ, không dựa vào mốc 12:00, để xử lý trường hợp check-in gần trưa
    let soNgay;

    // Tính số ngày giữa 2 ngày (không tính giờ)
    const startDate = new Date(
      Date.UTC(
        checkIn.getUTCFullYear(),
        checkIn.getUTCMonth(),
        checkIn.getUTCDate()
      )
    );
    const endDate = new Date(
      Date.UTC(
        checkOut.getUTCFullYear(),
        checkOut.getUTCMonth(),
        checkOut.getUTCDate()
      )
    );
    const diffDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Nếu check-in từ 11:00 - 12:00, xem như là buổi trưa (tính 1 ngày đầy đủ)
    if (checkIn.getUTCHours() === 11 && checkIn.getUTCMinutes() > 0) {
      soNgay = diffDays;
    } else {
      soNgay = diffDays;
    }

    // Đảm bảo có ít nhất 1 ngày
    if (soNgay < 1) soNgay = 1;

    chiTiet.push({
      loaiTinh: "Theo ngày",
      soLuong: soNgay,
      donGia: giaTheoNgay,
      thanhTien: soNgay * giaTheoNgay,
    });
    tongTien += soNgay * giaTheoNgay;

    // Kiểm tra phụ thu đến sớm (chỉ áp dụng nếu check-in trước 11:00 sáng)
    if (checkIn.getUTCHours() < 11) {
      const earlyCheckInNoon = new Date(checkIn.getTime());
      earlyCheckInNoon.setUTCHours(11, 0, 0, 0);

      if (checkIn < earlyCheckInNoon) {
        const earlyHours = calculateHours(checkIn, earlyCheckInNoon);
        if (earlyHours > 0) {
          chiTiet.push({
            loaiTinh: "Phụ thu đến sớm",
            soLuong: earlyHours,
            donGia: giaGioSau,
            thanhTien: earlyHours * giaGioSau,
          });
          tongTien += earlyHours * giaGioSau;
        }
      }
    }

    // Kiểm tra phụ thu trả muộn nếu checkout sau 12:00 trưa của ngày cuối
    const checkOutDayNoon = new Date(
      Date.UTC(
        checkOut.getUTCFullYear(),
        checkOut.getUTCMonth(),
        checkOut.getUTCDate(),
        12,
        0,
        0
      )
    );

    if (checkOut > checkOutDayNoon) {
      const lateHours = calculateHours(checkOutDayNoon, checkOut);
      if (lateHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu trả muộn",
          soLuong: lateHours,
          donGia: giaGioSau,
          thanhTien: lateHours * giaGioSau,
        });
        tongTien += lateHours * giaGioSau;
      }
    }

    return { tongTien, chiTiet };
  }

  let soNgay = 0;

  // Mốc tính ngày là 12:00 trưa UTC
  const checkInDayNoon = new Date(
    Date.UTC(
      checkIn.getUTCFullYear(),
      checkIn.getUTCMonth(),
      checkIn.getUTCDate(),
      12,
      0,
      0
    )
  );

  const checkOutDayNoon = new Date(
    Date.UTC(
      checkOut.getUTCFullYear(),
      checkOut.getUTCMonth(),
      checkOut.getUTCDate(),
      12,
      0,
      0
    )
  );

  // ===== FIX: Sửa lỗi tính số ngày =====
  // Xác định điểm bắt đầu tính ngày (tempCurrentDay)
  let tempCurrentDay = new Date(
    Date.UTC(
      checkIn.getUTCFullYear(),
      checkIn.getUTCMonth(),
      checkIn.getUTCDate() + 1,
      12,
      0,
      0
    )
  );

  // Tính số ngày tròn từ 12:00 trưa đến 12:00 trưa (UTC)
  while (tempCurrentDay <= checkOutDayNoon) {
    const nextDayNoon = new Date(
      Date.UTC(
        tempCurrentDay.getUTCFullYear(),
        tempCurrentDay.getUTCMonth(),
        tempCurrentDay.getUTCDate() + 1,
        12,
        0,
        0
      )
    );

    // Nếu thời điểm checkout trước hoặc bằng 12h trưa của ngày tiếp theo, thì tính là hết ngày này
    if (checkOut <= nextDayNoon) {
      soNgay++;
      break; // Đã đến ngày cuối
    }

    // Nếu không, tăng ngày và tiếp tục vòng lặp
    soNgay++;
    tempCurrentDay = nextDayNoon; // Chuyển sang mốc 12h trưa ngày tiếp theo
  }

  // Đảm bảo số ngày không vượt quá thực tế
  const totalDays = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (soNgay > totalDays) {
    soNgay = totalDays;
  }

  if (soNgay > 0) {
    chiTiet.push({
      loaiTinh: "Theo ngày",
      soLuong: soNgay,
      donGia: giaTheoNgay,
      thanhTien: soNgay * giaTheoNgay,
    });
    tongTien += soNgay * giaTheoNgay;
  }

  // Tính phụ thu đến sớm (checkin trước 12:00 trưa ngày đầu) - sử dụng UTC
  if (checkIn < checkInDayNoon) {
    const earlyHours = calculateHours(checkIn, checkInDayNoon);
    if (earlyHours > 0) {
      chiTiet.push({
        loaiTinh: "Phụ thu đến sớm",
        soLuong: earlyHours,
        donGia: giaGioSau,
        thanhTien: earlyHours * giaGioSau,
      });
      tongTien += earlyHours * giaGioSau;
    }
  }

  // Tính phụ thu trả muộn (checkout sau 12:00 trưa ngày cuối) - sử dụng UTC
  if (checkOut > checkOutDayNoon) {
    const lateHours = calculateHours(checkOutDayNoon, checkOut);
    if (lateHours > 0) {
      chiTiet.push({
        loaiTinh: "Phụ thu trả muộn",
        soLuong: lateHours,
        donGia: giaGioSau,
        thanhTien: lateHours * giaGioSau,
      });
      tongTien += lateHours * giaGioSau;
    }
  }

  return { tongTien, chiTiet };
}

// Hàm chính để tính giá tối ưu
export function calculateOptimalPrice(
  checkin: Date,
  checkout: Date,
  giaQuaDem = 150000,
  giaTheoNgay = 250000,
  giaGioDau = 50000,
  giaGioSau = 20000
): number {
  // Chuyển đổi thời gian từ UTC sang giờ Việt Nam
  const vietnamCheckin = convertToVietnamTime(checkin);
  const vietnamCheckout = convertToVietnamTime(checkout);
  // Tính giá theo từng phương thức
  const hourlyPrice = calculateHourlyPrice(
    vietnamCheckin,
    vietnamCheckout,
    giaGioDau,
    giaGioSau
  ).tongTien;
  const overnightPrice = calculateOvernightPrice(
    vietnamCheckin,
    vietnamCheckout,
    giaQuaDem,
    giaGioSau
  ).tongTien;
  const dailyPrice = calculateDailyPrice(
    vietnamCheckin,
    vietnamCheckout,
    giaTheoNgay,
    giaGioSau
  ).tongTien;

  // Trả về giá thấp nhất
  return Math.min(hourlyPrice, overnightPrice, dailyPrice);
}

// Hàm chính để tính giá tối ưu và trả về chi tiết
export const calculateOptimalRoomCharge = (
  thoiGianVao: Date,
  thoiGianRa: Date,
  loaiPhong: any
): {
  tongTien: number;
  chiTiet: {
    loaiTinh: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
    ghiChu?: string;
  }[];
} => {
  // Chuyển đổi thời gian từ UTC sang giờ Việt Nam
  const vietnamThoiGianVao = convertToVietnamTime(thoiGianVao);
  const vietnamThoiGianRa = convertToVietnamTime(thoiGianRa);

  // Log để debug
  console.log(
    `UTC Check-in: ${thoiGianVao.toISOString()}, Vietnam Check-in: ${vietnamThoiGianVao}`
  );
  console.log(
    `UTC Check-out: ${thoiGianRa.toISOString()}, Vietnam Check-out: ${vietnamThoiGianRa}`
  );

  // Lấy giá từ loại phòng
  const giaQuaDem = Number(loaiPhong.gia_qua_dem) || 150000;
  const giaTheoNgay = Number(loaiPhong.gia_qua_ngay) || 250000;
  const giaGioDau = Number(loaiPhong.gia_gio_dau) || 50000;
  const giaGioSau = Number(loaiPhong.gia_theo_gio) || 20000;

  // Tính tổng số phút ở lại
  const durationMinutes =
    (thoiGianRa.getTime() - thoiGianVao.getTime()) / (60 * 1000);

  // Nếu dưới 6 tiếng thì luôn tính theo giờ
  if (durationMinutes < 360) {
    return calculateHourlyPrice(thoiGianVao, thoiGianRa, giaGioDau, giaGioSau);
  }

  // Tính giá theo từng phương thức
  const hourlyResult = calculateHourlyPrice(
    vietnamThoiGianVao,
    vietnamThoiGianRa,
    giaGioDau,
    giaGioSau
  );
  const overnightResult = calculateOvernightPrice(
    vietnamThoiGianVao,
    vietnamThoiGianRa,
    giaQuaDem,
    giaGioSau
  );
  const dailyResult = calculateDailyPrice(
    vietnamThoiGianVao,
    vietnamThoiGianRa,
    giaTheoNgay,
    giaGioSau
  );

  // Log để debug
  console.log(`Hourly price: ${hourlyResult.tongTien}`);
  console.log(`Overnight price: ${overnightResult.tongTien}`);
  console.log(`Daily price: ${dailyResult.tongTien}`);

  // So sánh để tìm phương án rẻ nhất
  let bestResult = hourlyResult;
  if (overnightResult.tongTien < bestResult.tongTien) {
    bestResult = overnightResult;
  }

  // FIX: Loại bỏ giới hạn thời gian cho phương thức tính theo ngày
  // để cho phép tính đúng trường hợp check-in gần trưa
  if (dailyResult.tongTien < bestResult.tongTien) {
    bestResult = dailyResult;
  }

  // Thêm thông tin về múi giờ vào chi tiết
  bestResult.chiTiet.unshift({
    loaiTinh: "Thông tin thời gian",
    soLuong: 0,
    donGia: 0,
    thanhTien: 0,
    ghiChu: `Check-in: ${vietnamThoiGianVao.toLocaleString(
      "vi-VN"
    )} - Check-out: ${vietnamThoiGianRa.toLocaleString(
      "vi-VN"
    )} (Giờ Việt Nam)`,
  });

  return bestResult;
};
