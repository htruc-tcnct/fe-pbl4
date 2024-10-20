import { reactive } from "vue";
import { io } from "socket.io-client";

export const state = reactive({
  connected: false,
});

const URL = import.meta.env.VITE_SERVER_URL;

export const socket = io(URL, {
  withCredentials: true,
  transports: ["websocket"],
});

socket.on("connect", () => {
  state.connected = true;
  console.log("Socket connected to server");
});

socket.on("disconnect", () => {
  state.connected = false;
  console.log("Socket disconnected from server");
});

socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err);
});
