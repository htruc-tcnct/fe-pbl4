<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { socket } from "../socket";

const props = defineProps(["id", "ownerIdDocument"]);
const contentDiv = ref(null);

const showCode = ref(null);
const idUserAccess = ref(null);
const handleKeyPress = (event) => {
  event.preventDefault();
  const currentDiv = getCurrentDiv();
  const nextDiv = getNextDiv();

  if (event.key.length === 1) {
    handleCharacterInsert(event.key, currentDiv, nextDiv);
  } else if (event.key === "Backspace") {
    handleBackspace(currentDiv);
  }
};
const handleCharacterInsert = (key, currentDiv, nextDiv) => {
  if (currentDiv && !checkConTro(currentDiv)) {
    const newDiv = document.createElement("div");
    newDiv.id = nextDiv
      ? getRandomDouble(parseFloat(currentDiv.id), parseFloat(nextDiv.id))
      : getRandomDouble(parseFloat(currentDiv.id), -1);

    newDiv.textContent = key === " " ? "\u00A0" : key;

    if (currentDiv.nextSibling) {
      currentDiv.parentNode.insertBefore(newDiv, currentDiv.nextSibling);
    } else {
      currentDiv.parentNode.appendChild(newDiv);
    }

    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(newDiv);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    // Gửi toàn bộ nội dung tài liệu hiện tại từ contentDiv
    const fullContent = contentDiv.value.innerHTML;
    console.log(contentDiv.value.innerHTML);
    const divVuaTao = {
      id: props.id,
      content: newDiv.textContent,
      fullContent: fullContent, // Gửi toàn bộ nội dung tài liệu
      idUser: localStorage.getItem("idUser"),
    };
    socket.emit("insert-one", JSON.stringify(divVuaTao));
  }
};

const handleBackspace = (currentDiv) => {
  if (currentDiv && !checkConTro(currentDiv)) {
    const selection = window.getSelection();
    if (currentDiv.previousSibling) {
      const previousDiv = currentDiv.previousSibling;
      const idCurrentDiv = currentDiv.id;
      currentDiv.remove();

      const newRange = document.createRange();
      newRange.selectNodeContents(previousDiv);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);

      const charToDelete = { id: idCurrentDiv };
      socket.emit("delete-one", JSON.stringify(charToDelete));
    } else if (contentDiv.value.childElementCount === 1) {
      // Nếu chỉ còn một div duy nhất và đang xóa nó
      currentDiv.remove();

      // Tạo div mới để không bị trống
      const newDiv = document.createElement("div");
      newDiv.id = getRandomDouble(1, 2); // Tạo id mới cho div
      newDiv.textContent = "\u00A0"; // Ký tự không phá vỡ (khoảng trắng)
      contentDiv.value.appendChild(newDiv);

      const newRange = document.createRange();
      newRange.selectNodeContents(newDiv);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }
};
function getCurrentDiv() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const currentNode = range.startContainer;
  let parentElement =
    currentNode.nodeType === 3 ? currentNode.parentElement : currentNode;

  while (parentElement && parentElement.tagName !== "DIV") {
    parentElement = parentElement.parentElement;
  }

  return parentElement;
}

function getNextDiv() {
  const currentDiv = getCurrentDiv();
  if (!currentDiv) return null;
  const nextElement = currentDiv.nextElementSibling;
  return nextElement && nextElement.tagName === "DIV" ? nextElement : null;
}

function getRandomDouble(min, max) {
  return (max >= 0 ? Math.random() * (max - min) + min : min + 1).toFixed(6);
}

function updateInsertion(kiTu) {
  const newDiv = document.createElement("div");
  newDiv.id = kiTu.id;
  newDiv.textContent = kiTu.content;

  let inserted = false;
  const divs = contentDiv.value.querySelectorAll("div");
  divs.forEach((div) => {
    const divId = parseFloat(div.id);
    if (divId > parseFloat(kiTu.id) && !inserted) {
      contentDiv.value.insertBefore(newDiv, div);
      inserted = true;
    }
  });

  if (!inserted) {
    const lastDiv = divs[divs.length - 1];
    lastDiv.insertAdjacentElement("afterend", newDiv);
  }
}

function updateDetele(Kitu) {
  const divToDelete = document.getElementById(Kitu.id);
  if (contentDiv && divToDelete) {
    const selection = window.getSelection();
    const currentDiv = getCurrentDiv();

    if (currentDiv && currentDiv.id === divToDelete.id) {
      const previousDiv = divToDelete.previousSibling;
      divToDelete.remove();

      if (selection) {
        const newRange = document.createRange();
        newRange.selectNodeContents(previousDiv);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      divToDelete.remove();
      if (selection) {
        const newRange = document.createRange();
        newRange.selectNodeContents(currentDiv);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  }
}

onMounted(() => {
  socket.connect();
  socket.on("update-insert-one", (charToInsert) => {
    const kiTu = JSON.parse(charToInsert);
    updateInsertion(kiTu);
  });
  socket.on("update-delete-one", (charToDelete) => {
    const tempChartoDelete = JSON.parse(charToDelete);
    updateDetele(tempChartoDelete);
  });
  showCode.value = document.querySelector("#show-code");
  contentDiv.value = document.querySelector("#content");
  contentDiv.value.innerHTML = `
        <div id="1">c</div>
  `;
});

function checkConTro(currentDiv) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;
    const content = currentDiv.textContent.trim();
    const indexOfC = content.indexOf(currentDiv.textContent);
    return cursorPosition <= indexOfC;
  }
}

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div class="container">
    <div class="container mt-3">
      <div class="toolbar p-3 bg-light border rounded">
        <div class="d-flex justify-content-start align-items-center mb-3">
          <!-- Dropdown for document title -->
          <input
            type="text"
            class="form-control me-2"
            placeholder="untitled"
            style="width: 120px"
          />

          <!-- File Dropdown -->
          <div class="dropdown me-2">
            <button
              class="btn btn-outline-secondary dropdown-toggle"
              type="button"
              id="fileDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              File
            </button>
            <ul class="dropdown-menu" aria-labelledby="fileDropdown">
              <li><a class="dropdown-item" href="#">New</a></li>
              <li><a class="dropdown-item" href="#">Open</a></li>
              <li><a class="dropdown-item" href="#">Save as txt</a></li>
              <li><a class="dropdown-item" href="#">Save as pdf</a></li>
            </ul>
          </div>

          <!-- Format Dropdown -->
          <div class="dropdown me-2">
            <button
              class="btn btn-outline-secondary dropdown-toggle"
              type="button"
              id="formatDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Format
            </button>
            <ul class="dropdown-menu" aria-labelledby="formatDropdown">
              <li>
                <a class="dropdown-item" href="#" onclick="applyFormat('H1')"
                  >Heading 1</a
                >
              </li>
              <li>
                <a class="dropdown-item" href="#" onclick="applyFormat('H2')"
                  >Heading 2</a
                >
              </li>
              <li>
                <a class="dropdown-item" href="#" onclick="applyFormat('H3')"
                  >Heading 3</a
                >
              </li>
              <li>
                <a class="dropdown-item" href="#" onclick="applyFormat('H4')"
                  >Heading 4</a
                >
              </li>
              <li>
                <a class="dropdown-item" href="#" onclick="applyFormat('H5')"
                  >Heading 5</a
                >
              </li>
              <li>
                <a class="dropdown-item" href="#" onclick="applyFormat('H6')"
                  >Heading 6</a
                >
              </li>
              <li>
                <a class="dropdown-item" href="#" onclick="applyFormat('P')"
                  >Paragraph</a
                >
              </li>
            </ul>
          </div>

          <!-- Font size Dropdown -->
          <div class="dropdown me-2">
            <button
              class="btn btn-outline-secondary dropdown-toggle"
              type="button"
              id="fontSizeDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Font size
            </button>
            <ul class="dropdown-menu" aria-labelledby="fontSizeDropdown">
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  onclick="changeFontSize('8pt')"
                  >Extra small</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  onclick="changeFontSize('10pt')"
                  >Small</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  onclick="changeFontSize('12pt')"
                  >Regular</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  onclick="changeFontSize('14pt')"
                  >Medium</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  onclick="changeFontSize('18pt')"
                  >Large</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  onclick="changeFontSize('24pt')"
                  >Extra Large</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  onclick="changeFontSize('32pt')"
                  >Big</a
                >
              </li>
            </ul>
          </div>

          <!-- Color Picker -->
          <div
            class="d-flex align-items-center border border-secondary px-2 py-1 rounded"
          >
            <!-- Label for Color Picker -->
            <label for="textColorPicker" class="me-2">Color</label>

            <!-- Color Picker -->
            <input
              type="color"
              id="textColorPicker"
              class="form-control form-control-color"
              value="#000000"
              title="Choose text color"
              style="height: 22px; width: 24px"
            />
          </div>

          <!-- Background Color Picker -->
          <div
            class="d-flex align-items-center border border-secondary px-2 py-1 rounded ms-2"
          >
            <!-- Label for Color Picker -->
            <label for="textColorPicker" class="me-2">Background</label>

            <!-- Color Picker -->
            <input
              type="color"
              id="textColorPicker"
              class="form-control form-control-color"
              value="#000000"
              title="Choose text color"
              style="height: 22px; width: 24px"
            />
          </div>
        </div>

        <div class="d-flex justify-content-start align-items-center">
          <!-- Toolbar buttons -->
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-undo"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-redo"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-bold"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-italic"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-underline"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-strikethrough"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-align-left"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-align-center"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-align-right"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-list-ul"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-list-ol"></i>
          </button>
          <button class="btn btn-outline-secondary me-1">
            <i class="fas fa-link"></i>
          </button>
          <button class="btn btn-outline-secondary">
            <i class="fas fa-code"></i>
          </button>
        </div>
      </div>

      <!-- Editable content area -->

      <div
        id="content"
        class="border mt-3 p-3 rounded"
        contenteditable="true"
        spellcheck="false"
        style="min-height: 200px"
        @keydown="handleKeyPress"
      ></div>
    </div>
  </div>
</template>

<style scoped>
:deep(#content div) {
  display: inline-block;
  margin: 0;
}
:deep(#content) {
  width: 50%;
  height: 50%;
  margin: 0 auto;
  border: 2px solid #ccc;
  padding: 10px;
  box-sizing: border-box;
}
input[type="color"] {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: none;
}
</style>
