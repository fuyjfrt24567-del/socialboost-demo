const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const sql = require("mssql");

const app = express();
const dbConfig = {
    user: "socialboost_user",
    password: "SocialBoost@123",
    server: "localhost",
    database: "SocialBoostDB",
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const dbPool = new sql.ConnectionPool(dbConfig);

dbPool.connect()
    .then(() => {
        console.log("Kết nối SQL Server thành công!");
    })
    .catch(err => {
        console.log("Lỗi kết nối SQL Server:", err);
    });
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "socialboost-secret-key",
        resave: false,
        saveUninitialized: false
    })
);

app.use(express.static(path.join(__dirname, "public")));

function getUsers() {
    try {
        return JSON.parse(fs.readFileSync("users.json", "utf8"));
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

const services = [
  {
    id: 1,
    platform: "TikTok",
    name: "TikTok Followers",
    price: 15000,
    unit: 1000,
    icon: "♪"
  },
  {
    id: 2,
    platform: "TikTok",
    name: "TikTok Views",
    price: 5000,
    unit: 1000,
    icon: "▶"
  },
  {
    id: 3,
    platform: "Facebook",
    name: "Facebook Likes",
    price: 12000,
    unit: 1000,
    icon: "f"
  },
  {
    id: 4,
    platform: "Facebook",
    name: "Facebook Reactions",
    price: 18000,
    unit: 1000,
    icon: "👍"
  },
  {
    id: 5,
    platform: "Instagram",
    name: "Instagram Followers",
    price: 20000,
    unit: 1000,
    icon: "◎"
  },
  {
    id: 6,
    platform: "Instagram",
    name: "Instagram Likes",
    price: 10000,
    unit: 1000,
    icon: "♥"
  },
  {
    id: 7,
    platform: "YouTube",
    name: "YouTube Views",
    price: 25000,
    unit: 1000,
    icon: "▶"
  }
];

app.get("/api/services", async (req, res) => {
    try {
        const result = await dbPool.request().query(`
            SELECT MaDV, TenDV, NenTang, DonGia, DonVi
            FROM DichVu
            WHERE TrangThai = N'Hoạt động'
        `);

        const services = result.recordset.map(s => ({
            id: s.MaDV,
            platform: s.NenTang,
            name: s.TenDV,
            price: Number(s.DonGia),
            unit: s.DonVi
        }));

        res.json(services);
    } catch (error) {
        console.error("Lỗi lấy dịch vụ:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách dịch vụ"
        });
    }
});
// LẤY DANH SÁCH ĐƠN HÀNG TỪ SQL
app.get("/api/orders", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json([]);
        }

        const result = await dbPool.request()
            .input("MaND", sql.Int, req.session.user.id)
            .query(`
                SELECT 
                    dh.MaDH,
                    dv.TenDV,
                    dh.SoLuong,
                    dh.TongTien,
                    dh.TrangThai,
                    dh.NgayTao
                FROM DonHang dh
                JOIN DichVu dv ON dh.MaDV = dv.MaDV
                WHERE dh.MaND = @MaND
                ORDER BY dh.MaDH DESC
            `);

        const orders = result.recordset.map(o => ({
            id: o.MaDH,
            serviceName: o.TenDV,
            quantity: o.SoLuong,
            total: Number(o.TongTien),
            status: o.TrangThai,
            createdAt: o.NgayTao
        }));

        res.json(orders);

    } catch (error) {
        console.error("Lỗi lấy đơn hàng:", error);
        res.status(500).json({
            message: "Không thể lấy đơn hàng"
        });
    }
});


// TẠO ĐƠN HÀNG VÀ LƯU VÀO SQL
app.post("/api/orders", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                message: "Bạn phải đăng nhập"
            });
        }

        const { serviceId, link, quantity } = req.body;

        const serviceResult = await dbPool.request()
            .input("MaDV", sql.Int, Number(serviceId))
            .query(`
                SELECT MaDV, TenDV, DonGia, DonVi
                FROM DichVu
                WHERE MaDV = @MaDV
            `);

        if (serviceResult.recordset.length === 0) {
            return res.status(400).json({
                message: "Dịch vụ không tồn tại"
            });
        }

        const service = serviceResult.recordset[0];
        const qty = Number(quantity);

        if (!qty || qty <= 0) {
            return res.status(400).json({
                message: "Số lượng không hợp lệ"
            });
        }

        const total =
            Math.ceil(qty / service.DonVi) * Number(service.DonGia);
            const userResult = await dbPool.request()
    .input("MaND", sql.Int, req.session.user.id)
    .query(`
        SELECT SoDu
        FROM NguoiDung
        WHERE MaND = @MaND
    `);

if (userResult.recordset.length === 0) {
    return res.status(404).json({
        message: "Không tìm thấy người dùng"
    });
}

const soDu = Number(userResult.recordset[0].SoDu);

if (soDu < total) {
    return res.status(400).json({
        message: "Số dư không đủ"
    });
}

        const result = await dbPool.request()
            .input("MaND", sql.Int, req.session.user.id)
            .input("MaDV", sql.Int, service.MaDV)
            .input("DuongDan", sql.NVarChar, link)
            .input("SoLuong", sql.Int, qty)
            .input("TongTien", sql.Decimal(18, 2), total)
            .input("TrangThai", sql.NVarChar, "Đang xử lý")
            .query(`
                INSERT INTO DonHang
                    (MaND, MaDV, DuongDan, SoLuong, TongTien, TrangThai)
                OUTPUT INSERTED.MaDH, INSERTED.NgayTao
                VALUES
                    (@MaND, @MaDV, @DuongDan, @SoLuong, @TongTien, @TrangThai)
            `);
            await dbPool.request()
  .input("MaND", sql.Int, req.session.user.id)
  .input("TongTien", sql.Decimal(18, 2), total)
  .query(`
    UPDATE NguoiDung
    SET SoDu = SoDu - @TongTien
    WHERE MaND = @MaND
  `);

req.session.user.balance = soDu - total;

        const newOrder = result.recordset[0];

        res.json({
            id: newOrder.MaDH,
            serviceName: service.TenDV,
            quantity: qty,
            total: total,
            status: "Đang xử lý",
            createdAt: newOrder.NgayTao
        });

    } catch (error) {
        console.error("Lỗi tạo đơn:", error);

        res.status(500).json({
            message: "Không thể tạo đơn hàng"
        });
    }
});
app.put("/api/orders/:id/status", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                message: "Bạn phải đăng nhập"
            });
        }

        const maDH = Number(req.params.id);
        const { status } = req.body;

        if (!["Đang xử lý", "Hoàn thành", "Đã hủy"].includes(status)) {
            return res.status(400).json({
                message: "Trạng thái không hợp lệ"
            });
        }

        const orderResult = await dbPool.request()
    .input("MaDH", sql.Int, maDH)
    .input("MaND", sql.Int, req.session.user.id)
    .query(`
        SELECT MaDH, MaND, TongTien, TrangThai
        FROM DonHang
        WHERE MaDH = @MaDH AND MaND = @MaND
    `);

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({
                message: "Không tìm thấy đơn hàng"
            });
        }

        const order = orderResult.recordset[0];

        if (order.TrangThai === "Đã hủy") {
            return res.status(400).json({
                message: "Đơn hàng này đã bị hủy"
            });
        }

        await dbPool.request()
            .input("MaDH", sql.Int, maDH)
            .input("TrangThai", sql.NVarChar, status)
            .query(`
                UPDATE DonHang
                SET TrangThai = @TrangThai
                WHERE MaDH = @MaDH
            `);

        if (status === "Đã hủy") {
            await dbPool.request()
                .input("MaND", sql.Int, order.MaND)
                .input("TongTien", sql.Decimal(18, 2), order.TongTien)
                .query(`
                    UPDATE NguoiDung
                    SET SoDu = SoDu + @TongTien
                    WHERE MaND = @MaND
                `);
                req.session.user.balance =
        Number(req.session.user.balance) + Number(order.TongTien);
        }

        res.json({
            success: true,
            message: "Cập nhật trạng thái thành công"
        });

    } catch (error) {
        console.error("Lỗi cập nhật trạng thái:", error);

        res.status(500).json({
            message: "Không thể cập nhật trạng thái"
        });
    }
});
// API ADMIN - XEM TẤT CẢ ĐƠN HÀNG
app.get("/api/admin/orders", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                message: "Bạn phải đăng nhập"
            });
        }

        if (req.session.user.role !== "admin") {
            return res.status(403).json({
                message: "Bạn không có quyền Admin"
            });
        }

        const result = await dbPool.request().query(`
            SELECT 
                dh.MaDH,
                dh.MaND,
                nd.TenDangNhap,
                dv.TenDV,
                dh.DuongDan,
                dh.SoLuong,
                dh.TongTien,
                dh.TrangThai,
                dh.NgayTao
            FROM DonHang dh
            JOIN NguoiDung nd ON dh.MaND = nd.MaND
            JOIN DichVu dv ON dh.MaDV = dv.MaDV
            ORDER BY dh.MaDH DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Lỗi Admin lấy đơn hàng:", error);

        res.status(500).json({
            message: "Không thể lấy danh sách đơn hàng"
        });
    }
});
app.get("/api/admin/users", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                message: "Bạn phải đăng nhập"
            });
        }

        if (req.session.user.role !== "admin") {
            return res.status(403).json({
                message: "Bạn không có quyền Admin"
            });
        }

        const result = await dbPool.request().query(`
            SELECT MaND, TenDangNhap, SoDu, VaiTro
            FROM NguoiDung
            ORDER BY MaND DESC
        `);

        res.json(result.recordset);

    } catch (error) {
        console.error("Lỗi lấy tài khoản:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách tài khoản"
        });
    }
});
app.put("/api/admin/users/:id/role", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                message: "Bạn phải đăng nhập"
            });
        }

        if (req.session.user.role !== "admin") {
            return res.status(403).json({
                message: "Bạn không có quyền Admin"
            });
        }

        const maND = Number(req.params.id);
        const { role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({
                message: "Vai trò không hợp lệ"
            });
        }

        await dbPool.request()
            .input("MaND", sql.Int, maND)
            .input("VaiTro", sql.NVarChar, role)
            .query(`
                UPDATE NguoiDung
                SET VaiTro = @VaiTro
                WHERE MaND = @MaND
            `);

        res.json({
            success: true,
            message: "Cập nhật quyền thành công"
        });

    } catch (error) {
        console.error("Lỗi cập nhật quyền:", error);
        res.status(500).json({
            message: "Không thể cập nhật quyền"
        });
    }
});
app.post("/api/register", async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;

        if (!username || !password || !confirmPassword) {
            return res.json({
                success: false,
                message: "Vui lòng nhập đầy đủ thông tin"
            });
        }

        if (username.length < 4) {
            return res.json({
                success: false,
                message: "Tên đăng nhập phải có ít nhất 4 ký tự"
            });
        }

        if (password.length < 6) {
            return res.json({
                success: false,
                message: "Mật khẩu phải có ít nhất 6 ký tự"
            });
        }

        if (password !== confirmPassword) {
            return res.json({
                success: false,
                message: "Mật khẩu nhập lại không khớp"
            });
        }

        const checkUser = await dbPool.request()
            .input("username", sql.NVarChar, username)
            .query(`
                SELECT MaND
                FROM NguoiDung
                WHERE TenDangNhap = @username
            `);

        if (checkUser.recordset.length > 0) {
            return res.json({
                success: false,
                message: "Tên đăng nhập đã tồn tại"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await dbPool.request()
            .input("username", sql.NVarChar, username)
            .input("password", sql.NVarChar, hashedPassword)
            .query(`
                INSERT INTO NguoiDung
                    (TenDangNhap, MatKhau, SoDu, VaiTro)
                VALUES
                    (@username, @password, 500000, 'user')
            `);

        res.json({
            success: true,
            message: "Đăng ký thành công"
        });

    } catch (error) {
        console.error("Lỗi đăng ký:", error);

        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ"
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({
                success: false,
                message: "Vui lòng nhập tên đăng nhập và mật khẩu"
            });
        }

        const result = await dbPool.request()
            .input("username", sql.NVarChar, username)
            .query(`
                SELECT MaND, TenDangNhap, MatKhau, SoDu, VaiTro
                FROM NguoiDung
                WHERE TenDangNhap = @username
            `);

        if (result.recordset.length === 0) {
            return res.json({
                success: false,
                message: "Sai tên đăng nhập hoặc mật khẩu"
            });
        }

        const user = result.recordset[0];

        const correctPassword = await bcrypt.compare(
            password,
            user.MatKhau
        );

        if (!correctPassword) {
            return res.json({
                success: false,
                message: "Sai tên đăng nhập hoặc mật khẩu"
            });
        }

        req.session.user = {
            id: user.MaND,
            username: user.TenDangNhap,
            balance: Number(user.SoDu),
            role: user.VaiTro
        };

        res.json({
            success: true,
            message: "Đăng nhập thành công"
        });

    } catch (error) {
        console.error("Lỗi đăng nhập:", error);

        res.status(500).json({
            success: false,
            message: "Lỗi máy chủ"
        });
    }
});

app.get("/api/me", (req, res) => {
    if (!req.session.user) {
        return res.json({
            loggedIn: false
        });
    }

    res.json({
        loggedIn: true,
        user: req.session.user
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            success: true
        });
    });
});

app.listen(PORT, () => {
    console.log(`SocialBoost đang chạy tại http://localhost:${PORT}`);
});