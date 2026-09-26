async function loadUsers() {
    try {
        const res = await fetch("/api/admin/users");

        if (res.status === 401) {
            alert("Bạn chưa đăng nhập");
            window.location.href = "/login.html";
            return;
        }

        if (res.status === 403) {
            alert("Bạn không có quyền Admin");
            window.location.href = "/index.html";
            return;
        }

        const users = await res.json();

        document.getElementById("userTable").innerHTML = users.map(user => `
            <tr>
                <td>${user.MaND}</td>
                <td>${user.TenDangNhap}</td>
                <td>${Number(user.SoDu).toLocaleString("vi-VN")}đ</td>
                <td>${user.VaiTro}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Lỗi tải tài khoản:", error);
    }
}

async function loadAdminOrders() {
  try {
    const res = await fetch("/api/admin/orders");

    if (!res.ok) return;

    const orders = await res.json();

    document.getElementById("adminOrderTable").innerHTML = orders.map(o => `
      <tr>
        <td>#${o.MaDH}</td>
        <td>${o.TenDangNhap}</td>
        <td>${o.TenDV}</td>
        <td>${Number(o.SoLuong).toLocaleString("vi-VN")}</td>
        <td>${Number(o.TongTien).toLocaleString("vi-VN")}đ</td>
        <td>${o.TrangThai}</td>

        <td>
          ${o.TrangThai?.trim() === "Đang xử lý" ? `
            <button onclick="adminUpdateOrder(${o.MaDH}, 'Hoàn thành')">
              Hoàn thành
            </button>

            <button onclick="adminUpdateOrder(${o.MaDH}, 'Đã hủy')">
              Hủy
            </button>
          ` : ""}
        </td>
      </tr>
    `).join("");

  } catch (error) {
    console.error("Lỗi tải đơn hàng:", error);
  }
}

window.adminUpdateOrder = async function(id, status) {
  const res = await fetch(`/api/orders/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  const data = await res.json();

  if (res.ok) {
    alert("Cập nhật trạng thái thành công");
    await loadAdminOrders();
  } else {
    alert(data.message || "Không thể cập nhật trạng thái");
  }
};

loadUsers();
loadAdminOrders();