# Hướng Dẫn Cấu Hình & Chuyển Đổi AI Providers (Ollama & DeepSeek)

Tài liệu này hướng dẫn cách cấu hình và chuyển đổi linh hoạt giữa các nhà cung cấp AI trong hệ thống English Reflex App: **Ollama**, **DeepSeek**, **Google Gemini**, và **Groq**.

---

## 1. Tổng quan các AI Providers hỗ trợ

| Provider | Loại | Chi phí | Ưu điểm | Phù hợp nhất khi |
| :--- | :--- | :--- | :--- | :--- |
| **Ollama** | Local / Cloudflare Tunnel | 100% Miễn phí | Riêng tư, không lo hết quota, không giới hạn request | Chạy trên máy cá nhân hoặc qua tunnel riêng |
| **DeepSeek** | Cloud API | Siêu tiết kiệm | Tốc độ cao, tư duy logic & ngữ pháp cực tốt | Cần độ chính xác cao, không muốn mở máy host Ollama |
| **Google Gemini** | Cloud API | Miễn phí (Free Tier) | Phản hồi nhanh, ổn định | Dự phòng (Fallback) khi Ollama/DeepSeek bận |
| **Groq (Llama 3)** | Cloud API | Miễn phí (Free Tier) | Tốc độ sinh text siêu tốc (< 1s) | Dự phòng siêu tốc |

---

## 2. Cấu hình chi tiết trong `.env.local`

Mở file `.env.local` tại thư mục gốc của project `english-reflex-app`:

```env
# ====================================================================
# 1. LOCAL OLLAMA (Chạy trên máy hoặc qua Cloudflare Tunnel)
# ====================================================================
# Nếu chạy nội bộ trên cùng máy tính: http://127.0.0.1:11434
# Nếu chạy qua Cloudflare Tunnel: https://ollama.conglab.site
OLLAMA_BASE_URL=https://ollama.conglab.site
OLLAMA_MODEL=qwen2.5:3b

# ====================================================================
# 2. DEEPSEEK API (https://platform.deepseek.com)
# ====================================================================
# Lấy API Key tại: https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
# Các model hỗ trợ: deepseek-chat (V3 - nhanh, chuẩn), deepseek-reasoner (R1 - suy luận sâu)
DEEPSEEK_MODEL=deepseek-chat

# ====================================================================
# 3. GOOGLE GEMINI (Dự phòng)
# ====================================================================
# Lấy API Key miễn phí tại: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# ====================================================================
# 4. GROQ / LLAMA 3 (Dự phòng)
# ====================================================================
# Lấy API Key miễn phí tại: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# ====================================================================
# 5. LỰA CHỌN AI ƯU TIÊN (AI_PRIMARY_PROVIDER)
# ====================================================================
# Giá trị hợp lệ: ollama | deepseek | gemini | groq
AI_PRIMARY_PROVIDER=ollama
```

---

## 3. Cách chuyển đổi nhanh giữa Ollama và DeepSeek

Chỉ cần thay đổi giá trị của biến **`AI_PRIMARY_PROVIDER`** trong file `.env.local`:

### 👉 Cách 1: Ưu tiên dùng Ollama
```env
AI_PRIMARY_PROVIDER=ollama
```
- Hệ thống sẽ ưu tiên gửi request tới Ollama (`OLLAMA_BASE_URL`).
- Nếu Ollama bị tắt hoặc lỗi kết nối, hệ thống sẽ **tự động fallback** sang DeepSeek, Gemini, và Groq mà không làm gián đoạn bài học của bạn.

### 👉 Cách 2: Ưu tiên dùng DeepSeek
```env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_PRIMARY_PROVIDER=deepseek
```
- Hệ thống sẽ gọi trực tiếp DeepSeek Cloud API (`deepseek-chat`).
- Rất phù hợp khi bạn không bật máy tính chạy Ollama ở nhà hoặc muốn câu trả lời ngữ pháp sâu sắc nhất.

---

## 4. Các tính năng ứng dụng sử dụng AI

DeepSeek và Ollama được tích hợp xuyên suốt toàn bộ ứng dụng:

1. **Chấm điểm phản xạ (`/api/evaluate`)**:
   - Phân tích câu nói tiếng Anh của học viên so với câu tiếng Việt gốc.
   - Chấm điểm trên thang 100.
   - Phát hiện hiện tượng dịch thô từng từ (**Vinglish Alert**).
   - Đưa ra mẫu câu tự nhiên của người bản xứ (**Native Version**) và mẹo cải thiện (**Tip**).

2. **Sinh đề bài ngẫu nhiên (`/api/prompts/generate`)**:
   - Sinh 10 câu tiếng Việt thực tế theo 44 chủ đề đời sống đa dạng theo khung CEFR (A1-A2, B1, B2, C1).
   - Sinh các tình huống hội thoại Ping-Pong (Partner hỏi - Bạn đáp).

3. **Luyện nghe thông minh (`/api/listening/session`)**:
   - Sinh bài nghe phản xạ Audio Echo, Bắt từ khóa (Keyword), và Điền từ khuyết (Gap-fill).
   - Tự động trích xuất các hiện tượng nối âm, nuốt âm đặc trưng.

4. **Đóng vai giao tiếp tự do (`/api/roleplay`)**:
   - Tạo bối cảnh tình huống thực tế và tính cách nhân vật (Customer service, Phỏng vấn xin việc, Đặt phòng khách sạn,...).
   - Phản hồi và tiếp tục hội thoại theo thời gian thực dựa trên giọng nói của bạn.

---

## 5. Hướng dẫn kiểm tra và kiểm thử kết nối

### Kiểm tra kết nối Ollama:
Mở Terminal và chạy lệnh test gọi API:
```bash
curl -X POST https://ollama.conglab.site/api/chat -H "Content-Type: application/json" -d "{\"model\": \"qwen2.5:3b\", \"messages\": [{\"role\": \"user\", \"content\": \"Say hi in English\"}], \"stream\": false}"
```

### Kiểm tra kết nối DeepSeek:
Thay `sk-your-key` bằng key của bạn:
```bash
curl https://api.deepseek.com/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer sk-your-key" -d "{\"model\": \"deepseek-chat\", \"messages\": [{\"role\": \"user\", \"content\": \"Say hi in English\"}]}"
```

---

## 6. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `AIUnavailableError: All AI providers failed`**:
   - Kiểm tra xem bạn đã điền ít nhất một cấu hình hoạt động trong `.env.local` chưa (ví dụ: Ollama đang bật, hoặc `DEEPSEEK_API_KEY` hợp lệ).
   - Kiểm tra xem kết nối internet hoặc Cloudflare tunnel có đang thông suốt hay không.

2. **Thay đổi cấu hình trong `.env.local` nhưng chưa có tác dụng**:
   - Next.js đọc file `.env.local` khi khởi động. Hãy khởi động lại dev server nếu cần:
     ```bash
     npm run dev
     ```
