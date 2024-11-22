<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  AlignmentAttributes,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";
import { useRouter } from "vue-router";
import { socket } from "../socket";
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
    // console.log("Thông tin tài liệu:", documentDetail.value);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin tài liệu:", error);
  }
};

const copyRoomID = () => {
  if (documentDetail.value) {
    navigator.clipboard
      .writeText(documentDetail.value.shareCode)
      .then(() => {})
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
function parseStyleString(styleString) {
  const styles = {};
  styleString.split(";").forEach((style) => {
    if (style.trim()) {
      const [key, value] = style.split(":");
      styles[key.trim()] = value.trim();
    }
  });
  return styles;
}
const handleFileInput = async (event) => {
  const file = event.target.files[0];
  if (file) {
    const contentDiv = document.getElementById("content");

    // Clear current content and emit delete events for existing div elements
    const divElements = contentDiv.querySelectorAll("div");
    divElements.forEach((div) => {
      const charData = { id: div.id };
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

        // Set the converted HTML content
        contentDiv.innerHTML = htmlContent;

        // Emit events to insert characters and update styles
        charDataArray.forEach((charData) => {
          const characterToAvoid = "&nbsp;";
          if (charData.content.includes(characterToAvoid)) {
            return; // Continue to the next iteration
          }
          const styles = parseStyleString(charData.style);
          charData.styles = styles;
          delete charData.style;
          socket.emit("insert-one", JSON.stringify(charData));
          socket.emit("update-style", JSON.stringify(charData));
        });
      } catch (error) {
        console.error("Error reading DOCX file:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Initialize socket listeners if not already initialized
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
function makeSelectedDivsAlign(input, haha = "") {
  const selectedDivIds =
    getSelectedDivIds().length > 0 ? getSelectedDivIds() : [haha.id];

  let checkLeftmost;
  console.log("????????????????: ", selectedDivIds);
  if (input === "center") {
    selectedDivIds.forEach((divId) => {
      const leftMost = findLeftMostInSameRow(divId) || haha;
      console.log("leftMost: ", leftMost);
      if (checkLeftmost !== leftMost) {
        const marginLeftValue = calculateMarginLeftForCenterAlign(
          leftMost.id,
          haha
        );
        console.log("KQ NEF: ", marginLeftValue);
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: leftMost.id,
          styles: {
            marginLeft: marginLeftValue + "px",
            textAlign: "center",
          },
        };
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }
        checkLeftmost = leftMost;
      }
    });
    return;
  } else if (input == "right") {
    selectedDivIds.forEach((divId) => {
      const leftMost = findLeftMostInSameRow(divId) || haha;
      if (checkLeftmost != leftMost) {
        const marginLeftValue = calculateMarginLeftForRightAlign(
          leftMost.id,
          haha
        );
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: leftMost.id,
          styles: {
            marginLeft: marginLeftValue + "px",
            textAlign: "right",
          },
        };
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }
        checkLeftmost = leftMost;
      }
    });
    return;
  } else if (input == "left") {
    selectedDivIds.forEach((divId) => {
      const leftMost = findLeftMostInSameRow(divId) || haha;
      if (checkLeftmost != leftMost) {
        const marginLeftValue = 0;
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: leftMost.id,
          styles: {
            marginLeft: "",
            textAlign: "",
          },
        };
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }
        checkLeftmost = leftMost;
      }
    });
    return;
  }
}
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
    let paragraphAlignment = "left"; // Default alignment

    // Get alignment from paragraph properties
    const paragraphProperties = p.getElementsByTagName("w:pPr")[0];
    if (paragraphProperties) {
      const alignmentNode = paragraphProperties.getElementsByTagName("w:jc")[0];
      if (alignmentNode) {
        const alignmentValue = alignmentNode.getAttribute("w:val");
        if (alignmentValue) {
          paragraphAlignment = convertAlignment(alignmentValue);
        }
      }
    }

    let charactersHtml = ""; // To hold the HTML for all characters

    for (const r of runs) {
      const texts = r.getElementsByTagName("w:t");

      for (const t of texts) {
        let textContent = t.textContent || "";
        if (textContent.trim() !== "") {
          isParagraphEmpty = false;
        }

        // Extract styling information
        let styles = {};

        // Handle color
        const colorNode = r.getElementsByTagName("w:color")[0];
        if (colorNode) {
          const colorValue = colorNode.getAttribute("w:val");
          if (colorValue && colorValue !== "auto") {
            styles["color"] = `#${colorValue}`;
          }
        }

        // Handle background color (highlight)
        const bg = r.getElementsByTagName("w:shd")[0];
        if (bg) {
          const bgValue = bg.getAttribute("w:fill");
          if (bgValue && bgValue !== "auto") {
            styles["background-color"] = `#${bgValue}`;
          }
        }

        // Handle bold, italic, and underline
        const boldNode = r.getElementsByTagName("w:b")[0];
        const italicNode = r.getElementsByTagName("w:i")[0];
        const underlineNode = r.getElementsByTagName("w:u")[0];

        const isBold = boldNode && boldNode.getAttribute("w:val") !== "false";
        const isItalic =
          italicNode && italicNode.getAttribute("w:val") !== "false";
        const isUnderline =
          underlineNode && underlineNode.getAttribute("w:val") !== "false";

        if (isBold) {
          styles["font-weight"] = "bold";
        }
        if (isItalic) {
          styles["font-style"] = "italic";
        }
        if (isUnderline) {
          styles["text-decoration"] = "underline";
        }

        styles["display"] = "inline";

        // Create divs for each character
        for (const char of textContent) {
          const charId = previousId ? spawnID(previousId, null) : "1:A";

          const styleString = Object.entries(styles)
            .map(([key, value]) => `${key}: ${value};`)
            .join(" ");

          const charDiv = `<div id="${charId}" style="${styleString}">${char}</div>`;

          const charData = {
            id: charId,
            content: char,
            style: styleString,
          };
          charDataArray.push(charData);

          charactersHtml += charDiv;
          previousId = charId;
        }
      }
    }

    // Parse all characters' HTML
    const parsedHtml = parser.parseFromString(charactersHtml, "text/html");
    const parsedElements = Array.from(parsedHtml.body.children);

    if (parsedElements.length > 0) {
      const containerWidth = document.getElementById("content").clientWidth;
      let totalWidth = parsedElements.reduce((acc, el) => {
        return acc + el.offsetWidth;
      }, 0);

      let marginLeft = 0;

      if (paragraphAlignment === "center") {
        marginLeft = (containerWidth - totalWidth) / 2;
      } else if (paragraphAlignment === "right") {
        marginLeft = containerWidth - totalWidth;
      } else if (paragraphAlignment === "left") {
        marginLeft = 0;
      }

      // Apply margin-left to the entire line
      parsedElements.forEach((el, index) => {
        if (index === 0) {
          el.style.marginLeft = `${Math.max(0, marginLeft)}px`;
        }
      });

      paragraphHtml += parsedElements
        .map((element) => element.outerHTML)
        .join("");
    }

    // Handle empty paragraphs
    if (isParagraphEmpty) {
      const lineBreakId = previousId ? spawnID(previousId, null) : "1:A";
      const lineBreakData = {
        id: lineBreakId,
        content: "&nbsp;", // Space for line break
        style: "display: block;",
      };
      charDataArray.push(lineBreakData);
      previousId = lineBreakId;
    } else {
      const newLineId = previousId ? spawnID(previousId, null) : "1:A";
      const newLineDiv = `<div id="${newLineId}" style="display: block;"></div>`;
      const newLineData = {
        id: newLineId,
        content: "",
        style: "display: block;",
      };
      charDataArray.push(newLineData);
      paragraphHtml += newLineDiv;
      previousId = newLineId;
    }

    htmlContent += paragraphHtml;
  }

  document.getElementById("content").innerHTML = htmlContent;

  return { htmlContent, charDataArray };
}

// Helper function to convert DOCX alignment values to CSS alignment
function convertAlignment(value) {
  const alignmentMap = {
    left: "left",
    right: "right",
    center: "center",
    justify: "justify",
  };
  return alignmentMap[value] || "left";
}

const exportToDocx = async () => {
  try {
    const contentElement = document.getElementById("content");
    const divElements = contentElement.querySelectorAll("div");

    const paragraphs = [];
    let textRuns = [];
    let previousTextAlign = "left"; // Store the alignment for inline elements
    let isFirstInlineElement = true; // Flag to track the first inline element

    divElements.forEach((element) => {
      const text = element.innerText.trim(); // Trim whitespace from text

      const isEmptyText = !text;
      const isBlockElement = element.style.display === "block";
      const elementAlignment = element.style.textAlign || "left";

      // If we encounter a block element, create a new paragraph and reset inline logic
      if (isBlockElement) {
        if (textRuns.length > 0) {
          // Create a new paragraph with the collected text runs and the previous alignment
          const paragraph = new Paragraph({
            children: textRuns,
            alignment: previousTextAlign,
          });
          paragraphs.push(paragraph);
          textRuns = []; // Reset text runs for the new paragraph
        }

        // Create an empty paragraph for line breaks if the block element has empty text
        if (isEmptyText) {
          paragraphs.push(new Paragraph({})); // Add an empty paragraph for the line break
        }

        // Update alignment for block elements and reset inline element tracking
        previousTextAlign = elementAlignment;
        isFirstInlineElement = true;
        return; // Skip to the next element
      }

      // Handle inline elements and keep them on the same line
      if (isFirstInlineElement) {
        previousTextAlign = elementAlignment; // Set the alignment for the first inline element
        isFirstInlineElement = false; // Subsequent inline elements will use this alignment
      }

      // Convert style properties to docx-compatible formats
      const isBold = element.style.fontWeight === "bold";
      const isItalic = element.style.fontStyle === "italic";
      const isUnderline = element.style.textDecoration === "underline";
      let color = element.style.color || "#000000";
      let bg = element.style.backgroundColor || "#FFFFFF";
      console.log(text, ": ", previousTextAlign);

      // Convert RGB colors to HEX if needed
      color = color.startsWith("rgb")
        ? rgbToHex(color)
        : color.replace("#", "").toUpperCase();
      bg = bg.startsWith("rgb")
        ? rgbToHex(bg)
        : bg.replace("#", "").toUpperCase();

      const textRun = new TextRun({
        text: text,
        bold: isBold,
        italics: isItalic,
        underline: isUnderline ? "single" : undefined,
        color: color,
        shading: {
          type: "CLEAR",
          color: "auto",
          fill: bg,
        },
      });

      textRuns.push(textRun);
    });

    // Add any remaining text runs as a final paragraph
    if (textRuns.length > 0) {
      const finalParagraph = new Paragraph({
        children: textRuns,
        alignment: previousTextAlign,
      });
      paragraphs.push(finalParagraph);
    }

    // Create the Word document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    // Generate and save the document as a .docx file
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "exported-document.docx");
  } catch (error) {
    console.error("Error exporting document:", error);
  }
};

const rgbToHex = (rgb) => {
  const result = rgb.match(/\d+/g);
  if (result) {
    return (
      (1 << 24) +
      (parseInt(result[0]) << 16) +
      (parseInt(result[1]) << 8) +
      parseInt(result[2])
    )
      .toString(16)
      .slice(1)
      .toUpperCase();
  }
  return rgb;
};

const props = defineProps(["id", "ownerIdDocument"]);

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

  let currentDiv = getCurrentDiv();
  if (currentDiv.id === "content") {
    currentDiv = contentDiv.value.querySelector("div");
  }
  let nextDiv = getNextDiv();
  // console.log("current Div ", currentDiv, " nextDiv ", nextDiv);

  let kiemTraCanLe = -1;
  if (currentDiv.id != "") {
    kiemTraCanLe = checkAligned(currentDiv.id);
  }

  if (event.key.length == 1) {
    if (currentDiv) {
      let leftMost;
      if (currentDiv.id == "") {
        // console.log("con trỏ ở id rỗng");
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
        // console.log("Con trỏ ở đầu content ", currentDiv.id);
        if (currentDiv.textContent == "" && currentDiv.id != "") {
          // console.log("gặp phím enter");
          if (nextDiv) {
            leftMost = findLeftMostInSameRow(nextDiv.id);
          }
        } else {
          const previousDiv = currentDiv.previousElementSibling;
          if (previousDiv.textContent == "" && previousDiv.id != "") {
            // console.log("gặp phím enter 2");
            nextDiv = currentDiv;
            currentDiv = previousDiv;
            if (nextDiv) {
              leftMost = findLeftMostInSameRow(nextDiv.id);
            }
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
      // console.log("Đã chèn thẻ <div> mới sau thẻ có id:", currentDiv.id);

      const range = document.createRange();
      const selection = window.getSelection();

      range.selectNodeContents(newDiv);

      range.collapse(false);

      selection.removeAllRanges();
      selection.addRange(range);

      // console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

      const divVuaTao = {
        id: newDiv.id,
        content: newDiv.textContent,
      };
      socket.emit("insert-one", JSON.stringify(divVuaTao));
      if (kiemTraCanLe != -1) {
        if (currentDiv.textContent != "") {
          handleAlignedInput(currentDiv, newDiv, kiemTraCanLe);
        } else {
          const marginLeftOld = leftMost.style.marginLeft;
          const checkAlignOld = leftMost.style.textAlign;
          let divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: leftMost.id,
            styles: {
              marginLeft: "",
              textAlign: "",
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
          divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: newDiv.id,
            styles: {
              marginLeft: marginLeftOld,
              textAlign: checkAlignOld,
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
          handleAlignedInput(newDiv, newDiv, kiemTraCanLe);
        }
      }
    } else {
      // console.log("khong co div trc");
    }
  } else {
    if (event.key == "Backspace") {
      if (currentDiv) {
        if (currentDiv.style.display == "block" && kiemTraCanLe != -1) {
          // console.log("không xóa enter khi có căn lề");
          return;
        }
        if (currentDiv.id == "") {
          const lastDiv = contentDiv.value.querySelector("div:last-of-type");
          if (lastDiv.id == "") {
            // console.log("không xóa id rỗng");
            return;
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type");
            if (lastDiv.id == "") {
              return;
            } else {
              currentDiv = lastDiv;
              nextDiv = null;
            }
          }
        }
        if (checkConTro(currentDiv)) {
          // console.log("Con trỏ ở đầu content ", currentDiv.id);
          if (currentDiv.textContent == "" && currentDiv.id != "") {
            // console.log("gặp phím enter");
          } else {
            const previousDiv = currentDiv.previousElementSibling;
            if (previousDiv.textContent == "" && previousDiv.id != "") {
              // console.log("gặp phím enter 2");
              nextDiv = currentDiv;
              currentDiv = previousDiv;
              if (currentDiv.style.display == "block" && kiemTraCanLe != -1) {
                // console.log("không xóa enter khi có căn lề");
                return;
              }
            } else {
              return;
            }
          }
        }

        const selection = window.getSelection();
        let checkXemDaSuaCanLeChua = false;
        if (currentDiv.previousSibling) {
          const previousDiv = currentDiv.previousSibling;
          // console.log("pre", previousDiv);

          const idCurrentDiv = currentDiv.id;
          if (
            kiemTraCanLe != -1 &&
            currentDiv.textContent != "" &&
            currentDiv.id != "" &&
            previousDiv.id != "" &&
            previousDiv.textContent != ""
          ) {
            handleAlignedInput(previousDiv, currentDiv, kiemTraCanLe, true);
            checkXemDaSuaCanLeChua = true;
          }
          if (
            kiemTraCanLe != -1 &&
            currentDiv.style.textAlign != "" &&
            nextDiv &&
            nextDiv.id != "" &&
            nextDiv.textContent != ""
          ) {
            if (checkXemDaSuaCanLeChua == false) {
              handleAlignedInput(currentDiv, currentDiv, kiemTraCanLe, true);
            }
            const marginLeftOld = currentDiv.style.marginLeft;
            const checkAlignOld = currentDiv.style.textAlign;
            const divStyle = {
              time: Date.now().toString(),
              pri: pri,
              id: nextDiv.id,
              styles: {
                marginLeft: marginLeftOld,
                textAlign: checkAlignOld,
              },
            };
            if (applyStyle(divStyle)) {
              socket.emit("update-style", JSON.stringify(divStyle));
            }
            currentDiv.remove();
          } else {
            currentDiv.remove();
          }

          const newRange = document.createRange();
          newRange.selectNodeContents(previousDiv);
          newRange.collapse(false);

          selection.removeAllRanges();
          selection.addRange(newRange);

          const charToDelete = {
            id: idCurrentDiv,
          };
          socket.emit("delete-one", JSON.stringify(charToDelete));
        } else {
          // console.log("không có div nằm trước currentDiv");
        }
      }
    } else if (event.key == "Enter") {
      if (currentDiv) {
        if (window.getComputedStyle(currentDiv).display === "block") {
          // console.log("không chèn thêm phím enter");
          return;
        }
        if (nextDiv && window.getComputedStyle(nextDiv).display === "block") {
          // console.log("không chèn thêm phím enter 2 ");
          return;
        }
        if (currentDiv.id == "") {
          // console.log("con trỏ ở id rỗng");
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
                // console.log("không chèn thêm phím enter");
                return;
              }
              if (
                nextDiv &&
                window.getComputedStyle(nextDiv).display === "block"
              ) {
                // console.log("không chèn thêm phím enter 2 ");
                return;
              }
            }
          }
        }

        if (checkConTro(currentDiv)) {
          // console.log("Con trỏ ở đầu content ", currentDiv.id);
          if (currentDiv.textContent == "" && currentDiv.id != "") {
            // console.log("gặp phím enter");
          } else {
            const previousDiv = currentDiv.previousElementSibling;
            if (previousDiv.textContent == "" && previousDiv.id != "") {
              // console.log("gặp phím enter 2");
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
        // console.log("Đã chèn thẻ <div> mới sau thẻ có id:", currentDiv.id);

        const range = document.createRange();
        const selection = window.getSelection();

        range.selectNodeContents(newDiv);

        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);

        // console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

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
        // console.log("khong co div trc");
      }
    } else if (event.key === "ArrowUp") {
      if (currentDiv) {
        if (currentDiv.id == "") {
          // console.log("con trỏ ở id rỗng");
          if (nextDiv) {
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type");
            if (lastDiv.id == "") {
              return;
            } else {
              // console.log("đã xử lý");
              currentDiv = lastDiv;
              nextDiv = null;
            }
          }
        }

        const divAbove = getDivAbove(currentDiv);
        if (!divAbove) {
          // console.log("không có div nằm trên");
          return;
        }
        const selection = window.getSelection();

        const newRange = document.createRange();
        newRange.selectNodeContents(divAbove);
        newRange.collapse(false);

        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // console.log("khong co div trc");
      }
    } else if (event.key === "ArrowDown") {
      if (currentDiv) {
        if (currentDiv.id == "") {
          // console.log("con trỏ ở id rỗng");
          if (nextDiv) {
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type");
            if (lastDiv.id == "") {
              return;
            } else {
              // console.log("đã xử lý");
              currentDiv = lastDiv;
              nextDiv = null;
            }
          }
        }

        const divBelow = getDivBelow(currentDiv);
        if (!divBelow) {
          // console.log("không có div nằm dưới");
          return;
        }
        const selection = window.getSelection();

        const newRange = document.createRange();
        newRange.selectNodeContents(divBelow);
        newRange.collapse(false);

        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // console.log("khong co div trc");
      }
    }

    if (nextDiv) {
      // console.log("Thẻ <div> phía sau có id:", nextDiv.id);
    } else {
      // console.log("Không có thẻ <div> nào phía sau.");
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

  // console.log("Thẻ mới đã được chèn:", newDiv);
}
function updateDetele(Kitu) {
  const divToDelete = document.getElementById(Kitu.id);

  const div = document.getElementById("content");

  if (document.activeElement === div) {
    // console.log("Div đang được focus");
  } else {
    // console.log("Div không được focus");
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
        // console.log("khong co selection");
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
        // console.log("khong co selection");
      }
    }
  } else {
    // console.log(`không tìm thấy div với id ${Kitu.id} để xóa`);
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
  const kiemTraCanLe = checkAligned(currentDiv.id);
  // console.log(kiemTraCanLe);
  let leftMost;
  if (currentDiv.textContent != "") {
    leftMost = findLeftMostInSameRow(currentDiv.id);
  } else {
    leftMost = findLeftMostInSameRow(currentDiv.nextElementSibling.id);
  }

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
  if (kiemTraCanLe != -1 && needUpdateStyle == false) {
    const marginLeftOld = leftMost.style.marginLeft;
    const checkAlignOld = leftMost.style.textAlign;
    let divStyle = {
      time: Date.now().toString(),
      pri: pri,
      id: leftMost.id,
      styles: {
        marginLeft: "",
        textAlign: "",
      },
    };
    if (applyStyle(divStyle)) {
      socket.emit("update-style", JSON.stringify(divStyle));
    }
    divStyle = {
      time: Date.now().toString(),
      pri: pri,
      id: newDiv.id,
      styles: {
        marginLeft: marginLeftOld,
        textAlign: checkAlignOld,
      },
    };
    if (applyStyle(divStyle)) {
      socket.emit("update-style", JSON.stringify(divStyle));
    }
    handleAlignedInput(newDiv, newDiv, kiemTraCanLe);
  }

  // console.log("Đã chèn thẻ <div> mới trước thẻ có id:", currentDiv.id);

  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(newDiv);

  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);

  // console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

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

  // console.log("Con trỏ đã được đặt vào thẻ <div> mới với id:", newDiv.id);

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
    // console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
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
    // console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
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
    // console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
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
    // console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
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
    // console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
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
    // console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
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
    // console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
  }
}

setInterval(() => {
  arrdivStyle = [];
}, 30000);

function controlPlusCHandling() {
  const selectedIds = getSelectedDivIds();
  getDivContentsByIds(selectedIds);
}

function controlPlusVHandling() {
  // console.log(arrContentForCtrlV);
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

  // console.log(lastDiv);

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
  let closestVerticalDistance = Infinity;
  let closestHorizontalDistance = Infinity;

  allDivs.forEach((div) => {
    if (
      div !== currentDiv &&
      div.id !== "" &&
      getComputedStyle(div).display !== "none"
    ) {
      const rect = div.getBoundingClientRect();

      if (rect.bottom <= currentRect.top) {
        const verticalDistance = currentRect.top - rect.bottom;
        const horizontalDistance = Math.abs(currentRect.left - rect.left);

        if (
          verticalDistance < closestVerticalDistance ||
          (verticalDistance === closestVerticalDistance &&
            horizontalDistance < closestHorizontalDistance)
        ) {
          closestVerticalDistance = verticalDistance;
          closestHorizontalDistance = horizontalDistance;
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
  let divBelow = null;
  let closestVerticalDistance = Infinity;
  let closestHorizontalDistance = Infinity;

  allDivs.forEach((div) => {
    if (
      div !== currentDiv &&
      div.id !== "" &&
      getComputedStyle(div).display !== "none"
    ) {
      const rect = div.getBoundingClientRect();

      if (rect.top >= currentRect.bottom) {
        const verticalDistance = rect.top - currentRect.bottom;
        const horizontalDistance = Math.abs(currentRect.left - rect.left);

        if (
          verticalDistance < closestVerticalDistance ||
          (verticalDistance === closestVerticalDistance &&
            horizontalDistance < closestHorizontalDistance)
        ) {
          closestVerticalDistance = verticalDistance;
          closestHorizontalDistance = horizontalDistance;
          divBelow = div;
        }
      }
    }
  });

  return divBelow;
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

function findLeftMostInSameRow(targetId) {
  const targetElement = document.getElementById(targetId);
  if (!targetElement) {
    // console.log(`Element with ID: ${targetId} not found.`);
    return null;
  }

  const targetRect = targetElement.getBoundingClientRect();
  const allDivs = document.querySelectorAll("div");
  let leftMostElement = targetElement;
  let minLeft = targetRect.left;

  allDivs.forEach((element) => {
    const rect = element.getBoundingClientRect();

    if (Math.abs(rect.top - targetRect.top) < 1) {
      if (rect.left < minLeft) {
        minLeft = rect.left;
        leftMostElement = element;
      }
    }
  });
  if (leftMostElement.style.display == "block") {
    return leftMostElement.nextElementSibling;
  }
  return leftMostElement;
}

function checkAligned(targetId) {
  const leftMostElement = findLeftMostInSameRow(targetId);

  if (!leftMostElement) {
    return null;
  }

  if (leftMostElement.style.textAlign == "right") {
    return 1;
  } else if (leftMostElement.style.textAlign == "center") {
    return 0;
  } else {
    return -1;
  }
}

function handleAlignedInput(currentDiv, insertedDiv, check, isDeleted = false) {
  if (check == -1) {
    return;
  }
  const leftMost = findLeftMostInSameRow(currentDiv.id);
  // console.log("lef most ", leftMost);
  let insertedDivWidth;
  let align;
  if (check == 1) {
    insertedDivWidth = insertedDiv.getBoundingClientRect().width;
    // console.log("xử lý căn lề phải");
    align = "right";
  } else if (check == 0) {
    insertedDivWidth = insertedDiv.getBoundingClientRect().width / 2;
    // console.log("xử lý căn lề giữa");
    align = "center";
  }

  if (isDeleted) {
    insertedDivWidth = -insertedDivWidth;
  }
  let marginLeftValue =
    parseFloat(leftMost.style.marginLeft) - insertedDivWidth;
  // console.log(parseFloat(leftMost.style.marginLeft), " and ", insertedDivWidth);
  if (marginLeftValue <= 0) {
    marginLeftValue = 0;
  }
  const divStyle = {
    time: Date.now().toString(),
    pri: pri,
    id: leftMost.id,
    styles: {
      marginLeft: marginLeftValue + "px",
      textAlign: align,
    },
  };
  if (applyStyle(divStyle)) {
    socket.emit("update-style", JSON.stringify(divStyle));
  }
}

function calculateMarginLeftForRightAlign(divId, haha = "") {
  const content = document.getElementById("content");
  const targetDiv = document.getElementById(divId) || haha;
  console.log("content: ", content);
  console.log("targetDiv: ", targetDiv);

  if (content && targetDiv) {
    const contentStyle = window.getComputedStyle(content);
    const paddingLeft = parseFloat(contentStyle.paddingLeft);
    const paddingRight = parseFloat(contentStyle.paddingRight);

    const contentWidth = content.getBoundingClientRect().width;
    const targetDivWidth = targetDiv.getBoundingClientRect().width;
    const targetRect = targetDiv.getBoundingClientRect();

    let totalWidthOfRightSiblings = 0;

    const allDivs = Array.from(document.querySelectorAll("#content > div"));

    const sameRowDivs = allDivs.filter((div) => {
      const rect = div.getBoundingClientRect();
      return Math.abs(rect.top - targetRect.top) < 1;
    });

    sameRowDivs.sort(
      (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left
    );

    let foundTarget = false;
    sameRowDivs.forEach((div) => {
      const rect = div.getBoundingClientRect();
      if (div === targetDiv) {
        foundTarget = true;
      } else if (foundTarget) {
        totalWidthOfRightSiblings += rect.width;
      }
    });
    totalWidthOfRightSiblings += 2;

    const marginLeft =
      contentWidth -
      paddingLeft -
      paddingRight -
      targetDivWidth -
      totalWidthOfRightSiblings;

    return marginLeft;
  } else {
    // console.log(`Không tìm thấy #content hoặc #${divId}`);
    return null;
  }
}

function calculateMarginLeftForCenterAlign(divId, haha = "") {
  return calculateMarginLeftForRightAlign(divId, haha) / 2;
}

onMounted(() => {
  socket.connect();
  socket.on("give-priority", (doUuTien) => {
    pri = doUuTien;
    // console.log(`độ ưu tiên là ${pri}`);
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
});

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div class="container">
    <div class="container mt-3">
      <div class="toolbar p-3 bg-light border rounded">
        <div class="d-flex justify-content-start align-items-center mb-3">
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
                <a class="dropdown-item" href="#" @click="changeFontSize('8pt')"
                  >Extra small</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  @click="changeFontSize('10pt')"
                  >Small</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  @click="changeFontSize('12pt')"
                  >Regular</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  @click="changeFontSize('14pt')"
                  >Medium</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  @click="changeFontSize('18pt')"
                  >Large</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  @click="changeFontSize('24pt')"
                  >Extra Large</a
                >
              </li>
              <li>
                <a
                  class="dropdown-item"
                  href="#"
                  @click="changeFontSize('32pt')"
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
              @input="handleColorChange"
              value="#000000"
              title="Choose text color"
              style="height: 22px; width: 24px"
            />
          </div>

          <div
            class="d-flex align-items-center border border-secondary px-2 py-1 rounded ms-2"
          >
            <label for="textColorPicker" class="me-2">Background</label>

            <input
              type="color"
              id="textColorPicker"
              class="form-control form-control-color"
              @input="handleBackGroundColorChange"
              value="#000000"
              title="Choose text color"
              style="height: 22px; width: 24px"
            />
          </div>
        </div>

        <div class="d-flex justify-content-start align-items-center">
          <button
            class="btn btn-outline-secondary me-1"
            @click="makeSelectedDivsBold"
          >
            <i class="fas fa-bold"></i>
          </button>
          <button
            class="btn btn-outline-secondary me-1"
            @click="makeSelectedDivsItalic"
          >
            <i class="fas fa-italic"></i>
          </button>
          <button
            class="btn btn-outline-secondary me-1"
            @click="makeSelectedDivsUnderLined"
          >
            <i class="fas fa-underline"></i>
          </button>
          <button
            class="btn btn-outline-secondary me-1"
            @click="makeSelectedDivsStrikethrough"
          >
            <i class="fas fa-strikethrough"></i>
          </button>
          <button
            class="btn btn-outline-secondary me-1"
            @click="makeSelectedDivsAlign('left')"
          >
            <i class="fas fa-align-left"></i>
          </button>
          <button
            class="btn btn-outline-secondary me-1"
            @click="makeSelectedDivsAlign('center')"
          >
            <i class="fas fa-align-center"></i>
          </button>
          <button
            class="btn btn-outline-secondary me-1"
            @click="makeSelectedDivsAlign('right')"
          >
            <i class="fas fa-align-right"></i>
          </button>
        </div>
      </div>

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
  /* width: 50%; */
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
