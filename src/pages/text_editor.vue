<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useRoute } from "vue-router";
import { socket, state } from "../socket";
import * as Y from "yjs"; // Import Yjs
import { QuillBinding } from "y-quill"; // Import Yjs-Quill integration

const quill = ref(null);
const accessLevel = ref("");
const errorMessage = ref("");
const route = useRoute();
const documentId = route.params.id;

onMounted(() => {
  console.log("Document ID:", documentId);

  if (!state.connected) {
    socket.connect();
  }

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  const editorContainer = document.querySelector("#editorContainer");

  // Khởi tạo Yjs document cho việc đồng bộ tài liệu
  const ydoc = new Y.Doc();

  // Tạo một Quill editor
  quill.value = new Quill(editorContainer, {
    theme: "snow",
    modules: {
      toolbar: [
        [{ font: [] }],
        [{ size: ["small", false, "large", "huge"] }],
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ script: "sub" }, { script: "super" }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "image"],
        ["clean"],
      ],
      history: {
        delay: 2000,
        maxStack: 500,
        userOnly: true,
      },
    },
  });

  // Đồng bộ Quill với Yjs thông qua QuillBinding
  const quillBinding = new QuillBinding(ydoc.getText("quill"), quill.value);

  // Thêm sự kiện vào socket để tải tài liệu
  socket.emit("get-document", documentId);
  socket.once("load-document", (document) => {
    // Tải nội dung tài liệu từ socket nếu cần
    if (document) {
      const initialContent = Y.decodeUpdate(new Uint8Array(document));
      ydoc.applyUpdate(initialContent); // Đồng bộ hóa nội dung từ server
      quill.value.enable();
    }
  });

  // Khi nhận được thay đổi từ người khác, cập nhật vào Yjs
  socket.on("receive-changes", (delta) => {
    const encodedDelta = new Uint8Array(delta);
    ydoc.applyUpdate(encodedDelta);
  });

  // Khi người dùng thay đổi tài liệu, gửi thay đổi qua socket
  ydoc.on("update", (update) => {
    const encodedUpdate = Array.from(new Uint8Array(update));
    socket.emit("send-changes", encodedUpdate); // Gửi thay đổi qua socket
  });

  // Thiết lập lưu tài liệu theo thời gian
  const saveInterval = setInterval(() => {
    const docContent = Y.encodeStateAsUpdate(ydoc); // Lấy nội dung Yjs document
    socket.emit("save-document", Array.from(new Uint8Array(docContent)));
  }, 2000);

  onBeforeUnmount(() => {
    socket.disconnect();
    clearInterval(saveInterval);
    socket.off("receive-changes");
  });

  socket.on("error", (error) => {
    errorMessage.value = `Socket error: ${error}`;
    console.error("Socket error:", error);
  });
});
</script>
<template>
  <div>
    <div id="editorContainer"></div>
    <p v-if="accessLevel === 'Viewer'" class="text-info">
      Bạn chỉ có quyền xem tài liệu này.
    </p>
    <p v-if="errorMessage" class="text-danger">{{ errorMessage }}</p>
  </div>
</template>
<style scoped>
#editorContainer {
  height: 400px;
}

.text-info {
  color: blue;
  text-align: center;
  margin-top: 20px;
}

.text-danger {
  color: red;
  text-align: center;
  margin-top: 20px;
}
</style>
