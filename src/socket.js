import { reactive } from "vue";
import { io } from "socket.io-client";

export const state = reactive({
  connected: false,
  fooEvents: [],
  barEvents: [],
});

const URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"; // Dùng biến môi trường hoặc fallback là localhost
export const socket = io(URL, {
  withCredentials: true,
});
socket.on("connect", () => {
  state.connected = true;

  // Lấy giá trị từ localStorage
  const idOw = localStorage.getItem("idOwn");
  const documentId = localStorage.getItem("documentId");

  // Kiểm tra giá trị trước khi tiếp tục
  if (idOw && documentId) {
    // Tạo payload chỉ khi cả hai giá trị hợp lệ
    const payload = {
      userId: idOw.trim(),
      documentId: documentId.trim(),
    };

    // Gửi payload
    socket.emit("register", payload, (ack) => {
      if (ack && ack.success) {
        // Xóa giá trị khỏi localStorage chỉ khi server xác nhận thành công
        localStorage.removeItem("idOwn");
        localStorage.removeItem("documentId");
        console.log("Payload successfully registered:", payload);
      } else {
        console.error("Failed to register payload:", payload);
      }
    });
  } else {
    // console.error("Invalid data in localStorage:", { idOw, documentId });
  }
});

socket.on("disconnect", () => {
  state.connected = false;
});

socket.on("foo", (...args) => {
  state.fooEvents.push(args);
});

socket.on("bar", (...args) => {
  state.barEvents.push(args);
});
