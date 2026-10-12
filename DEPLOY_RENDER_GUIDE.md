# Hướng Dẫn Deploy Dự Án Lên Render (Web Service Miễn Phí)

Tài liệu này hướng dẫn từng bước đưa ứng dụng **English Reflex App** lên nền tảng **Render (render.com)** hoàn toàn miễn phí.

---

## 📌 Thông tin cấu hình chính trên Render

| Mục | Giá trị cần điền |
| :--- | :--- |
| **Type** | **Web Service** |
| **Language / Runtime** | **Node** |
| **Region** | **Singapore** (hoặc Oregon / Frankfurt) |
| **Branch** | `main` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | **Free** ($0/tháng) |

---

## 🚀 Các bước thực hiện chi tiết

### Bước 1: Đăng nhập Render
1. Truy cập [dashboard.render.com](https://dashboard.render.com).
2. Đăng nhập bằng tài khoản **GitHub** (chọn cùng tài khoản GitHub chứa repository `congtran2811/english-reflex-app`).

---

### Bước 2: Tạo mới Web Service
1. Nhấp vào nút **New +** ở góc trên cùng bên phải và chọn **Web Service**.
2. Tìm và chọn repository của bạn: **`congtran2811/english-reflex-app`** ➔ bấm **Connect**.
   *(Nếu chưa thấy repo, nhấp "Configure GitHub App" để cấp quyền cho Render truy cập repo).*

---

### Bước 3: Điền thông số thiết lập
Điền các mục như sau:
- **Name**: `english-reflex-app` (hoặc tên bất kỳ bạn thích).
- **Region**: Chọn `Singapore` (tốc độ tải về Việt Nam nhanh nhất).
- **Branch**: `main`.
- **Root Directory**: Để trống (hoặc `./`).
- **Runtime**: `Node`.
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Instance Type**: Chọn **Free** ($0/month).

---

### Bước 4: Thêm biến môi trường (Environment Variables)
Cuộn xuống phần **Environment Variables** (hoặc tab *Environment*), bấm **Add Environment Variable** và thêm các biến sau:

| Key | Value | Ghi chú |
| :--- | :--- | :--- |
| `NODE_VERSION` | `20.18.0` | **Bắt buộc** để tương thích Next.js |
| `AI_PRIMARY_PROVIDER` | `deepseek` | Ưu tiên dùng DeepSeek trên Cloud |
| `DEEPSEEK_API_KEY` | `sk-5f360571180c400a8fbb8254146c7fef` | API Key DeepSeek của bạn |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | Base URL của DeepSeek |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Model DeepSeek |
| `GEMINI_API_KEY` | *(Điền key Gemini nếu có)* | Dùng làm Fallback dự phòng |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model Gemini |
| `GROQ_API_KEY` | *(Điền key Groq nếu có)* | Dùng làm Fallback dự phòng |
| `OLLAMA_BASE_URL` | `https://ollama.conglab.site` | Cloudflare Tunnel Ollama của bạn |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Model Ollama |

---

### Bước 5: Bắt đầu Deploy
1. Nhấp nút **Deploy Web Service** (hoặc **Create Web Service**).
2. Render sẽ tự động kéo code từ GitHub về, chạy `npm install`, build dự án và khởi chạy service.
3. Quá trình build mất khoảng 2 - 3 phút. Khi thấy dòng:
   ```text
   ==> Your service is live 🎉
   ```
4. Bạn có thể nhấp vào đường link miễn phí do Render cung cấp (dạng `https://english-reflex-app-xxxx.onrender.com`) để bắt đầu sử dụng!

---

## 💡 Lưu ý quan trọng khi dùng gói Free của Render

1. **Sleep khi không có truy cập (Spin-down)**:
   - Gói miễn phí của Render sẽ tạm đưa ứng dụng vào trạng thái "ngủ" nếu không có ai truy cập trong vòng 15 phút.
   - Khi có người truy cập lại, lượt tải đầu tiên sẽ mất khoảng 30–50 giây để khởi động lại máy chủ (sau đó chạy nhanh bình thường).
2. **Auto Deploy khi push code mới**:
   - Mỗi lần bạn thực hiện `git push origin main`, Render sẽ tự động kích hoạt build lại và cập nhật phiên bản mới nhất ngay lập tức.
