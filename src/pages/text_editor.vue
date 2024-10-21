<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { socket } from "../socket";

// CRDT Class để quản lý chuỗi ký tự
class CRDT {
  constructor(siteId) {
    this.siteId = siteId; // Mỗi client có một siteId duy nhất
    this.sequence = []; // Chuỗi các ký tự
  }

  // Tạo ID duy nhất cho mỗi ký tự
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
    if (position >= 0 && position < this.sequence.length) {
      const removed = this.sequence.splice(position, 1)[0];
      socket.emit("crdt-delete", { id: removed.id, position });
    }
  }

  // Nhận ký tự được chèn từ người dùng khác
  remoteInsertChar(id, char, position) {
    this.sequence.splice(position, 0, { id, char });
  }

  // Nhận yêu cầu xóa ký tự từ người dùng khác
  remoteDeleteChar(id, position) {
    if (position >= 0 && position < this.sequence.length) {
      this.sequence.splice(position, 1);
    }
  }

  // Hiển thị chuỗi hiện tại
  getSequence() {
    return this.sequence.map((item) => item.char).join("");
  }
}

let crdt = null;
const contentDiv = ref(null);

// Hàm xử lý khi người dùng nhập liệu
const handleInput = (event) => {
  const content = event.target.innerText; // Lấy nội dung từ contenteditable
  console.log("Content:", content);
  updateContent();
};

const handleKeydown = (event) => {
  const position = getCursorPosition(); // Lấy vị trí con trỏ hiện tại

  if (event.key.length === 1) {
    event.preventDefault();
    crdt.insertChar(position, event.key); // Chèn ký tự và phát qua socket
    updateContent();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    crdt.deleteChar(position - 1); // Xóa ký tự và phát qua socket
    updateContent();
  }
};

// Hàm cập nhật nội dung hiển thị
function updateContent() {
  contentDiv.value.innerText = crdt.getSequence(); // Cập nhật nội dung trong DOM
  setCursorPosition(crdt.sequence.length); // Đặt lại vị trí con trỏ
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
  // Khởi tạo CRDT với siteId (ID duy nhất cho client)
  const siteId = Date.now(); // Sử dụng timestamp làm ID duy nhất
  crdt = new CRDT(siteId);

  // Kết nối socket
  socket.connect();

  // Nhận sự kiện từ các client khác
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
  socket.disconnect(); // Ngắt kết nối khi component bị hủy
});
</script>

<template>
  <div class="container">
    <div
      id="content"
      contenteditable="true"
      spellcheck="false"
      @input="handleInput"
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
