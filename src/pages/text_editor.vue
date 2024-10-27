<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { socket } from "../socket";
const contentRef = ref(null);

const getContent = () => {
  // Lấy nội dung HTML
  const content = contentRef.value.innerHTML;
  console.log(content);

  // Nếu chỉ muốn lấy nội dung văn bản, sử dụng:
  // const content = contentRef.value.textContent;
};
const props = defineProps(["id", "ownerIdDocument"]);
let active = false;
let nameDoc = ref(null);
const showCode = ref(null);
const contentDiv = ref(null);
var pri;
const fetchDocument = async () => {
  const result = await axios.get(
    `${import.meta.env.VITE_SERVER_URL}/documents/detail/${props.id}`
  );
  nameDoc.value = result.data.documents[0].documentTitle;
};
{
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

    let currentDiv = getCurrentDiv();
    let nextDiv = getNextDiv();

    // Kiểm tra nếu phím vừa nhấn là ký tự có độ dài 1 và có currentDiv
    if (event.key.length == 1) {
      if (currentDiv) {
        if (currentDiv.id == "") {
          console.log("con trỏ ở id rỗng");
          if (nextDiv) {
            XuLyGoODauContent(nextDiv, event.key);
            return;
          } else {
            XuLyGoKhiContentTrong(event.key);
            return;
          }
        }
        // xử lý gõ ở đầu dòng
        if (checkConTro(currentDiv)) {
          console.log("Con trỏ ở đầu content");
          XuLyGoODauContent(currentDiv, event.key);
          return;
        }
        // xử lý gõ khi content đang trống
        // if (hasDivInContent() == false) {
        //   XuLyGoKhiContentTrong(event.key);
        //   return;
        // }

        // Tạo một thẻ <div> mới
        const newDiv = document.createElement("div");

        // gán ID cho div mới
        newDiv.id = nextDiv
          ? spawnID(currentDiv.id, nextDiv.id)
          : spawnID(currentDiv.id, null);
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
          if (currentDiv.id == "") {
            console.log("không xóa id rỗng");
            return;
          }
          if (checkConTro(currentDiv)) {
            console.log("Con trỏ ở đầu content");
            return;
          }
          // if (hasDivInContent() == false) {
          //   console.log("không có gì để xóa");
          //   return;
          // }

          const selection = window.getSelection();

          if (currentDiv.previousSibling) {
            const previousDiv = currentDiv.previousSibling;
            // Xóa currentDiv
            const idCurrentDiv = currentDiv.id;

            currentDiv.remove();
            // thẻ div trước id rỗng thì không gán selection
            // if (previousDiv.id == "") {
            //   console.log("id rỗng");

            //   // gửi socket
            //   const charToDelete = {
            //     id: idCurrentDiv,
            //   };
            //   socket.emit("delete-one", JSON.stringify(charToDelete));
            //   return;
            // }
            // Tạo một range mới để đặt con trỏ ở cuối previousDiv
            const newRange = document.createRange();
            newRange.selectNodeContents(previousDiv);
            newRange.collapse(false); // Đặt con trỏ ở cuối

            // Xóa các vùng chọn hiện tại và thêm vùng chọn mới
            selection.removeAllRanges();
            selection.addRange(newRange);

            console.log(
              `Đã xóa ${idCurrentDiv} và di chuyển con trỏ về cuối của div trước đó.`,
              previousDiv.id
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

  //update

  function updateInsertion(kiTu) {
    // Tạo thẻ <div> mới với id newDiv.id và nội dung ""
    const newDiv = document.createElement("div");
    newDiv.id = kiTu.id;
    newDiv.textContent = kiTu.content;
    // nếu trống thì chèn vào không cần duyệt
    // if (hasDivInContent() == false) {
    //   // Xóa nội dung hiện có trong thẻ content
    //   contentDiv.value.innerHTML = "";

    //   // Tạo thẻ <div> id="" mới
    //   const newParagraph = document.createElement("div");
    //   newParagraph.innerHTML = "";
    //   newParagraph.id = "";

    //   // Chèn thẻ <div> id="" vào thẻ content
    //   contentDiv.value.appendChild(newParagraph);

    //   // Chèn thẻ div mới vào thẻ content
    //   contentDiv.value.appendChild(newDiv);

    //   // Tạo và chèn thẻ <br>
    //   const lineBreak = document.createElement("br");
    //   contentDiv.value.appendChild(lineBreak);

    //   console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);
    //   const div = document.getElementById("content");
    //   if (document.activeElement === div) {
    //     console.log("Div đang được focus");
    //     // Tạo đối tượng Range và Selection
    //     const range = document.createRange();
    //     const selection = window.getSelection();

    //     // Đặt Range vào trong thẻ <div> mới tạo
    //     range.selectNodeContents(newDiv);

    //     // Di chuyển con trỏ vào cuối thẻ <div> mới tạo
    //     range.collapse(false); // `false` đặt con trỏ ở cuối, `true` đặt ở đầu

    //     // Xóa các vùng chọn hiện tại và đặt vùng chọn mới
    //     selection.removeAllRanges();
    //     selection.addRange(range);
    //   } else {
    //     console.log("Div không được focus");
    //   }
    //   return;
    // }

    // Duyệt qua các thẻ con của contentDiv và tìm thẻ có id > newDiv.id
    let inserted = false;
    const divs = contentDiv.value.querySelectorAll("div");

    for (let div of divs) {
      if (div.id == "") continue;
      if (compareID(div.id, newDiv.id) == 1 && !inserted) {
        contentDiv.value.insertBefore(newDiv, div); // Chèn thẻ mới trước thẻ có id > newDiv.id
        inserted = true;
        break; // Dừng vòng lặp khi đã chèn
      }
    }

    // Nếu không tìm thấy thẻ nào có id > newDiv.id, chèn thẻ mới vào sau thẻ <div> cuối cùng
    if (!inserted) {
      const lastDiv = divs[divs.length - 1]; // Lấy thẻ <div> cuối cùng
      lastDiv.insertAdjacentElement("afterend", newDiv); // Chèn sau thẻ cuối cùng
    }

    console.log("Thẻ mới đã được chèn:", newDiv);
  }
  function updateDetele(Kitu) {
    const divToDelete = document.getElementById(Kitu.id);
    //kiểm tra focus
    const div = document.getElementById("content");

    if (document.activeElement === div) {
      console.log("Div đang được focus");
    } else {
      console.log("Div không được focus");
      divToDelete.remove();
      return;
    }

    if (contentDiv.value && divToDelete) {
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
  function updateId(idupdated) {
    const divToUpdate = document.getElementById(idupdated.oldId);
    divToUpdate.id = idupdated.newId;
  }

  //kiểm tra xem có đang ở trước chữ(dùng để xử lý khi gõ ở đầu của content)
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

  //tạo id cho div

  function spawnID(id1, id2) {
    const arrObWithIntegers3 = [];
    let arrOb1;
    let arrOb2;
    if (id1 == null) {
      arrOb1 = [];
    } else {
      arrOb1 = converIDToArrObjectWithNumAndPri(id1);
    }

    if (id2 == null) {
      arrOb2 = [];
    } else {
      arrOb2 = converIDToArrObjectWithNumAndPri(id2);
    }
    iterateThroughArrays(arrOb1, arrOb2, arrObWithIntegers3);
    return convertArrObjectToID(arrObWithIntegers3);
  }

  // xử lý gõ ở đầu dòng

  function XuLyGoODauContent(currentDiv, key) {
    // Tạo một thẻ <div> mới
    const newDiv = document.createElement("div");

    // gán ID cho div mới
    newDiv.id = spawnID(null, currentDiv.id);

    if (key == " ") {
      newDiv.textContent = "\u00A0"; // Hiển thị ký tự space không phá vỡ (tương đương &nbsp;)
    } else {
      newDiv.textContent = key; // Nội dung là phím vừa nhấn
    }
    // Chèn thẻ <div> mới trước thẻ currentDiv
    currentDiv.parentNode.insertBefore(newDiv, currentDiv);

    console.log("Đã chèn thẻ <div> mới trước thẻ có id:", currentDiv.id);

    // //gán lại id cho currenDiv và gửi update này cho các client khác
    // const oldId = currentDiv.id;
    // const nextDiv = getNextDiv();
    // currentDiv.id =
    //   ((readId(newDiv.id) + readId(nextDiv.id)) / 2).toFixed(5) + "," + priority;
    // const idupdated = {
    //   oldId: oldId,
    //   newId: currentDiv.id,
    // };
    // socket.emit("modify-id", JSON.stringify(idupdated));

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
  }

  // xử lý gõ khi content trống
  function hasDivInContent() {
    // Lấy thẻ div với id là "content"
    const contentDiv = document.getElementById("content");

    // Kiểm tra xem thẻ đó có tồn tại hay không
    if (contentDiv) {
      // Sử dụng querySelector để tìm thẻ div bên trong
      const innerDiv = contentDiv.querySelector("div");

      // Nếu tìm thấy thẻ div nào đó thì trả về true, ngược lại false
      return innerDiv !== null;
    }

    // Nếu không tìm thấy thẻ content, trả về false
    return false;
  }

  // xử lý content trống

  function XuLyGoKhiContentTrong(key) {
    // Tạo một thẻ <div> mới
    const newDiv = document.createElement("div");

    // gán ID cho div mới
    newDiv.id = "1:" + pri;
    if (key == " ") {
      newDiv.textContent = "\u00A0"; // Hiển thị ký tự space không phá vỡ (tương đương &nbsp;)
    } else {
      newDiv.textContent = key; // Nội dung là phím vừa nhấn
    }

    // Xóa nội dung hiện có trong thẻ content
    contentDiv.value.innerHTML = "";

    // Tạo thẻ <div> id="" mới
    const newParagraph = document.createElement("div");
    newParagraph.innerHTML = "";
    newParagraph.id = "";

    // Chèn thẻ <div> id="" vào thẻ content
    contentDiv.value.appendChild(newParagraph);

    // Chèn thẻ div mới vào thẻ content
    contentDiv.value.appendChild(newDiv);

    // Tạo và chèn thẻ <br>
    const lineBreak = document.createElement("br");
    contentDiv.value.appendChild(lineBreak);

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
  }

  // code mới
  // Hàm để lặp qua các phần tử của cả hai mảng
  function converIDToArrObjectWithNumAndPri(id) {
    // Tách chuỗi thành các cặp nhỏ
    const result = id.split(",").map((pair) => {
      const [num, pri] = pair.split(":"); // Tách mỗi cặp theo dấu hai chấm
      return { num, pri }; // Tạo object cho mỗi cặp
    });
    return result.map((obj) => {
      const numArray = obj.num.split(".").map(Number); // Tách và chuyển từng phần thành số nguyên
      return { ...obj, num: numArray }; // Trả về đối tượng mới với num là mảng số nguyên
    });
  }
  function convertArrObjectToID(arr) {
    const result = arr.map((obj) => {
      const numString = obj.num.join("."); // Chuyển mảng số nguyên thành chuỗi với dấu chấm
      return { ...obj, num: numString }; // Trả về đối tượng mới với num là chuỗi
    });
    return result.map((obj) => `${obj.num}:${obj.pri}`).join(",");
  }

  // Hàm để lặp qua các phần tử của cả hai mảng
  function iterateThroughArrays(arr1, arr2, arrNew) {
    let checkLoop;
    const maxLength = Math.max(arr1.length, arr2.length);
    for (let i = 0; i < maxLength; i++) {
      //   console.log(i);
      arrNew[i] = { num: [], pri: pri }; // khởi tạo rỗng để tý gán
      //lấy mảng Num của object, nếu không có object thì trả về []
      const arr1Num = getNumOfObject(arr1[i]);
      const arr2Num = getNumOfObject(arr2[i]);
      checkLoop = iterateThroughNum(arr1Num, arr2Num, arrNew[i].num);
      // nếu đã gán được 1 số hợp lý thì gán checkLoop = 1 để thực hiện copy đoạn sau và trả về arrNew
      // nếu chưa gán được thì checkLoop = 0 để xuống dưới check xem pri của 2 object có khác nhau
      //   console.log("check ", checkLoop);
      //   console.log("arrNew[i].num", arrNew[i].num);

      if (arr1[i] === undefined) {
        arrNew[i].pri = pri;
      } else {
        arrNew[i].pri = arr1[i].pri;
      }
      if (checkLoop == 1) {
        arrNew[i].pri = pri;
        for (let j = i + 1; j < arr1.length; j++) {
          arrNew[j] = arr1[j];
        }
        return arrNew;
      }
      //nếu khác (ví dụ 1.2:A và 1.2:B) thì +1 cho số đứng sau và trả về arrNew => 1.2:A,1:C
      //nếu pri cũng giống thì chưa thể gán id, tiếp tục lặp qua object tiếp theo
      if (arr1[i].pri != arr2[i].pri) {
        arrNew[i + 1] = { num: [], pri: pri };
        arrNew[i + 1].num = getNumOfObject(arr1[i + 1]);
        if (arrNew[i + 1].num.length == 0) {
          arrNew[i + 1].num = [0];
        }
        arrNew[i + 1].num[0] += 1;
        arrNew[i + 1].pri = pri;
        for (let k = i + 2; k < arr1.length; k++) {
          arrNew[k] = arr1[k];
        }
        return arrNew;
      }
      //   console.log("arrNew ", arrNew);
    }
  }

  // hàm lặp qua mảng integer
  function iterateThroughNum(num1, num2, numNew) {
    const maxLength = Math.max(num1.length, num2.length);
    for (let i = 0; i < maxLength; i++) {
      // lấy số thứ i trong mảng, phần tử i trong num1 undefined thì trả về 0, phần tử i num2 undefined thì trả về 99999(số max)
      const intOfnum1 = getInteger1(num1[i]);
      const intOfnum2 = getInteger2(num2[i]);
      //phần tử i bằng nhau thì gán cho numNew và qua vòng lặp khác
      if (intOfnum1 == intOfnum2) {
        numNew[i] = intOfnum1;
        continue;
      } else if (intOfnum1 < intOfnum2) {
        //nếu khác thì xét 2 trường hợp
        // nếu intOfnum1 + 1 = intOfnum2 thì chỉ gán intOfnum1 cho numNew[i] còn phần tử numNew[i+1] tiếp theo được gán =num1[i+1]+1 và lặp qua copy hết các phần tử còn lại của num1 và return 1(thông báo đã gán được 1 số hợp lý)
        //nếu intOfnum1 +1 <intOfnum2 thì gán intOfnum1 +1 cho numNew[i] và cũng copy hết các phần tử còn lại và return 1
        if (intOfnum1 + 1 == intOfnum2) {
          numNew[i] = intOfnum1;
          numNew[i + 1] = getInteger1(num1[i + 1]) + 1;
          for (let k = i + 2; k < num1.length; k++) {
            numNew[k] = getInteger1(num1[k]);
          }
          //   console.log("numNew", numNew);
          return 1;
        } else {
          numNew[i] = intOfnum1 + 1;
          for (let j = i + 1; j < num1.length; j++) {
            numNew[j] = getInteger1(num1[j]);
          }
          //   console.log("numNew2", numNew);
          return 1;
        }
      }
    }
    // console.log(numNew);
    return 0;
  }

  //trả về mảng integer của object
  function getNumOfObject(object) {
    if (object === undefined) {
      return [];
    } else {
      return object.num;
    }
  }

  // trả về integer
  function getInteger1(integerOfnum1) {
    if (integerOfnum1 === undefined) {
      return 0;
    } else {
      return integerOfnum1;
    }
  }
  function getInteger2(integerOfnum2) {
    if (integerOfnum2 === undefined) {
      return 99999;
    } else {
      return integerOfnum2;
    }
  }

  //so sanhs id
  function compareID(id1, id2) {
    const arrOb1 = converIDToArrObjectWithNumAndPri(id1);
    const arrOb2 = converIDToArrObjectWithNumAndPri(id2);

    return iterateThroughArraysForCompare(arrOb1, arrOb2);
  }

  function iterateThroughArraysForCompare(arr1, arr2) {
    let checkLoop;
    const maxLength = Math.max(arr1.length, arr2.length);
    for (let i = 0; i < maxLength; i++) {
      //   console.log(i);
      //lấy mảng Num của object, nếu không có object thì trả về []
      const arr1Num = getNumOfObject(arr1[i]);
      const arr2Num = getNumOfObject(arr2[i]);
      if (arr1Num.length == 0) {
        return -1;
      }
      if (arr2Num.length == 0) {
        return 1;
      }
      checkLoop = iterateThroughNumForCompare(arr1Num, arr2Num);
      if (checkLoop != 0) {
        return checkLoop;
      }
      if (checkLoop == 0) {
        if (arr1[i].pri < arr2[i].pri) {
          return -1;
        } else if (arr1[i].pri > arr2[i].pri) {
          return 1;
        }
      }
    }
  }
  function iterateThroughNumForCompare(num1, num2) {
    const maxLength = Math.max(num1.length, num2.length);
    for (let i = 0; i < maxLength; i++) {
      // lấy số thứ i trong mảng, phần tử i trong num1 và num2 undefined thì trả về 0,
      const intOfnum1 = getInteger1(num1[i]);
      const intOfnum2 = getInteger1(num2[i]);

      if (intOfnum1 < intOfnum2) {
        return -1;
      } else if (intOfnum1 > intOfnum2) {
        return 1;
      } else {
        continue;
      }
    }
    return 0;
  }
}
onMounted(async () => {
  await fetchDocument();
  socket.connect();
  socket.on("give-priority", (doUuTien) => {
    pri = doUuTien;
    console.log(`độ ưu tiên là ${pri}`);
  });
  socket.on("update-insert-one", (charToInsert) => {
    const kiTu = JSON.parse(charToInsert);
    updateInsertion(kiTu);
  });
  socket.on("update-delete-one", (charToDelete) => {
    const tempChartoDelete = JSON.parse(charToDelete);
    updateDetele(tempChartoDelete);
  });
  socket.on("update-modify-id", (idupdated) => {
    const tmpIdUpdated = JSON.parse(idupdated);
    updateId(tmpIdUpdated);
  });
  showCode.value = document.querySelector("#show-code");
  contentDiv.value = document.querySelector("#content");
  contentDiv.value.innerHTML = `
        <div id=""></div></div><div id="1.2.3.4:A">a</div><div id="1.2.3.4:B">b</div><div id="1.2.5.4:A">c</div><div id="2.2.3.4:A">d</div><br>
  `;
});

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div class="container">
    <div class="container mt-3">
      <div class="toolbar p-3 bg-light border rounded">
        <div class="row mb-3">
          <!-- Input for document title -->
          <div class="col-lg-2 col-12">
            <input
              type="text"
              class="form-control"
              v-model="nameDoc"
              placeholder="Document Title"
            />
          </div>

          <!-- File Dropdown -->
          <div class="col-lg-1 col-6">
            <div class="dropdown">
              <button
                class="btn btn-outline-secondary dropdown-toggle w-100"
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
          </div>

          <!-- Format Dropdown -->
          <div class="col-lg-1 col-6 px-lg-1">
            <div class="dropdown">
              <button
                class="btn btn-outline-secondary dropdown-toggle w-100"
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
          </div>

          <!-- Font Size Dropdown -->
          <div class="col-lg-2 col-6">
            <div class="dropdown">
              <button
                class="btn btn-outline-secondary dropdown-toggle w-100"
                type="button"
                id="fontSizeDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Font Size
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
          </div>

          <!-- Text Color Picker -->
          <div
            class="col-lg-1 col-6 d-flex align-items-center btn btn-outline-secondary"
            style="height: 40px"
          >
            <label for="textColorPicker" class="me-2">Color</label>
            <input
              type="color"
              id="textColorPicker"
              class="form-control form-control-color"
              value="#000000"
              title="Choose text color"
              style="height: 26px"
            />
          </div>

          <!-- Background Color Picker -->
          <div
            style="height: 40px"
            class="col-lg-2 col-6 d-flex align-items-center btn btn-outline-secondary ms-lg-3 ms-2"
          >
            <label for="bgColorPicker" class="me-2">Background</label>
            <input
              type="color"
              id="bgColorPicker"
              class="form-control form-control-color"
              value="#000000"
              title="Choose background color"
              style="height: 26px"
            />
          </div>
        </div>

        <div class="row">
          <!-- Toolbar buttons -->
          <div class="col-12">
            <div class="d-flex align-items-center flex-wrap">
              <!-- Buttons -->
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-undo"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-redo"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-bold"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-italic"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-underline"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-strikethrough"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-align-left"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-align-center"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-align-right"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-list-ul"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-list-ol"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-link"></i>
              </button>
              <button class="btn btn-outline-secondary mx-1">
                <i class="fas fa-code"></i>
              </button>

              <!-- Extra Button -->
              <button class="btn btn-light mx-1">
                <i class="fa-solid fa-rotate-left"></i>
              </button>

              <!-- Share Dropdown -->
              <div class="dropdown mx-1">
                <button
                  class="btn btn-primary dropdown-toggle"
                  type="button"
                  id="shareDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style="
                    border-radius: 20px;
                    background-color: #add8e6;
                    color: black;
                  "
                >
                  <i class="fa-solid fa-lock me-1"></i>
                  Share
                </button>
                <ul class="dropdown-menu" aria-labelledby="shareDropdown">
                  <li><a class="dropdown-item" href="#">Copy Link</a></li>
                  <li><a class="dropdown-item" href="#">Share via Email</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Editable content area -->

      <div
        id="content"
        class="border mt-3 p-3 rounded"
        contenteditable="true"
        spellcheck="false"
        style="min-height: 200px"
        @keydown="XuLyNut"
        ref="contentRef"
      ></div>
    </div>
    <button @click="getContent">Get Content</button>
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
