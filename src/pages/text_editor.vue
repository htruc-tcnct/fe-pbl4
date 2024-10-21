<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { socket } from "../socket";

// Mô hình CRDT để quản lý các thay đổi trên mỗi client
class CRDT {
  constructor(siteId) {
    this.siteId = siteId;
    this.sequence = []; // Dùng để lưu trữ chuỗi ký tự với ID
  }

  // Tạo một ID duy nhất cho mỗi ký tự
  createId(position) {
    return { siteId: this.siteId, seq: position };
  }

  // Chèn ký tự tại vị trí và phát sự kiện qua socket
  insertChar(position, char) {
    const id = this.createId(position);
    this.sequence.splice(position, 0, { id, char });
    socket.emit("crdt-insert", { id, char, position });
  }

  // Xóa ký tự tại vị trí và phát sự kiện qua socket
  deleteChar(position) {
    const removed = this.sequence.splice(position, 1)[0];
    socket.emit("crdt-delete", { id: removed.id, position });
  }

  // Nhận ký tự được chèn từ người dùng khác
  remoteInsertChar(id, char, position) {
    this.sequence.splice(position, 0, { id, char });
  }

  // Nhận yêu cầu xóa ký tự từ người dùng khác
  remoteDeleteChar(id, position) {
    this.sequence.splice(position, 1);
  }

  // Hiển thị chuỗi hiện tại
  getSequence() {
    return this.sequence.map((item) => item.char).join("");
  }
}

let crdt = null;
const contentDiv = ref(null);

const handleKeydown = (event) => {
  event.preventDefault(); // Tắt hành vi mặc định

  const position = getCursorPosition(); // Vị trí con trỏ hiện tại
  if (event.key.length === 1) {
    // Chèn ký tự và phát sự kiện qua socket
    crdt.insertChar(position, event.key);
    updateContent();
  } else if (event.key === "Backspace") {
    // Xóa ký tự và phát sự kiện qua socket
    crdt.deleteChar(position - 1);
    updateContent();
  }
};

// Hàm cập nhật nội dung hiển thị
function updateContent() {
  contentDiv.value.innerText = crdt.getSequence();
  setCursorPosition(crdt.sequence.length); // Đặt lại con trỏ
}

// Lấy vị trí con trỏ hiện tại
function getCursorPosition() {
  const selection = window.getSelection();
  return selection.anchorOffset;
}

// Đặt lại vị trí con trỏ
function setCursorPosition(position) {
  const range = document.createRange();
  const selection = window.getSelection();
  range.setStart(contentDiv.value.firstChild, position);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

onMounted(() => {
  // Tạo một CRDT mới với siteId (ID của phiên bản client này)
  const siteId = Date.now(); // Sử dụng timestamp làm ID đơn giản
  crdt = new CRDT(siteId);

  // Kết nối socket
  socket.connect();

  // Lắng nghe sự kiện từ người dùng khác
  socket.on("crdt-insert", (data) => {
    crdt.remoteInsertChar(data.id, data.char, data.position);
    updateContent();
  });

  socket.on("crdt-delete", (data) => {
    crdt.remoteDeleteChar(data.id, data.position);
    updateContent();
  });

  contentDiv.value = document.querySelector("#content");
});

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div class="container">
    <div
      id="content"
      contenteditable="true"
      spellcheck="false"
      @keydown="handleKeydown"
    ></div>
  </div>
</template>

<style scoped>
#content {
  border: 1px solid #ccc;
  padding: 10px;
  min-height: 50px;
  font-family: monospace;
}
</style>
