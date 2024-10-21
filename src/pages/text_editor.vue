<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { socket } from "../socket";

// CRDT với thứ tự logic để xử lý việc chèn đồng thời
class CRDT {
  constructor(siteId) {
    this.siteId = siteId;
    this.sequence = []; // Lưu chuỗi các ký tự với ID và vị trí logic
  }

  // Tạo một ID duy nhất cho mỗi ký tự với vị trí logic
  createId(previousId, nextId) {
    const newPosition = this.generatePosition(previousId, nextId);
    return { siteId: this.siteId, position: newPosition };
  }

  // Tạo vị trí logic giữa hai vị trí
  generatePosition(prev, next) {
    if (!prev && !next) {
      return [0];
    }
    const prevPos = prev ? prev.position : [0];
    const nextPos = next ? next.position : [Infinity];
    const newPos = [];

    let i = 0;
    while (
      i < prevPos.length &&
      i < nextPos.length &&
      prevPos[i] === nextPos[i]
    ) {
      newPos.push(prevPos[i]);
      i++;
    }

    const prevDigit = prevPos[i] || 0;
    const nextDigit = nextPos[i] || Infinity;
    const newDigit = (prevDigit + nextDigit) / 2;
    newPos.push(newDigit);

    return newPos;
  }

  // Chèn ký tự tại vị trí logic và phát sự kiện qua socket
  insertChar(char, previousId = null, nextId = null) {
    const id = this.createId(previousId, nextId);
    const newChar = { id, char };
    this.sequence.push(newChar);
    this.sequence.sort((a, b) => this.compareIds(a.id, b.id)); // Sắp xếp theo thứ tự logic

    socket.emit("crdt-insert", newChar); // Phát sự kiện qua socket
  }

  // Xóa ký tự dựa trên ID
  deleteChar(id) {
    this.sequence = this.sequence.filter((item) => item.id !== id);
    socket.emit("crdt-delete", { id });
  }

  // Nhận ký tự từ người dùng khác
  remoteInsertChar(newChar) {
    this.sequence.push(newChar);
    this.sequence.sort((a, b) => this.compareIds(a.id, b.id)); // Sắp xếp lại
  }

  // Nhận yêu cầu xóa ký tự từ người dùng khác
  remoteDeleteChar(id) {
    this.sequence = this.sequence.filter((item) => item.id !== id);
  }

  // So sánh hai ID để sắp xếp các ký tự theo thứ tự logic
  compareIds(id1, id2) {
    const pos1 = id1.position;
    const pos2 = id2.position;

    for (let i = 0; i < Math.max(pos1.length, pos2.length); i++) {
      const digit1 = pos1[i] || 0;
      const digit2 = pos2[i] || 0;
      if (digit1 !== digit2) {
        return digit1 - digit2;
      }
    }

    return id1.siteId < id2.siteId ? -1 : 1; // Ưu tiên siteId thấp hơn khi vị trí bằng nhau
  }

  // Lấy chuỗi ký tự hiện tại
  getSequence() {
    return this.sequence.map((item) => item.char).join("");
  }
}

let crdt = null;
const contentDiv = ref(null);

const handleKeydown = (event) => {
  const position = getCursorPosition();
  const previousId = crdt.sequence[position - 1]?.id || null;
  const nextId = crdt.sequence[position]?.id || null;

  if (event.key.length === 1) {
    event.preventDefault();
    crdt.insertChar(event.key, previousId, nextId); // Chèn ký tự vào giữa
    updateContent();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    const currentChar = crdt.sequence[position - 1];
    if (currentChar) {
      crdt.deleteChar(currentChar.id); // Xóa ký tự
      updateContent();
    }
  }
};

// Hàm cập nhật nội dung hiển thị
function updateContent() {
  contentDiv.value.innerText = crdt.getSequence();
  setCursorPosition(crdt.sequence.length);
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
  const siteId = Date.now();
  crdt = new CRDT(siteId);

  socket.connect();

  socket.on("crdt-insert", (data) => {
    crdt.remoteInsertChar(data);
    updateContent();
  });

  socket.on("crdt-delete", (data) => {
    crdt.remoteDeleteChar(data.id);
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
