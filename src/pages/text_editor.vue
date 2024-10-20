<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useRoute } from "vue-router";
import { socket, state } from "../socket";

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

  socket.emit("get-document", documentId);
  socket.once("load-document", (document) => {
    quill.value.setContents(document);
    quill.value.enable();
  });

  quill.value.on("text-change", (delta, oldDelta, source) => {
    if (source !== "user") return; // Chỉ gửi thay đổi từ người dùng
    socket.emit("send-changes", delta);
  });

  socket.on("receive-changes", (delta) => {
    // Kiểm tra xem thay đổi có phải từ chính người dùng hay không
    quill.value.updateContents(delta, "silent"); // Thực hiện cập nhật nội dung mà không gây ra sự kiện text-change mới
  });

  const saveInterval = setInterval(() => {
    socket.emit("save-document", quill.value.getContents());
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
