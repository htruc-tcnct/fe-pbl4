<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { socket } from "../socket";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
const props = defineProps(["id", "ownerIdDocument"]);
let active = false;
let documentDetail = ref("");

const fetchDocumentInfor = async () => {
  try {
    const result = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/documents/detail/${props.id}`,
      {
        withCredentials: true,
      }
    );
    documentDetail.value = result.data.document;
    console.log("Thông tin tài liệu:", documentDetail.value);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin tài liệu:", error);
  }
};

const copyRoomID = () => {
  if (documentDetail.value) {
    navigator.clipboard
      .writeText(documentDetail.value.shareCode)
      .then(() => {
        console.log(
          "Đã sao chép vào bộ nhớ tạm:",
          documentDetail.value.shareCode
        );
      })
      .catch((err) => {
        console.error("Lỗi khi sao chép vào bộ nhớ tạm:", err);
      });
  } else {
    console.warn("Không có nội dung để sao chép.");
  }
};
onMounted(() => {
  fetchDocumentInfor();
  copyRoomID();
});
const openFile = () => {
  document.getElementById("fileInput").click();
};
function rgbToHex(rgb) {
  const result = rgb.match(/\d+/g);
  return result
    ? (
        (1 << 24) +
        (parseInt(result[0]) << 16) +
        (parseInt(result[1]) << 8) +
        parseInt(result[2])
      )
        .toString(16)
        .slice(1)
    : "000000";
}
const handleFileInput = async (event) => {
  const file = event.target.files[0];
  if (file) {
    const contentDiv = document.getElementById("content");

    const divElements = contentDiv.querySelectorAll("div");
    divElements.forEach((div) => {
      const charData = {
        id: div.id,
      };
      socket.emit("delete-one", JSON.stringify(charData));
    });

    contentDiv.innerHTML = "";

    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;

      try {
        const zip = new PizZip(arrayBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        const xmlContent = zip.file("word/document.xml").asText();
        const { htmlContent, charDataArray } = convertDocxXmlToHtml(xmlContent);
        console.log(">>>>>>>>>>>>>>>>>: ", charDataArray);
        contentDiv.innerHTML = htmlContent;

        charDataArray.forEach((charData) => {
          socket.emit("insert-one", JSON.stringify(charData));
          socket.emit("update-style", JSON.stringify(charData));
        });
      } catch (error) {
        console.error("Error reading DOCX file:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  if (!socketListenersInitialized) {
    socketListenersInitialized = true;

    socket.on("update-insert-one", (charToInsert) => {
      const kiTu = JSON.parse(charToInsert);
      const newDiv = document.createElement("div");
      newDiv.id = kiTu.id;
      newDiv.textContent = kiTu.content;
      newDiv.style.cssText = kiTu.style;
      document.getElementById("content").appendChild(newDiv);
    });

    socket.on("update-delete-one", (charToDelete) => {
      const kiTu = JSON.parse(charToDelete);
      const elementToDelete = document.getElementById(kiTu.id);
      if (elementToDelete) {
        elementToDelete.remove();
      }
    });
  }
};
function convertDocxXmlToHtml(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

  const paragraphs = xmlDoc.getElementsByTagName("w:p");
  let htmlContent = "";
  let previousId = null;
  const charDataArray = [];

  for (const p of paragraphs) {
    let paragraphHtml = "";
    const runs = p.getElementsByTagName("w:r");

    let isParagraphEmpty = true;

    for (const r of runs) {
      const texts = r.getElementsByTagName("w:t");

      for (const t of texts) {
        let textContent = t.textContent || "";
        if (textContent.trim() !== "") {
          isParagraphEmpty = false;
        }

        const colorNode = r.getElementsByTagName("w:color")[0];
        let styles = {};

        if (colorNode) {
          const colorValue = colorNode.getAttribute("w:val");
          styles.color = "#" + colorValue;
        }

        const boldNode = r.getElementsByTagName("w:b")[0];
        const italicNode = r.getElementsByTagName("w:i")[0];

        const isBold = boldNode && boldNode.getAttribute("w:val") !== "false";
        const isItalic =
          italicNode && italicNode.getAttribute("w:val") !== "false";

        if (isBold) {
          styles.fontWeight = "bold";
        }
        if (isItalic) {
          styles.fontStyle = "italic";
        }

        styles.display = "inline"; // Inline display for each character

        for (const char of textContent) {
          const charId = previousId ? spawnID(previousId, null) : "1:A";

          // Convert styles object to inline style string
          const styleString = Object.entries(styles)
            .map(([key, value]) => `${key}: ${value};`)
            .join(" ");

          const charDiv = `<div id="${charId}" style="${styleString}">${char}</div>`;

          const charData = {
            id: charId,
            content: char,
            styles: { ...styles }, // Store as object
          };
          charDataArray.push(charData);

          paragraphHtml += charDiv;
          previousId = charId;
        }
      }
    }

    if (isParagraphEmpty) {
      const lineBreakId = previousId ? spawnID(previousId, null) : "1:A";
      const lineBreakDiv = `<div id="${lineBreakId}" style="display: block;">&nbsp;</div>`;

      const lineBreakData = {
        id: lineBreakId,
        content: "&nbsp;",
        styles: { display: "block" },
      };
      charDataArray.push(lineBreakData);

      paragraphHtml += lineBreakDiv;
      previousId = lineBreakId;
    } else {
      const newLineId = previousId ? spawnID(previousId, null) : "1:A";
      const newLineDiv = `<div id="${newLineId}" style="display: block;"></div>`;

      const newLineData = {
        id: newLineId,
        content: "",
        styles: { display: "block" },
      };
      charDataArray.push(newLineData);

      paragraphHtml += newLineDiv;
      previousId = newLineId;
    }

    htmlContent += paragraphHtml;
  }

  return { htmlContent, charDataArray };
}

const exportToDocx = async () => {
  try {
    const contentElement = document.getElementById("content");
    const divElements = contentElement.querySelectorAll("div");

    const paragraphs = [];

    divElements.forEach((element) => {
      const text = element.innerText;

      const isBold = element.style.fontWeight === "bold";
      const isItalic = element.style.fontStyle === "italic";
      let color = element.style.color || "000000";

      if (color.startsWith("rgb")) {
        color = rgbToHex(color);
      } else {
        color = color.replace("#", "");
      }

      const textRun = new TextRun({
        text: text,
        bold: isBold,
        italics: isItalic,
        color: color,
      });

      if (element.style.display === "block") {
        paragraphs.push(new Paragraph({ children: [textRun] }));
      } else {
        if (paragraphs.length > 0) {
          paragraphs[paragraphs.length - 1].addChildElement(textRun);
        } else {
          paragraphs.push(new Paragraph({ children: [textRun] }));
        }
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
      creator: "Your App Name",
      title: "Exported Content",
      description: "Generated document from HTML content",
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "docsync.docx");
  } catch (error) {
    console.error("Error exporting document:", error);
  }
};
const showCode = ref(null);
const contentDiv = ref(null);
var pri;
let arrContentForCtrlV = [];
let arrdivStyle = [];

const XuLyNut = (event) => {
  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    (event.ctrlKey && event.key === "a")
  ) {
    return;
  }

  event.preventDefault();

  if (event.ctrlKey && event.key === "c") {
    controlPlusCHandling();
    return;
  }
  if (event.ctrlKey && event.key === "x") {
    controlPlusCHandling();
    deleteMultiHandling();
    return;
  }
  if (isTextSelected() && (event.key.length == 1 || event.key == "Backspace")) {
    deleteMultiHandling();
    if (event.key == "Backspace") return;
  }
  if (event.ctrlKey && event.key === "v") {
    controlPlusVHandling();
    return;
  }

  console.log("Bạn đã nhấn phím:", event.key);

  let currentDiv = getCurrentDiv();
  if (currentDiv.id === "content") {
    currentDiv = contentDiv.value.querySelector("div");
  }
  let nextDiv = getNextDiv();

  if (event.key.length == 1) {
    if (currentDiv) {
      if (currentDiv.id == "") {
        console.log("con trỏ ở id rỗng");
        if (nextDiv) {
          XuLyGoODauContent(nextDiv, event.key);
          return;
        } else {
          const lastDiv = contentDiv.value.querySelector("div:last-of-type");
          if (lastDiv.id == "") {
            XuLyGoKhiContentTrong(event.key);
            return;
          } else {
            currentDiv = lastDiv;
            nextDiv = null;
          }
        }
      }

      if (checkConTro(currentDiv)) {
        console.log("Con trỏ ở đầu content ", currentDiv.id);
        if (currentDiv.textContent == "" && currentDiv.id != "") {
          console.log("gặp phím enter");
        } else {
          const previousDiv = currentDiv.previousElementSibling;
          if (previousDiv.textContent == "" && previousDiv.id != "") {
            console.log("gặp phím enter 2");
            nextDiv = currentDiv;
            currentDiv = previousDiv;
          } else {
            XuLyGoODauContent(currentDiv, event.key);
            return;
          }
        }
      }

      const newDiv = document.createElement("div");

      newDiv.id = nextDiv
        ? spawnID(currentDiv.id, nextDiv.id)
        : spawnID(currentDiv.id, null);
      if (event.key == " ") {
        newDiv.textContent = "\u00A0";
      } else {
        newDiv.textContent = event.key;
      }

      if (currentDiv.nextSibling) {
        currentDiv.parentNode.insertBefore(newDiv, currentDiv.nextSibling);
      } else {
        currentDiv.parentNode.appendChild(newDiv);
      }
      console.log("Đã chèn thẻ <div> mới sau thẻ có id:", currentDiv.id);

      const range = document.createRange();
      const selection = window.getSelection();

      range.selectNodeContents(newDiv);

      range.collapse(false);

      selection.removeAllRanges();
      selection.addRange(range);

      console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

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
          const lastDiv = contentDiv.value.querySelector("div:last-of-type");
          if (lastDiv.id == "") {
            console.log("không xóa id rỗng");
            return;
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type");
            if (lastDiv.id == "") {
              XuLyGoKhiContentTrong(event.key);
              return;
            } else {
              currentDiv = lastDiv;
              nextDiv = null;
            }
          }
        }
        if (checkConTro(currentDiv)) {
          console.log("Con trỏ ở đầu content ", currentDiv.id);
          if (currentDiv.textContent == "" && currentDiv.id != "") {
            console.log("gặp phím enter");
          } else {
            const previousDiv = currentDiv.previousElementSibling;
            if (previousDiv.textContent == "" && previousDiv.id != "") {
              console.log("gặp phím enter 2");
              nextDiv = currentDiv;
              currentDiv = previousDiv;
            } else {
              return;
            }
          }
        }

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

          console.log(
            `Đã xóa ${idCurrentDiv} và di chuyển con trỏ về cuối của div trước đó.`,
            previousDiv.id
          );

          const charToDelete = {
            id: idCurrentDiv,
          };
          socket.emit("delete-one", JSON.stringify(charToDelete));
        } else {
          console.log("không có div nằm trước currentDiv");
        }
      }
    } else if (event.key == "Enter") {
      if (currentDiv) {
        if (window.getComputedStyle(currentDiv).display === "block") {
          console.log("không chèn thêm phím enter");
          return;
        }
        if (nextDiv && window.getComputedStyle(nextDiv).display === "block") {
          console.log("không chèn thêm phím enter 2 ");
          return;
        }
        if (currentDiv.id == "") {
          console.log("con trỏ ở id rỗng");
          if (nextDiv) {
            XuLyGoODauContent(nextDiv, event.key);
            return;
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type");
            if (lastDiv.id == "") {
              XuLyGoKhiContentTrong(event.key);
              return;
            } else {
              currentDiv = lastDiv;
              nextDiv = null;
              if (window.getComputedStyle(currentDiv).display === "block") {
                console.log("không chèn thêm phím enter");
                return;
              }
              if (
                nextDiv &&
                window.getComputedStyle(nextDiv).display === "block"
              ) {
                console.log("không chèn thêm phím enter 2 ");
                return;
              }
            }
          }
        }

        if (checkConTro(currentDiv)) {
          console.log("Con trỏ ở đầu content ", currentDiv.id);
          if (currentDiv.textContent == "" && currentDiv.id != "") {
            console.log("gặp phím enter");
          } else {
            const previousDiv = currentDiv.previousElementSibling;
            if (previousDiv.textContent == "" && previousDiv.id != "") {
              console.log("gặp phím enter 2");
              nextDiv = currentDiv;
              currentDiv = previousDiv;
            } else {
              XuLyGoODauContent(currentDiv, event.key);
              return;
            }
          }
        }

        const newDiv = document.createElement("div");

        newDiv.id = nextDiv
          ? spawnID(currentDiv.id, nextDiv.id)
          : spawnID(currentDiv.id, null);

        newDiv.textContent = "";
        newDiv.style.display = "block";

        if (currentDiv.nextSibling) {
          currentDiv.parentNode.insertBefore(newDiv, currentDiv.nextSibling);
        } else {
          currentDiv.parentNode.appendChild(newDiv);
        }
        console.log("Đã chèn thẻ <div> mới sau thẻ có id:", currentDiv.id);

        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(newDiv);

        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);

        console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

        const divVuaTao = {
          id: newDiv.id,
          content: newDiv.textContent,
        };
        socket.emit("insert-one", JSON.stringify(divVuaTao));
        const divStyle = {
          id: newDiv.id,
          styles: {
            display: "block",
          },
        };
        socket.emit("update-style", JSON.stringify(divStyle));
      } else {
        console.log("khong co div trc");
      }
    } else if (event.key === "ArrowUp") {
      if (currentDiv) {
        if (currentDiv.id == "") {
          console.log("con trỏ ở id rỗng");
          if (nextDiv) {
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type");
            if (lastDiv.id == "") {
              XuLyGoKhiContentTrong(event.key);
              return;
            } else {
              console.log("đã xử lý");
              currentDiv = lastDiv;
              nextDiv = null;
            }
          }
        }

        const divAbove = getDivAbove(currentDiv);
        if (!divAbove) {
          console.log("không có div nằm trên");
          return;
        }
        const selection = window.getSelection();

        const newRange = document.createRange();
        newRange.selectNodeContents(divAbove);
        newRange.collapse(false);

        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        console.log("khong co div trc");
      }
    } else if (event.key === "ArrowDown") {
      if (currentDiv) {
        if (currentDiv.id == "") {
          console.log("con trỏ ở id rỗng");
          if (nextDiv) {
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type");
            if (lastDiv.id == "") {
              XuLyGoKhiContentTrong(event.key);
              return;
            } else {
              console.log("đã xử lý");
              currentDiv = lastDiv;
              nextDiv = null;
            }
          }
        }

        const divBelow = getDivBelow(currentDiv);
        if (!divBelow) {
          console.log("không có div nằm dưới");
          return;
        }
        const selection = window.getSelection();

        const newRange = document.createRange();
        newRange.selectNodeContents(divBelow);
        newRange.collapse(false);

        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        console.log("khong co div trc");
      }
    }

    if (nextDiv) {
      console.log("Thẻ <div> phía sau có id:", nextDiv.id);
    } else {
      console.log("Không có thẻ <div> nào phía sau.");
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

  if (nextElement && nextElement.tagName === "DIV") {
    return nextElement;
  }

  return null;
}

function updateInsertion(kiTu) {
  const newDiv = document.createElement("div");
  newDiv.id = kiTu.id;
  newDiv.textContent = kiTu.content;

  let inserted = false;
  const divs = contentDiv.value.querySelectorAll("div");

  for (let div of divs) {
    if (div.id == "") continue;
    if (compareID(div.id, newDiv.id) == 1 && !inserted) {
      contentDiv.value.insertBefore(newDiv, div);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    const lastDiv = divs[divs.length - 1];
    lastDiv.insertAdjacentElement("afterend", newDiv);
  }

  console.log("Thẻ mới đã được chèn:", newDiv);
}
function updateDetele(Kitu) {
  const divToDelete = document.getElementById(Kitu.id);

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

    if (currentDiv && currentDiv.id == divToDelete.id) {
      const previousDiv = divToDelete.previousSibling;
      divToDelete.remove();

      if (selection) {
        const newRange = document.createRange();
        newRange.selectNodeContents(previousDiv);
        newRange.collapse(false);

        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        console.log("khong co selection");
      }
    } else {
      divToDelete.remove();
      if (selection) {
        const newRange = document.createRange();
        newRange.selectNodeContents(currentDiv);
        newRange.collapse(false);

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

function updateStyle(divNeedUpdateStyle) {
  const targetDiv = document.getElementById(divNeedUpdateStyle.id);

  if (targetDiv) {
    for (const [styleKey, styleValue] of Object.entries(
      divNeedUpdateStyle.styles
    )) {
      targetDiv.style[styleKey] = styleValue;
    }
  } else {
    console.error(`Div with ID ${divNeedUpdateStyle.id} not found.`);
  }
}

function checkConTro(currentDiv) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;

    const content = currentDiv.textContent.trim();
    const indexOfC = content.indexOf(currentDiv.textContent);

    if (cursorPosition > indexOfC) {
      return false;
    } else {
      return true;
    }
  }
}

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

function XuLyGoODauContent(currentDiv, key) {
  var needUpdateStyle = false;

  const newDiv = document.createElement("div");

  newDiv.id = spawnID(null, currentDiv.id);

  if (key == " ") {
    newDiv.textContent = "\u00A0";
  } else {
    if (key == "Enter") {
      newDiv.textContent = "";
      newDiv.style.display = "block";
      needUpdateStyle = true;
    } else {
      newDiv.textContent = key;
    }
  }

  currentDiv.parentNode.insertBefore(newDiv, currentDiv);

  console.log("Đã chèn thẻ <div> mới trước thẻ có id:", currentDiv.id);

  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(newDiv);

  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);

  console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

  const divVuaTao = {
    id: newDiv.id,
    content: newDiv.textContent,
  };
  socket.emit("insert-one", JSON.stringify(divVuaTao));
  if (needUpdateStyle) {
    const divStyle = {
      id: newDiv.id,
      styles: {
        display: "block",
      },
    };
    socket.emit("update-style", JSON.stringify(divStyle));
  }
}

function XuLyGoKhiContentTrong(key) {
  var needUpdateStyle = false;

  const newDiv = document.createElement("div");

  newDiv.id = "1:" + pri;
  if (key == " ") {
    newDiv.textContent = "\u00A0";
  } else {
    if (key == "Enter") {
      newDiv.textContent = "";
      newDiv.style.display = "block";
      needUpdateStyle = true;
    } else {
      newDiv.textContent = key;
    }
  }

  contentDiv.value.innerHTML = "";

  const newParagraph = document.createElement("div");
  newParagraph.innerHTML = "";
  newParagraph.id = "";

  contentDiv.value.appendChild(newParagraph);

  contentDiv.value.appendChild(newDiv);

  const lineBreak = document.createElement("br");
  contentDiv.value.appendChild(lineBreak);

  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(newDiv);

  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);

  console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

  const divVuaTao = {
    id: newDiv.id,
    content: newDiv.textContent,
  };
  socket.emit("insert-one", JSON.stringify(divVuaTao));
  if (needUpdateStyle) {
    const divStyle = {
      id: newDiv.id,
      styles: {
        display: "block",
      },
    };
    socket.emit("update-style", JSON.stringify(divStyle));
  }
}

function converIDToArrObjectWithNumAndPri(id) {
  const result = id.split(",").map((pair) => {
    const [num, pri] = pair.split(":");
    return { num, pri };
  });
  return result.map((obj) => {
    const numArray = obj.num.split(".").map(Number);
    return { ...obj, num: numArray };
  });
}
function convertArrObjectToID(arr) {
  const result = arr.map((obj) => {
    const numString = obj.num.join(".");
    return { ...obj, num: numString };
  });
  return result.map((obj) => `${obj.num}:${obj.pri}`).join(",");
}

function iterateThroughArrays(arr1, arr2, arrNew) {
  let checkLoop;
  const maxLength = Math.max(arr1.length, arr2.length);
  for (let i = 0; i < maxLength; i++) {
    arrNew[i] = { num: [], pri: pri };

    const arr1Num = getNumOfObject(arr1[i]);
    const arr2Num = getNumOfObject(arr2[i]);
    checkLoop = iterateThroughNum(arr1Num, arr2Num, arrNew[i].num);

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
  }
}

function iterateThroughNum(num1, num2, numNew) {
  const maxLength = Math.max(num1.length, num2.length);
  for (let i = 0; i < maxLength; i++) {
    const intOfnum1 = getInteger1(num1[i]);
    const intOfnum2 = getInteger2(num2[i]);

    if (intOfnum1 == intOfnum2) {
      numNew[i] = intOfnum1;
      continue;
    } else if (intOfnum1 < intOfnum2) {
      if (intOfnum1 + 1 == intOfnum2) {
        numNew[i] = intOfnum1;
        numNew[i + 1] = getInteger1(num1[i + 1]) + 1;
        for (let k = i + 2; k < num1.length; k++) {
          numNew[k] = getInteger1(num1[k]);
        }

        return 1;
      } else {
        numNew[i] = intOfnum1 + 1;
        for (let j = i + 1; j < num1.length; j++) {
          numNew[j] = getInteger1(num1[j]);
        }

        return 1;
      }
    }
  }

  return 0;
}

function getNumOfObject(object) {
  if (object === undefined) {
    return [];
  } else {
    return object.num;
  }
}

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

function compareID(id1, id2) {
  const arrOb1 = converIDToArrObjectWithNumAndPri(id1);
  const arrOb2 = converIDToArrObjectWithNumAndPri(id2);

  return iterateThroughArraysForCompare(arrOb1, arrOb2);
}

function iterateThroughArraysForCompare(arr1, arr2) {
  let checkLoop;
  const maxLength = Math.max(arr1.length, arr2.length);
  for (let i = 0; i < maxLength; i++) {
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

function getSelectedDivIds() {
  const content = document.getElementById("content");
  let selectedDivIds = [];

  if (window.getSelection) {
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      if (content.contains(range.commonAncestorContainer)) {
        const selectedNodes = range.cloneContents().querySelectorAll("div");

        selectedDivIds = Array.from(selectedNodes)
          .filter((node) => node.id)
          .map((node) => node.id);
      }
    }
  }
  if (selectedDivIds.length == 0) {
    if (window.getSelection) {
      const selection = window.getSelection();

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        if (content.contains(range.commonAncestorContainer)) {
          let node = range.commonAncestorContainer;

          while (node && node !== content) {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              node.tagName === "DIV" &&
              node.id
            ) {
              selectedDivIds.push(node.id);
              break;
            }
            node = node.parentNode;
          }
        }
      }
    }
    return selectedDivIds;
  } else {
    return selectedDivIds;
  }
}

function makeSelectedDivsBold() {
  const selectedDivIds = getSelectedDivIds();

  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        if (div.style.fontWeight === "bold") {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              fontWeight: "",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        } else {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              fontWeight: "bold",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

function makeSelectedDivsUnderLined() {
  const selectedDivIds = getSelectedDivIds();
  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        if (div.style.textDecoration === "underline") {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        } else {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "underline",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

function makeSelectedDivsStrikethrough() {
  const selectedDivIds = getSelectedDivIds();
  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        if (div.style.textDecoration === "line-through") {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        } else {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "line-through",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

// function makeSelectedDivsAlign(input) {
//   const selectedDivIds = getSelectedDivIds();
//   if (selectedDivIds.length > 0) {
//     selectedDivIds.forEach((id) => {
//       const div = document.getElementById(id);
//       if (div) {
//         if (div.style.textAlign === input) {
//           const divStyle = {
//             time: Date.now().toString(),
//             pri: pri,
//             id: div.id,
//             styles: {
//               textAlign: "",
//             },
//           };
//           if (applyStyle(divStyle)) {
//             socket.emit("update-style", JSON.stringify(divStyle));
//           }
//         } else {
//           const divStyle = {
//             time: Date.now().toString(),
//             pri: pri,
//             id: div.id,
//             styles: {
//               textAlign: input,
//             },
//           };
//           if (applyStyle(divStyle)) {
//             socket.emit("update-style", JSON.stringify(divStyle));
//           }
//         }
//       }
//     });
//   } else {
//     console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
//   }
// }
function makeSelectedDivsAlignCenter() {
  const contentDiv = document.getElementById("content");
  const selectedDivIds = getSelectedDivIds();

  if (selectedDivIds.length === 0) {
    console.log("Không có thẻ <div> nào được chọn.");
    return;
  }

  // Kiểm tra trạng thái hiện tại của #content để xác định căn giữa hay căn trái
  const isCurrentlyCentered = contentDiv.style.textAlign === "center";
  const newAlignment = isCurrentlyCentered ? "left" : "center";

  // Đặt `text-align` cho #content để căn giữa hoặc căn trái
  contentDiv.style.textAlign = newAlignment;

  // Áp dụng căn giữa hoặc căn trái cho từng thẻ <div> con được chọn
  selectedDivIds.forEach((id) => {
    const div = document.getElementById(id);
    if (div) {
      if (newAlignment === "center") {
        div.style.display = "inline-block"; // Đặt inline-block để các thẻ nằm trên cùng một dòng
      } else {
        div.style.display = ""; // Đặt lại display về mặc định để trở về căn trái
      }
      div.style.textAlign = newAlignment;
    }
  });
}

function changeFontSize(input) {
  const selectedDivIds = getSelectedDivIds();
  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: div.id,
          styles: {
            fontSize: input,
          },
        };
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

function makeSelectedDivsUnderline() {
  const selectedDivIds = getSelectedDivIds();

  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        if (div.style.textDecoration === "underline") {
          // Nếu đã gạch chân, thì bỏ gạch chân
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        } else {
          // Nếu chưa gạch chân, thì gạch chân
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "underline",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

function makeSelectedDivsItalic() {
  const selectedDivIds = getSelectedDivIds();

  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        if (div.style.fontStyle === "italic") {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              fontStyle: "",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        } else {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              fontStyle: "italic",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

function handleColorChange(event) {
  const selectedColor = event.target.value;
  const selectedDivIds = getSelectedDivIds();

  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: div.id,
          styles: {
            color: selectedColor,
          },
        };
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

function handleBackGroundColorChange(event) {
  const selectedColor = event.target.value;
  const selectedDivIds = getSelectedDivIds();

  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: div.id,
          styles: {
            backgroundColor: selectedColor,
          },
        };
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }
      }
    });
  } else {
    console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

setInterval(() => {
  arrdivStyle = [];
  console.log("Mảng đã arrdivStyle được xóa:");
}, 30000);

function controlPlusCHandling() {
  const selectedIds = getSelectedDivIds();
  getDivContentsByIds(selectedIds);
}

function controlPlusVHandling() {
  console.log(arrContentForCtrlV);
  simulateKeydownForArray();
}

function getDivContentsByIds(selectedIds) {
  arrContentForCtrlV.splice(0, arrContentForCtrlV.length);
  selectedIds.forEach((id) => {
    const div = document.getElementById(id);
    if (div) {
      arrContentForCtrlV.push(div.textContent);
    }
  });

  return arrContentForCtrlV;
}

function simulateKeydownForArray() {
  const contentDiv = document.getElementById("content");

  if (contentDiv) {
    arrContentForCtrlV.forEach((key) => {
      const keydownEvent = new KeyboardEvent("keydown", { key: key });
      contentDiv.dispatchEvent(keydownEvent);
    });
  }
}

function isTextSelected() {
  const selection = window.getSelection();
  const selectedText = selection.toString();

  if (selectedText.length > 0) {
    return true;
  } else {
    return false;
  }
}

function simulateKeydownBackSpaceForArray(count) {
  const contentDiv = document.getElementById("content");

  if (contentDiv) {
    for (let i = 0; i < count; i++) {
      const keydownEvent = new KeyboardEvent("keydown", { key: "Backspace" });
      contentDiv.dispatchEvent(keydownEvent);
    }
  }
}
function deleteMultiHandling() {
  const selectedIds = getSelectedDivIds();
  const count = selectedIds.length;

  const lastDiv =
    selectedIds.length > 0
      ? document.getElementById(selectedIds[selectedIds.length - 1])
      : null;

  console.log(lastDiv);

  const selection = window.getSelection();

  const newRange = document.createRange();
  newRange.selectNodeContents(lastDiv);
  newRange.collapse(false);

  selection.removeAllRanges();
  selection.addRange(newRange);
  simulateKeydownBackSpaceForArray(count);
}

function getDivAbove(currentDiv) {
  const currentRect = currentDiv.getBoundingClientRect();
  const allDivs = document.querySelectorAll("#content div");
  let divAbove = null;
  let closestDistance = Infinity;

  allDivs.forEach((div) => {
    if (div !== currentDiv) {
      const rect = div.getBoundingClientRect();

      if (rect.bottom <= currentRect.top) {
        const distance = currentRect.top - rect.bottom;
        const distanceRight = Math.abs(currentRect.right - rect.right);

        if (distanceRight < closestDistance && distance == 0) {
          closestDistance = distanceRight;
          divAbove = div;
        }
      }
    }
  });

  return divAbove;
}

function getDivBelow(currentDiv) {
  const currentRect = currentDiv.getBoundingClientRect();
  const allDivs = document.querySelectorAll("#content div");
  let divAbove = null;
  let closestDistance = Infinity;

  allDivs.forEach((div) => {
    if (div !== currentDiv) {
      const rect = div.getBoundingClientRect();

      if (rect.top >= currentRect.bottom) {
        const distance = currentRect.bottom - rect.top;
        const distanceRight = Math.abs(currentRect.right - rect.right);

        if (distanceRight < closestDistance && distance == 0) {
          closestDistance = distanceRight;
          divAbove = div;
        }
      }
    }
  });

  return divAbove;
}

function applyStyle(divStyle) {
  for (var i = 0; i < arrdivStyle.length; i++) {
    if (checkConflict(arrdivStyle[i], divStyle) == true) {
      if (Number(arrdivStyle[i].time) > Number(divStyle.time)) {
        return false;
      } else if (Number(arrdivStyle[i].time) < Number(divStyle.time)) {
        arrdivStyle[i] = divStyle;
        updateStyle(divStyle);
        return true;
      } else {
        if (arrdivStyle[i].pri > divStyle.pri) {
          return false;
        } else {
          arrdivStyle[i] = divStyle;
          updateStyle(divStyle);
          return true;
        }
      }
    }
  }

  arrdivStyle.push(divStyle);
  updateStyle(divStyle);
  return true;
}
function checkConflict(element, divStyle) {
  if (element == null) {
    return false;
  }
  if (element.id.toString() !== divStyle.id.toString()) {
    return false;
  } else if (
    Object.keys(element.styles).toString() !==
    Object.keys(divStyle.styles).toString()
  ) {
    return false;
  } else {
    return true;
  }
}
onMounted(() => {
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
  socket.on("update-modify-style", (divStyle) => {
    const idUpdatedStyle = JSON.parse(divStyle);
    applyStyle(idUpdatedStyle);
  });
  showCode.value = document.querySelector("#show-code");
  contentDiv.value = document.querySelector("#content");
  contentDiv.value.innerHTML = `
        <div id=""></div></div><div id="1:A">a</div><div id="2:B">b</div><div id="3:A">c</div><div id="4:A">d</div><br>
  `;

  //get div
  function getAllContentAndStyles() {
    const contentDiv = document.getElementById("content");

    if (!contentDiv) {
      console.log("Không tìm thấy phần tử #content");
      return [];
    }

    const divElements = contentDiv.querySelectorAll("div");

    if (divElements.length === 0) {
      console.log("Không có thẻ <div> con nào bên trong #content");
      return [];
    }

    const contentAndStyles = Array.from(divElements).map((div) => {
      return {
        id: div.id,
        content: div.textContent,
        styles: div.getAttribute("style") || "",
      };
    });

    return contentAndStyles;
  }
  fetchDocumentInfor();

  // console.log(getAllContentAndStyles());
});
onBeforeUnmount(() => {
  socket.disconnect();
});
</script>
<template>
  <div class="container">
    <div class="container mt-3">
      <div class="toolbar p-3 bg-light border rounded">
        <div
          class="d-flex align-items-center mb-2"
          style="height: 60px; width: 100%"
        >
          <!-- Logo bên trái -->
          <img
            src="../assets/logo.png"
            alt="Logo"
            style="height: 50px; margin-right: 10px"
          />
          <input
            type="label"
            class="form-control me-2"
            :placeholder="documentDetail.documentTitle || 'Document'"
            style="width: 200px"
          />

          <!-- File Dropdown -->
          <div class="dropdown me-2">
            <button
              class="btn btn-outline-secondary dropdown-toggle"
              type="button"
              id="fileDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style="width: 70px; height: 35px"
            >
              File
            </button>
            <ul class="dropdown-menu" aria-labelledby="fileDropdown">
              <li><a class="dropdown-item" href="#">New</a></li>
              <li>
                <a class="dropdown-item" href="#" @click="openFile">Open</a>
              </li>
              <li>
                <a class="dropdown-item" href="#" @click="exportToDocx"
                  >Save as docs</a
                >
              </li>
            </ul>
            <input
              type="file"
              id="fileInput"
              style="display: none"
              accept=".docx"
              @change="handleFileInput"
            />
          </div>

          <!-- Format Dropdown -->
          <div class="dropdown me-2">
            <button
              class="btn btn-outline-secondary dropdown-toggle"
              type="button"
              id="formatDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style="width: 90px; height: 35px"
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
              style="width: 100px; height: 35px"
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

          <div class="d-flex align-items-center ms-auto" style="margin: 0">
            <div class="d-flex align-items-center me-3" style="margin: 0">
              <img
                src="../assets/timkiemlg.png"
                alt="Search Icon"
                style="height: 20px; width: 20px; margin-right: 10px"
              />
              <input
                type="text"
                class="form-control"
                placeholder="Looking for tools"
                style="
                  width: 200px;
                  height: 40px;
                  font-size: 15px;
                  margin-right: 20px;
                "
              />

              <button
                class="btn btn-dark dropdown-toggle"
                type="button"
                id="shareDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style="margin: 0"
              >
                Share
              </button>
              <ul
                class="dropdown-menu dropdown-menu-end"
                aria-labelledby="shareDropdown"
                style="margin: 0"
              >
                <li>
                  <a
                    class="dropdown-item"
                    href="#"
                    @click="copyRoomID()"
                    style="margin: 0"
                    >Sao chép ID Room</a
                  >
                </li>
              </ul>
            </div>

            <!-- Avatar Image Right Next to "Chia Sẻ" Button -->
            <img
              src="../assets/gg.png"
              alt="Avatar"
              style="height: 35px; width: 35px; border-radius: 50%; margin: 0"
              onclick="avatarClicked()"
            />
          </div>
        </div>

        <div style="width: 100%">
          <hr
            style="border: none; border-top: 2px solid #000; margin-top: 10px"
          />
        </div>

        <div class="d-flex justify-content-left align-items-center">
          <button
            class="btn btn-outline-secondary"
            style="margin-right: 10px"
            @click="makeSelectedDivsBold"
          >
            <i class="fas fa-bold"></i>
          </button>
          <button
            class="btn btn-outline-secondary"
            style="margin-right: 10px"
            @click="makeSelectedDivsItalic"
          >
            <i class="fas fa-italic"></i>
          </button>
          <button
            @click="makeSelectedDivsUnderline"
            class="btn btn-outline-secondary"
            style="margin-right: 10px"
          >
            <i class="fas fa-underline"></i>
          </button>
          <button class="btn btn-outline-secondary" style="margin-right: 10px">
            <i class="fas fa-strikethrough"></i>
          </button>
          <button class="btn btn-outline-secondary" style="margin-right: 10px">
            <i class="fas fa-align-left"></i>
          </button>
          <button
            @click="makeSelectedDivsAlignCenter"
            class="btn btn-outline-secondary"
            style="margin-right: 10px"
          >
            <i class="fas fa-align-center"></i>
          </button>
          <button class="btn btn-outline-secondary" style="margin-right: 10px">
            <i class="fas fa-align-right"></i>
          </button>

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
              @input="handleColorChange"
              value="#000000"
              title="Choose text color"
              style="height: 28px; width: 25px"
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
              @input="handleBackGroundColorChange"
              value="#000000"
              title="Choose text color"
              style="height: 28px; width: 28px"
            />
          </div>
        </div>
      </div>
      <div style="width: 100%">
        <hr
          style="border: none; border-top: 2px solid #000; margin-top: 20px"
        />
      </div>
      <!-- Editable c`ontent area -->

      <div
        id="content"
        class="border mt-3 p-3 rounded"
        contenteditable="true"
        spellcheck="false"
        style="min-height: 200px"
        @keydown="XuLyNut"
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
