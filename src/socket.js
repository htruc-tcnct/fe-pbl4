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
  const userId = localStorage.getItem("idUser");
  const documentId = localStorage.getItem("documentId");

  // Kiểm tra giá trị trước khi tiếp tục
  if (idOw && documentId) {
    // Tạo payload chỉ khi cả hai giá trị hợp lệ
    const payload = {
      userId: userId.trim(),
      documentId: documentId.trim(),
      ownerId: idOw.trim(),
    };
    // console.log("payload ", payload);
    const idUserAndIdDocument = {
      idUser: userId.trim(),
      idDoc: documentId.trim(),
    };
    // console.log("idUserAndIdDocument ", idUserAndIdDocument);
    // Gửi payload
    socket.emit("register", JSON.stringify(payload), (response) => {
      // console.log("response ", response);
      // console.log("Payload successfully registered:", payload);

      socket.emit("request-priority", JSON.stringify(idUserAndIdDocument));
    });
  } else {
    console.error("Invalid data in localStorage:", { idOw, documentId });
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
