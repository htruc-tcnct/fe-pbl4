import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0", // Lắng nghe trên tất cả giao diện mạng
    port: 5173, // Chọnnk  cổng bạn muốn, mặc định là 8080
    open: true, // Mở trình duyệt tự động (tuỳ chọn)
  },
});
