let services = [];

const money = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

async function loadServices() {
  const res = await fetch('/api/services');
  services = await res.json();
  renderServices();
  fillServiceSelect();
  updatePrice();
}

function getIcon(platform) {
  if (platform === "TikTok")
    return '<img src="https://cdn.simpleicons.org/tiktok/ffffff" alt="TikTok">';

  if (platform === "YouTube")
    return '<img src="https://cdn.simpleicons.org/youtube/FF0000" alt="YouTube">';

  if (platform === "Facebook")
    return '<img src="https://cdn.simpleicons.org/facebook/1877F2" alt="Facebook">';

  if (platform === "Instagram")
    return '<img src="https://cdn.simpleicons.org/instagram/E4405F" alt="Instagram">';

  return "";
}
function renderServices() {
  const grid = document.getElementById('serviceGrid');
  const filter = document.getElementById('platformFilter').value;
  const keyword = document.getElementById('searchInput').value.toLowerCase().trim();

  const filtered = services.filter(s =>
    (filter === 'all' || s.platform === filter) &&
    (s.name.toLowerCase().includes(keyword) || s.platform.toLowerCase().includes(keyword))
  );

  grid.innerHTML = filtered.map(s => `
    <article class="service-card">
      <div class="service-icon">${getIcon(s.platform)}</div>
      <h3>${s.name}</h3>
      <p>${s.platform} · ${new Intl.NumberFormat('vi-VN').format(s.unit)} lượt</p>
      <strong>${money(s.price)}</strong>
      <button onclick="chooseService(${s.id})">Chọn</button>
    </article>
  `).join('') || '<p>Không tìm thấy dịch vụ.</p>';
}

function fillServiceSelect() {
  const select = document.getElementById("serviceSelect");

  select.innerHTML = services.map(s =>
    `<option value="${s.id}">${s.platform} - ${s.name} - ${money(s.price)}</option>`
  ).join("");

  if (services.length > 0) {
    select.value = services[0].id;
    updatePrice();
  }
}

function chooseService(id) {
  document.getElementById('serviceSelect').value = id;
  updatePrice();
  location.hash = 'order';
}

function updatePrice() {
  const id = Number(document.getElementById('serviceSelect').value);
  const qty = Number(document.getElementById('quantityInput').value || 0);
  const s = services.find(x => x.id === id);
  const total = s ? Math.ceil((qty / s.unit) * s.price) : 0;
  document.getElementById('totalPrice').textContent = money(total);
}

async function loadOrders() {
  const res = await fetch("/api/orders");
  const data = await res.json();

  document.getElementById("orderTable").innerHTML = data.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td>${o.serviceName}</td>
      <td>${new Intl.NumberFormat("vi-VN").format(o.quantity)}</td>
      <td>${money(o.total)}</td>
      <td><span class="status">${o.status}</span></td>
      <td>${new Date(o.createdAt).toLocaleString("vi-VN")}</td>
      <td>
        ${o.status === "Đang xử lý" ? `
    <button onclick="updateOrderStatus(${o.id}, 'Đã hủy')">
        Hủy
    </button>
` : ""}
      </td>
    </tr>
  `).join("");
}
window.updateOrderStatus = async function(id, status) {
  const res = await fetch(`/api/orders/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });

  const data = await res.json();

  if (res.ok) {
    await loadOrders();
  } else {
    alert(data.message || "Không thể cập nhật trạng thái");
  }
};

document.getElementById('platformFilter').addEventListener('change', renderServices);
document.getElementById('searchInput').addEventListener('input', renderServices);
document.getElementById('serviceSelect').addEventListener('change', updatePrice);
document.getElementById('quantityInput').addEventListener('input', updatePrice);
document.getElementById('menuBtn').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

document.getElementById("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    serviceId: Number(document.getElementById("serviceSelect").value),
    link: document.getElementById("linkInput").value,
    quantity: Number(document.getElementById("quantityInput").value)
  };

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const msg = document.getElementById("formMessage");

    if (res.ok) {
      if (msg) {
        msg.textContent = "Tạo đơn " + data.id + " thành công.";
        msg.style.color = "#55e6d2";
      }

      document.getElementById("linkInput").value = "";

      await loadOrders();
      await checkLogin();

      location.hash = "history";
    } else {
      if (msg) {
        msg.textContent = data.message || "Có lỗi xảy ra.";
        msg.style.color = "#ff6868";
      }
    }
  } catch (error) {
    console.error(error);

    const msg = document.getElementById("formMessage");
    if (msg) {
      msg.textContent = "Không thể tạo đơn hàng.";
      msg.style.color = "#ff6868";
    }
  }
});

loadServices();
loadOrders();
async function checkLogin() {
    try {
        const response = await fetch("/api/me");
        const data = await response.json();

        const guestArea = document.getElementById("guestArea");
        const loggedArea = document.getElementById("loggedArea");
        const adminMenu = document.getElementById("adminMenu");

        if (!guestArea || !loggedArea) return;

        if (data.loggedIn) {

            guestArea.style.display = "none";
            loggedArea.style.display = "flex";

            document.getElementById("displayUsername").textContent =
                data.user.username;

            document.getElementById("displayBalance").textContent =
                Number(data.user.balance).toLocaleString("vi-VN") + "đ";

            document.getElementById("userAvatar").textContent =
                data.user.username.charAt(0).toUpperCase();
        if (adminMenu) {
        adminMenu.style.display =
            data.user.role === "admin" ? "block" : "none";
    }

        } else {

            guestArea.style.display = "flex";
            loggedArea.style.display = "none";
        if (adminMenu) {
        adminMenu.style.display = "none";
    }
        }

    } catch (error) {
        console.log("Lỗi kiểm tra đăng nhập:", error);
    }
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        await fetch("/api/logout", {
            method: "POST"
        });

        window.location.reload();

    });

}

checkLogin();
function showSection() {
  const hash = location.hash || "#home";
  const sectionId = hash.substring(1);

  const sections = [
    "home",
    "services",
    "order",
    "history",
    "deposit",
    "contact"
  ];

  sections.forEach(id => {
    const section = document.getElementById(id);

    if (section) {
      section.style.display = id === sectionId ? "" : "none";
    }
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("active");

    if (link.getAttribute("href") === hash) {
      link.classList.add("active");
    }
  });
}
