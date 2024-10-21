<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { socket } from "../socket";

const props = defineProps(["id", "ownerIdDocument"]);
let active = false;

const showCode = ref(null);
const contentDiv = ref(null);

const ShowCode = () => {
  showCode.value.dataset.active = !active;
  active = !active;
  if (active) {
    contentDiv.value.textContent = contentDiv.value.innerHTML;
    contentDiv.value.setAttribute("contenteditable", false);
  } else {
    contentDiv.value.innerHTML = contentDiv.value.textContent;
    contentDiv.value.setAttribute("contenteditable", true);
  }
};
const XuLyNut = (event) => {
  event.preventDefault(); // Tắt hành vi mặc định (gõ chữ vào div)
  console.log("Bạn đã nhấn phím:", event.key);

  const currentDiv = getCurrentDiv();
  const nextDiv = getNextDiv();

  if (event.key.length == 1) {
    if (currentDiv) {
      if (checkConTro(currentDiv)) {
        console.log("Con trỏ ở đầu content");
        return;
      }
      // Kiểm tra nếu phím vừa nhấn là ký tự có độ dài 1 và có currentDiv
      // Tạo một thẻ <div> mới
      const newDiv = document.createElement("div");

      // gán ID cho div mới

      newDiv.id = nextDiv
        ? getRandomDouble(parseFloat(currentDiv.id), parseFloat(nextDiv.id))
        : getRandomDouble(parseFloat(currentDiv.id), -1);

      if (event.key == " ") {
        newDiv.textContent = "\u00A0"; // Hiển thị ký tự space không phá vỡ (tương đương &nbsp;)
      } else {
        newDiv.textContent = event.key; // Nội dung là phím vừa nhấn
      }

      // Chèn thẻ <div> mới sau thẻ currentDiv
      if (currentDiv.nextSibling) {
        currentDiv.parentNode.insertBefore(newDiv, currentDiv.nextSibling);
      } else {
        currentDiv.parentNode.appendChild(newDiv);
      }
      console.log("Đã chèn thẻ <div> mới sau thẻ có id:", currentDiv.id);
      // Tạo đối tượng Range và Selection
      const range = document.createRange();
      const selection = window.getSelection();

      // Đặt Range vào trong thẻ <div> mới tạo
      range.selectNodeContents(newDiv);

      // Di chuyển con trỏ vào cuối thẻ <div> mới tạo
      range.collapse(false); // `false` đặt con trỏ ở cuối, `true` đặt ở đầu

      // Xóa các vùng chọn hiện tại và đặt vùng chọn mới
      selection.removeAllRanges();
      selection.addRange(range);

      console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

      // gửi Div vừa tạo đi
      const divVuaTao = {
        id: newDiv.id,
        content: newDiv.textContent,
      };
      socket.emit("insert-one", JSON.stringify(divVuaTao));
    } else {
      console.log("khong co div trc");
    }
  } else {
    if (event.key == "Backspace") {
      if (currentDiv) {
        if (checkConTro(currentDiv)) {
          console.log("Con trỏ ở đầu content");
          return;
        }

        const selection = window.getSelection();

        if (currentDiv.previousSibling) {
          const previousDiv = currentDiv.previousSibling;
          // Xóa currentDiv
          const idCurrentDiv = currentDiv.id;
          currentDiv.remove();

          // Tạo một range mới để đặt con trỏ ở cuối previousDiv
          const newRange = document.createRange();
          newRange.selectNodeContents(previousDiv);
          newRange.collapse(false); // Đặt con trỏ ở cuối

          // Xóa các vùng chọn hiện tại và thêm vùng chọn mới
          selection.removeAllRanges();
          selection.addRange(newRange);

          console.log(
            "Đã xóa currentDiv và di chuyển con trỏ về cuối của div trước đó."
          );
          // gửi socket
          const charToDelete = {
            id: idCurrentDiv,
          };
          socket.emit("delete-one", JSON.stringify(charToDelete));
        } else {
          console.log("không có div nằm trước currentDiv");
        }
      }
    }
  }

  if (nextDiv) {
    console.log("Thẻ <div> phía sau có id:", nextDiv.id);
  } else {
    console.log("Không có thẻ <div> nào phía sau.");
  }
};

function getCurrentDiv() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const currentNode = range.startContainer;

  // Kiểm tra node cha để xác định thẻ <div> bao quanh con trỏ
  let parentElement =
    currentNode.nodeType === 3 ? currentNode.parentElement : currentNode;

  // Tìm thẻ <div> cha nếu nó nằm trong một thẻ khác
  while (parentElement && parentElement.tagName !== "DIV") {
    parentElement = parentElement.parentElement;
  }

  return parentElement; // Trả về thẻ <div> hiện tại, hoặc null nếu không tìm thấy
}

function getNextDiv() {
  const currentDiv = getCurrentDiv();
  if (!currentDiv) return null;

  // Kiểm tra phần tử tiếp theo của thẻ <div> hiện tại
  const nextElement = currentDiv.nextElementSibling;

  // Kiểm tra nếu phần tử tiếp theo là thẻ <div>
  if (nextElement && nextElement.tagName === "DIV") {
    return nextElement; // Trả về thẻ <div> sau nó
  }

  return null; // Trả về null nếu không có thẻ <div> phía sau
}

//tạo id
function getRandomDouble(min, max) {
  if (max >= 0) {
    // Tính số ngẫu nhiên và giới hạn 6 số thập phân
    return (Math.random() * (max - min) + min).toFixed(6);
  } else {
    // Trả về min + 1 nếu max không hợp lệ
    return (min + 1).toFixed(6);
  }
}
function updateInsertion(kiTu) {
  // Tạo thẻ <div> mới với id 6.5 và nội dung "o"
  const newDiv = document.createElement("div");
  newDiv.id = kiTu.id;
  newDiv.textContent = kiTu.content;

  // Duyệt qua các thẻ con của contentDiv và tìm thẻ có id > 6.5
  let inserted = false;
  const divs = contentDiv.value.querySelectorAll("div");

  divs.forEach((div) => {
    const divId = parseFloat(div.id); // Chuyển id thành số thực để so sánh
    if (divId > parseFloat(kiTu.id) && !inserted) {
      contentDiv.value.insertBefore(newDiv, div); // Chèn thẻ mới trước thẻ có id > newDiv.id
      inserted = true;
    }
  });

  // Nếu không tìm thấy thẻ nào có id > newDiv.id, chèn thẻ mới vào sau thẻ <div> cuối cùng
  if (!inserted) {
    const lastDiv = divs[divs.length - 1]; // Lấy thẻ <div> cuối cùng
    lastDiv.insertAdjacentElement("afterend", newDiv); // Chèn sau thẻ cuối cùng
  }

  console.log("Thẻ mới đã được chèn:", newDiv);
}
function updateDetele(Kitu) {
  const divToDelete = document.getElementById(Kitu.id);
  if (contentDiv && divToDelete) {
    const selection = window.getSelection();

    const currentDiv = getCurrentDiv();
    //xóa div mà đang có con trỏ thì xóa xong phải lùi lại chọn div nằm trước
    if (currentDiv && currentDiv.id == divToDelete.id) {
      const previousDiv = divToDelete.previousSibling;
      divToDelete.remove();
      // Tạo một range mới để đặt con trỏ ở cuối previousDiv
      if (selection) {
        const newRange = document.createRange();
        newRange.selectNodeContents(previousDiv);
        newRange.collapse(false); // Đặt con trỏ ở cuối

        // Xóa các vùng chọn hiện tại và thêm vùng chọn mới
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        console.log("khong co selection");
      }
    } else {
      // xóa div không có con trỏ thì xóa xong cho selection lại div đang trỏ tới
      divToDelete.remove();
      if (selection) {
        //đặt con trỏ ở vị trí div cũ
        const newRange = document.createRange();
        newRange.selectNodeContents(currentDiv);
        newRange.collapse(false); // Đặt con trỏ ở cuối

        // Xóa các vùng chọn hiện tại và thêm vùng chọn mới
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        console.log("khong co selection");
      }
    }
  } else {
    console.log(`không tìm thấy div với id ${Kitu.id} để xóa`);
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
        <div id="1">c</div><div id="2">o</div><div id="3">n</div><div id="4">g</div><div id="5">&nbsp;</div><div id="6">m</div><div id="7">i</div><div id="8">n</div><div id="9">h</div><br>
  `;
});

//kiểm tra xem có đang ở trước chữ(dùng để xử lý khi gõ ở đầu cua)
function checkConTro(currentDiv) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;

    // Xác định vị trí của con trỏ đối với chữ
    const content = currentDiv.textContent.trim();
    const indexOfC = content.indexOf(currentDiv.textContent);

    if (cursorPosition > indexOfC) {
      return false; //Con trỏ đang ở sau chữ
    } else {
      // console.log("Con trỏ đang ở ngay trước chữ ");
      return true;
    }
  }
}

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div class="container">
    <div class="toolbar">
      <div class="head">
        <button id="show-code" data-active="false" @click="ShowCode">
          &lt;/&gt;
        </button>
      </div>
    </div>
    <div
      id="content"
      contenteditable="true"
      spellcheck="false"
      @keydown="XuLyNut"
    ></div>
  </div>
</template>

<style scoped>
:deep(#content div) {
  display: inline-block;
  margin: 0;
}
:deep(#content) {
  width: 50%; /* Đặt độ rộng là 50% */
  height: 50%;
  margin: 0 auto; /* Căn giữa vùng nhập */
  border: 2px solid #ccc; /* Viền để dễ nhận diện vùng nhập */
  padding: 10px; /* Khoảng cách bên trong để dễ nhập liệu */
  box-sizing: border-box; /* Đảm bảo padding không làm thay đổi độ rộng */
}
</style>
