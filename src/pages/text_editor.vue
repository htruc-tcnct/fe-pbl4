<script setup>
//import của trực
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
  // Lấy file đầu tiên từ input
  const file = event.target.files[0];
  if (file) {
    const contentDiv = document.getElementById("content");

    // Xóa toàn bộ nội dung hiện tại và gửi sự kiện delete-one qua socket cho từng phần tử div
    const divElements = contentDiv.querySelectorAll("div");
    divElements.forEach((div) => {
      const charData = { id: div.id }; // Dữ liệu ký tự để xóa
      socket.emit("delete-one", JSON.stringify(charData)); // Gửi yêu cầu xóa qua socket
    });
    contentDiv.innerHTML = ""; // Làm sạch nội dung hiển thị

    const reader = new FileReader(); // Tạo FileReader để đọc file

    // Định nghĩa hành động khi file được đọc xong
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result; // Nhận dữ liệu file dưới dạng ArrayBuffer

      try {
        // Giải nén file .docx bằng PizZip
        const zip = new PizZip(arrayBuffer);

        // Tạo đối tượng Docxtemplater để xử lý nội dung
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true, // Cho phép lặp đoạn văn
          linebreaks: true, // Giữ nguyên xuống dòng
        });

        // Lấy nội dung XML từ file word/document.xml
        const xmlContent = zip.file("word/document.xml").asText();

        // Chuyển đổi nội dung XML sang HTML và danh sách dữ liệu ký tự
        const { htmlContent, charDataArray } = convertDocxXmlToHtml(xmlContent);

        // Hiển thị nội dung HTML đã chuyển đổi trong contentDiv
        contentDiv.innerHTML = htmlContent;

        // chèn thẻ id rỗng ở đầu
        // Tạo thẻ div mới
        const newDiv = document.createElement("div");

        // Gán id và nội dung cho thẻ div mới
        newDiv.id = ""; // Thay "newDivId" bằng id bạn muốn
        newDiv.textContent = ""; // Thay "Nội dung mới" bằng nội dung bạn muốn

        // Chèn thẻ div mới vào đầu của contentDiv
        contentDiv.insertBefore(newDiv, contentDiv.firstChild);

        // Tạo thẻ <br>
        const brElement = document.createElement("br");

        // Chèn thẻ <br> vào cuối contentDiv
        contentDiv.appendChild(brElement);

        // Gửi sự kiện insert-one và update-style cho từng ký tự qua socket
        charDataArray.forEach((charData) => {
          const characterToAvoid = "&nbsp;"; // Ký tự cần loại bỏ
          if (charData.content.includes(characterToAvoid)) {
            return; // Bỏ qua ký tự không cần xử lý
          }
          const styles = parseStyleString(charData.style); // Phân tích chuỗi style thành đối tượng
          charData.styles = styles; // Gán đối tượng style vào dữ liệu ký tự
          delete charData.style; // Xóa thuộc tính style gốc
          socket.emit("insert-one", JSON.stringify(charData)); // Gửi sự kiện insert ký tự
          socket.emit("update-style", JSON.stringify(charData)); // Gửi sự kiện update style
        });
      } catch (error) {
        console.error("Error reading DOCX file:", error); // Ghi log nếu có lỗi xảy ra
      }
      // căn lề sau khi đã import html vào content
      HandleAlignAfterOpenFile();
    };

    // Đọc file dưới dạng ArrayBuffer
    reader.readAsArrayBuffer(file);
  }

  // Khởi tạo các sự kiện lắng nghe socket nếu chưa được thiết lập
  if (!socketListenersInitialized) {
    socketListenersInitialized = true;

    // Lắng nghe sự kiện insert từ socket và cập nhật nội dung hiển thị
    socket.on("update-insert-one", (charToInsert) => {
      const kiTu = JSON.parse(charToInsert); // Phân tích dữ liệu ký tự
      const newDiv = document.createElement("div"); // Tạo một div mới để chứa ký tự
      newDiv.id = kiTu.id; // Gán id cho div
      newDiv.textContent = kiTu.content; // Đặt nội dung ký tự
      newDiv.style.cssText = kiTu.style; // Gán style cho div
      document.getElementById("content").appendChild(newDiv); // Thêm div vào contentDiv
    });

    // Lắng nghe sự kiện delete từ socket và xóa phần tử tương ứng
    socket.on("update-delete-one", (charToDelete) => {
      const kiTu = JSON.parse(charToDelete); // Phân tích dữ liệu ký tự cần xóa
      const elementToDelete = document.getElementById(kiTu.id); // Tìm phần tử cần xóa
      if (elementToDelete) {
        elementToDelete.remove(); // Xóa phần tử nếu tìm thấy
      }
    });
  }
};

// hàm này var với hàm đã có
function makeSelectedDivsAlign(input, haha = "") {
  // Lấy danh sách các ID của div được chọn. Nếu danh sách rỗng, sử dụng ID của `haha`.
  const selectedDivIds =
    getSelectedDivIds().length > 0 ? getSelectedDivIds() : [haha.id];

  let checkLeftmost; // Biến lưu giá trị leftMost đã xử lý trước đó để tránh xử lý trùng lặp.

  console.log("Selected Div IDs: ", selectedDivIds);

  // Xử lý căn giữa
  if (input === "center") {
    selectedDivIds.forEach((divId) => {
      // Tìm phần tử trái nhất (leftMost) trong cùng một hàng
      const leftMost = findLeftMostInSameRow(divId) || haha;

      console.log("Leftmost element for center alignment: ", leftMost);

      // Nếu phần tử trái nhất khác với lần xử lý trước
      if (checkLeftmost !== leftMost) {
        // Tính giá trị margin-left để căn giữa
        const marginLeftValue = calculateMarginLeftForCenterAlign(
          leftMost.id,
          haha
        );

        console.log(
          "Calculated margin-left for center alignment: ",
          marginLeftValue
        );

        // Tạo đối tượng phong cách cho phần tử
        const divStyle = {
          time: Date.now().toString(), // Dấu thời gian để đánh dấu thay đổi
          pri: pri, // Ưu tiên của thay đổi (có thể là biến toàn cục)
          id: leftMost.id, // ID của phần tử cần thay đổi
          styles: {
            marginLeft: marginLeftValue + "px", // Giá trị margin-left tính toán
            textAlign: "center", // Căn giữa
          },
        };

        // Áp dụng phong cách và gửi sự kiện socket nếu thành công
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }

        // Cập nhật biến kiểm tra leftMost
        checkLeftmost = leftMost;
      }
    });
    return; // Thoát khỏi hàm sau khi xử lý căn giữa
  }

  // Xử lý căn phải
  else if (input == "right") {
    selectedDivIds.forEach((divId) => {
      const leftMost = findLeftMostInSameRow(divId) || haha;

      // Chỉ xử lý nếu leftMost khác với lần trước
      if (checkLeftmost != leftMost) {
        // Tính giá trị margin-left để căn phải
        const marginLeftValue = calculateMarginLeftForRightAlign(
          leftMost.id,
          haha
        );

        // Tạo đối tượng phong cách cho căn phải
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: leftMost.id,
          styles: {
            marginLeft: marginLeftValue + "px",
            textAlign: "right", // Căn phải
          },
        };

        // Áp dụng phong cách và gửi sự kiện socket
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }

        // Cập nhật biến kiểm tra leftMost
        checkLeftmost = leftMost;
      }
    });
    return; // Thoát khỏi hàm sau khi xử lý căn phải
  }

  // Xử lý căn trái
  else if (input == "left") {
    selectedDivIds.forEach((divId) => {
      const leftMost = findLeftMostInSameRow(divId) || haha;

      // Chỉ xử lý nếu leftMost khác với lần trước
      if (checkLeftmost != leftMost) {
        // Căn trái đặt margin-left = 0 và loại bỏ textAlign
        const marginLeftValue = 0;
        const divStyle = {
          time: Date.now().toString(),
          pri: pri,
          id: leftMost.id,
          styles: {
            marginLeft: "", // Reset margin-left
            textAlign: "", // Reset text-align
          },
        };

        // Áp dụng phong cách và gửi sự kiện socket
        if (applyStyle(divStyle)) {
          socket.emit("update-style", JSON.stringify(divStyle));
        }

        // Cập nhật biến kiểm tra leftMost
        checkLeftmost = leftMost;
      }
    });
    return; // Thoát khỏi hàm sau khi xử lý căn trái
  }
}

//chuyển đổi nội dung XML từ tệp DOCX (cụ thể là word/document.xml) thành nội dung HTML,
//đồng thời tạo ra một danh sách dữ liệu (charDataArray) chứa thông tin chi tiết về từng ký tự,
// bao gồm id, content, và style

function convertDocxXmlToHtml(xmlContent) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

  // Lấy tất cả các đoạn văn trong tài liệu XML
  const paragraphs = xmlDoc.getElementsByTagName("w:p");
  let htmlContent = ""; // Chứa nội dung HTML
  let previousId = null; // Lưu ID của phần tử trước đó
  const charDataArray = []; // Lưu thông tin dữ liệu của từng ký tự

  // Duyệt qua từng đoạn văn
  for (const p of paragraphs) {
    let paragraphHtml = ""; // HTML của đoạn văn hiện tại
    const runs = p.getElementsByTagName("w:r"); // Các phần tử chứa ký tự
    let isParagraphEmpty = true; // Đánh dấu đoạn văn có rỗng hay không
    let paragraphAlignment = "left"; // Căn lề mặc định

    // Lấy thông tin căn lề từ thuộc tính đoạn văn
    const paragraphProperties = p.getElementsByTagName("w:pPr")[0];
    if (paragraphProperties) {
      const alignmentNode = paragraphProperties.getElementsByTagName("w:jc")[0];
      if (alignmentNode) {
        const alignmentValue = alignmentNode.getAttribute("w:val");
        if (alignmentValue) {
          paragraphAlignment = convertAlignment(alignmentValue); // Chuyển giá trị căn lề sang định dạng phù hợp
        }
      }
    }

    let charactersHtml = ""; // HTML của các ký tự trong đoạn văn

    // Duyệt qua từng phần tử chứa ký tự
    for (const r of runs) {
      const texts = r.getElementsByTagName("w:t"); // Lấy văn bản trong thẻ <w:t>

      // Duyệt qua từng thẻ <w:t> để lấy nội dung
      for (const t of texts) {
        let textContent = t.textContent || ""; // Lấy nội dung văn bản
        if (textContent.trim() !== "") {
          isParagraphEmpty = false; // Đánh dấu đoạn văn không rỗng
        }

        let styles = {}; // Lưu các kiểu dáng CSS

        // Xử lý màu chữ
        const colorNode = r.getElementsByTagName("w:color")[0];
        if (colorNode) {
          const colorValue = colorNode.getAttribute("w:val");
          if (colorValue && colorValue !== "auto") {
            styles["color"] = `#${colorValue}`;
          }
        }

        // Xử lý màu nền
        const bg = r.getElementsByTagName("w:shd")[0];
        if (bg) {
          const bgValue = bg.getAttribute("w:fill");
          if (bgValue && bgValue !== "auto") {
            styles["background-color"] = `#${bgValue}`;
          }
        }

        // Xử lý in đậm, nghiêng, và gạch chân
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

        // Tạo các phần tử div cho từng ký tự
        for (const char of textContent) {
          const charId = previousId ? spawnID(previousId, null) : `1:${pri}`;

          const styleString = Object.entries(styles)
            .map(([key, value]) => `${key}: ${value};`)
            .join(" ");

          const charDiv = `<div id="${charId}" style="${styleString}">${char}</div>`;

          const charData = {
            id: charId,
            content: char,
            style: styleString,
          };
          charDataArray.push(charData); // Thêm dữ liệu ký tự vào mảng

          charactersHtml += charDiv; // Thêm div ký tự vào HTML
          previousId = charId;
        }
      }
    }

    // Xử lý căn lề cho đoạn văn
    if (charactersHtml) {
      const parsedHtml = parser.parseFromString(charactersHtml, "text/html");
      const parsedElements = Array.from(parsedHtml.body.children);

      parsedElements.forEach((el, index) => {
        if (index === 0) {
          el.style.textAlign = paragraphAlignment;
        }
      });

      paragraphHtml += parsedElements
        .map((element) => element.outerHTML)
        .join("");
    }

    // Xử lý đoạn văn rỗng
    if (isParagraphEmpty) {
      const lineBreakId = previousId ? spawnID(previousId, null) : `1:${pri}`;
      charDataArray.push({
        id: lineBreakId,
        content: "&nbsp;",
        style: "display: block;",
      });
      previousId = lineBreakId;
    } else {
      const newLineId = previousId ? spawnID(previousId, null) : `1:${pri}`;
      paragraphHtml += `<div id="${newLineId}" style="display: block;"></div>`;
      charDataArray.push({
        id: newLineId,
        content: "",
        style: "display: block;",
      });
      previousId = newLineId;
    }

    htmlContent += paragraphHtml;
  }

  // Cập nhật nội dung HTML cho phần tử #content
  document.getElementById("content").innerHTML = htmlContent;

  return { htmlContent, charDataArray }; // Trả về HTML và dữ liệu ký tự
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

//xuất nội dung của một phần tử HTML (chứa các <div>) thành một tệp Word (.docx)
const exportToDocx = async () => {
  try {
    // Lấy phần tử HTML chứa nội dung cần xuất
    const contentElement = document.getElementById("content");
    const divElements = contentElement.querySelectorAll("div"); // Lấy tất cả các <div> bên trong

    const paragraphs = []; // Mảng lưu trữ các đoạn văn
    let textRuns = []; // Mảng lưu trữ các đoạn văn bản (TextRun) trong cùng một đoạn
    let previousTextAlign = "left"; // Căn lề mặc định
    let isFirstInlineElement = true; // Đánh dấu phần tử inline đầu tiên

    // Lặp qua từng phần tử <div>
    divElements.forEach((element) => {
      const text = element.innerText.trim(); // Lấy nội dung văn bản và loại bỏ khoảng trắng
      const isEmptyText = !text; // Kiểm tra xem phần tử có văn bản hay không
      const isBlockElement = element.style.display === "block"; // Kiểm tra kiểu hiển thị
      const elementAlignment = element.style.textAlign || "left"; // Căn lề của phần tử (mặc định là "left")

      // Nếu phần tử là block, tạo một đoạn văn mới
      if (isBlockElement) {
        if (textRuns.length > 0) {
          // Nếu có TextRun, tạo một đoạn văn với căn lề trước đó
          const paragraph = new Paragraph({
            children: textRuns,
            alignment: previousTextAlign,
          });
          paragraphs.push(paragraph); // Thêm đoạn văn vào mảng
          textRuns = []; // Reset TextRun cho đoạn mới
        }

        // Nếu phần tử block không có nội dung, thêm đoạn trống
        if (isEmptyText) {
          paragraphs.push(new Paragraph({})); // Đoạn trống để tạo dòng ngắt
        }

        // Cập nhật căn lề cho phần tử block và reset trạng thái inline
        previousTextAlign = elementAlignment;
        isFirstInlineElement = true;
        return; // Bỏ qua xử lý tiếp theo
      }

      // Xử lý các phần tử inline
      if (isFirstInlineElement) {
        previousTextAlign = elementAlignment; // Cập nhật căn lề
        isFirstInlineElement = false; // Không phải phần tử inline đầu tiên nữa
      }

      // Lấy kiểu dáng CSS và chuyển đổi thành thuộc tính phù hợp với Word
      const isBold = element.style.fontWeight === "bold";
      const isItalic = element.style.fontStyle === "italic";
      const isUnderline = element.style.textDecoration === "underline";
      let color = element.style.color || "#000000"; // Màu chữ mặc định là đen
      let bg = element.style.backgroundColor || "#FFFFFF"; // Màu nền mặc định là trắng

      console.log(text, ": ", previousTextAlign);

      // Chuyển đổi màu từ RGB sang HEX nếu cần
      color = color.startsWith("rgb")
        ? rgbToHex(color)
        : color.replace("#", "").toUpperCase();
      bg = bg.startsWith("rgb")
        ? rgbToHex(bg)
        : bg.replace("#", "").toUpperCase();

      // Tạo đối tượng TextRun với các thuộc tính
      const textRun = new TextRun({
        text: text, // Nội dung văn bản
        bold: isBold, // In đậm nếu có
        italics: isItalic, // In nghiêng nếu có
        underline: isUnderline ? "single" : undefined, // Gạch chân nếu có
        color: color, // Màu chữ
        shading: {
          type: "CLEAR",
          color: "auto",
          fill: bg, // Màu nền
        },
      });

      textRuns.push(textRun); // Thêm TextRun vào mảng
    });

    // Nếu còn TextRun chưa được xử lý, tạo đoạn văn cuối cùng
    if (textRuns.length > 0) {
      const finalParagraph = new Paragraph({
        children: textRuns,
        alignment: previousTextAlign,
      });
      paragraphs.push(finalParagraph); // Thêm đoạn văn cuối vào mảng
    }

    // Tạo tài liệu Word với các đoạn văn đã thu thập
    const doc = new Document({
      sections: [
        {
          properties: {}, // Các thuộc tính tài liệu
          children: paragraphs, // Danh sách các đoạn văn
        },
      ],
    });

    // Xuất tài liệu dưới dạng tệp .docx
    const blob = await Packer.toBlob(doc); // Tạo blob từ tài liệu
    saveAs(blob, "exported-document.docx"); // Lưu blob dưới dạng tệp với tên "exported-document.docx"
  } catch (error) {
    // Xử lý lỗi trong quá trình xuất tài liệu
    console.error("Error exporting document:", error);
  }
};

//chuyển đổi một chuỗi màu RGB (ví dụ: "rgb(255, 255, 255)") thành giá trị mã màu HEX (ví dụ: "#FFFFFF").
const rgbToHex = (rgb) => {
  // Sử dụng biểu thức chính quy để tìm tất cả các số trong chuỗi RGB
  const result = rgb.match(/\d+/g); // Kết quả là một mảng chứa các số (ví dụ: [255, 255, 255])

  if (result) {
    // Chuyển đổi từng giá trị R, G, B sang một số HEX duy nhất
    return (
      (1 << 24) + // Tạo một số đủ lớn để chứa các giá trị RGB
      (parseInt(result[0]) << 16) + // Dịch số R sang vị trí bit tương ứng (16 bit)
      (parseInt(result[1]) << 8) + // Dịch số G sang vị trí bit tương ứng (8 bit)
      parseInt(result[2])
    ) // Giữ nguyên số B ở vị trí cuối
      .toString(16) // Chuyển kết quả sang chuỗi hệ thập lục phân
      .slice(1) // Loại bỏ chữ số dư thừa ở đầu chuỗi
      .toUpperCase(); // Chuyển toàn bộ chuỗi sang chữ hoa
  }

  // Nếu chuỗi đầu vào không hợp lệ, trả về chính chuỗi RGB ban đầu
  return rgb;
};

const props = defineProps(["id", "ownerIdDocument"]);
let active = false;

const showCode = ref(null);
const contentDiv = ref(null);
var pri;
let arrContentForCtrlV = [];
let arrdivStyle = [];

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
  // không cần xử lý phím mũi tên trái phải
  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    (event.ctrlKey && event.key === "a")
  ) {
    return;
  }

  event.preventDefault(); // Tắt hành vi mặc định (gõ chữ vào div)

  if (event.ctrlKey && event.key === "c") {
    // Thực hiện hành động khi Ctrl + C được nhấn
    controlPlusCHandling();
    return;
  }
  if (event.ctrlKey && event.key === "x") {
    // Thực hiện hành động khi Ctrl + C được nhấn
    controlPlusCHandling();
    deleteMultiHandling(); //xóa các chữ được bôi đen;
    return;
  }
  if (isTextSelected() && (event.key.length == 1 || event.key == "Backspace")) {
    deleteMultiHandling(); //xóa các chữ được bôi đen;
    if (event.key == "Backspace") return; // bấm Backspace thì return không xóa thêm nữa
  }
  if (event.ctrlKey && event.key === "v") {
    // Thực hiện hành động khi Ctrl + v được nhấn
    controlPlusVHandling();
    return;
  }

  let currentDiv = getCurrentDiv();
  if (currentDiv.id === "content") {
    currentDiv = contentDiv.value.querySelector("div"); // Gán thẻ <div> đầu tiên nằm trong thẻ #content cho currentDiv
  }
  let nextDiv = getNextDiv();
  console.log("current Div ", currentDiv, " nextDiv ", nextDiv);
  // kiểm tra có căn lề không
  let kiemTraCanLe = -1;
  if (currentDiv.id != "") {
    kiemTraCanLe = checkAligned(currentDiv.id);
  }

  // Kiểm tra nếu phím vừa nhấn là ký tự có độ dài 1 và có currentDiv
  if (event.key.length == 1) {
    if (currentDiv) {
      let leftMost;
      if (currentDiv.id == "") {
        console.log("con trỏ ở id rỗng");
        if (nextDiv) {
          XuLyGoODauContent(nextDiv, event.key);
          return;
        } else {
          // trường hợp hy hữu khi click chuột
          const lastDiv = contentDiv.value.querySelector("div:last-of-type"); // Lấy thẻ <div> cuối cùng bên trong #content
          if (lastDiv.id == "") {
            XuLyGoKhiContentTrong(event.key);
            return;
          } else {
            currentDiv = lastDiv;
            nextDiv = null;
          }
        }
      }
      // xử lý gõ ở đầu dòng
      if (checkConTro(currentDiv)) {
        console.log("Con trỏ ở đầu content ", currentDiv.id);
        if (currentDiv.textContent == "" && currentDiv.id != "") {
          console.log("gặp phím enter");
          if (nextDiv) {
            leftMost = findLeftMostInSameRow(nextDiv.id);
          }
        } else {
          const previousDiv = currentDiv.previousElementSibling;
          if (previousDiv.textContent == "" && previousDiv.id != "") {
            console.log("gặp phím enter 2");
            nextDiv = currentDiv;
            currentDiv = previousDiv; //gán lại current div vào enter
            if (nextDiv) {
              leftMost = findLeftMostInSameRow(nextDiv.id);
            }
          } else {
            XuLyGoODauContent(currentDiv, event.key);
            return;
          }
        }
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
      console.log("khong co div trc");
    }
  } else {
    if (event.key == "Backspace") {
      if (currentDiv) {
        // không cho xóa enter khi có align
        if (currentDiv.style.display == "block" && kiemTraCanLe != -1) {
          console.log("không xóa enter khi có căn lề");
          return;
        }
        if (currentDiv.id == "") {
          const lastDiv = contentDiv.value.querySelector("div:last-of-type"); // Lấy thẻ <div> cuối cùng bên trong #content
          if (lastDiv.id == "") {
            console.log("không xóa id rỗng");
            return;
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type"); // Lấy thẻ <div> cuối cùng bên trong #content
            if (lastDiv.id == "") {
              // trường hợp hy hữu khi click chuột
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
              currentDiv = previousDiv; //gán lại current div vào enter để xóa
              if (currentDiv.style.display == "block" && kiemTraCanLe != -1) {
                console.log("không xóa enter khi có căn lề");
                return;
              }
            } else {
              return;
            }
          }
        }
        // if (hasDivInContent() == false) {
        //   console.log("không có gì để xóa");
        //   return;
        // }

        const selection = window.getSelection();
        let checkXemDaSuaCanLeChua = false;
        if (currentDiv.previousSibling) {
          const previousDiv = currentDiv.previousSibling;
          console.log("pre", previousDiv);
          // Xóa currentDiv
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
            const lastDiv = contentDiv.value.querySelector("div:last-of-type"); // Lấy thẻ <div> cuối cùng bên trong #content
            if (lastDiv.id == "") {
              // trường hợp hy hữu khi click chuột
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
        // xử lý gõ ở đầu dòng
        if (checkConTro(currentDiv)) {
          console.log("Con trỏ ở đầu content ", currentDiv.id);
          if (currentDiv.textContent == "" && currentDiv.id != "") {
            console.log("gặp phím enter");
          } else {
            const previousDiv = currentDiv.previousElementSibling;
            if (previousDiv.textContent == "" && previousDiv.id != "") {
              console.log("gặp phím enter 2");
              nextDiv = currentDiv;
              currentDiv = previousDiv; //gán lại current div vào enter
            } else {
              XuLyGoODauContent(currentDiv, event.key);
              return;
            }
          }
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

        newDiv.textContent = ""; //
        newDiv.style.display = "block";

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
        const divStyle = {
          id: newDiv.id, // The ID of the div to update
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
            // không cần xử lý
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type"); // Lấy thẻ <div> cuối cùng bên trong #content
            if (lastDiv.id == "") {
              // trường hợp hy hữu khi click chuột
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
        // Tạo một range mới để đặt con trỏ ở cuối divAbove
        const newRange = document.createRange();
        newRange.selectNodeContents(divAbove);
        newRange.collapse(false); // Đặt con trỏ ở cuối

        // Xóa các vùng chọn hiện tại và thêm vùng chọn mới
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
            // không cần xử lý
          } else {
            const lastDiv = contentDiv.value.querySelector("div:last-of-type"); // Lấy thẻ <div> cuối cùng bên trong #content
            if (lastDiv.id == "") {
              // trường hợp hy hữu khi click chuột
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
        // Tạo một range mới để đặt con trỏ ở cuối divBelow
        const newRange = document.createRange();
        newRange.selectNodeContents(divBelow);
        newRange.collapse(false); // Đặt con trỏ ở cuối

        // Xóa các vùng chọn hiện tại và thêm vùng chọn mới
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

function updateStyle(divNeedUpdateStyle) {
  // Tìm kiếm thẻ <div> theo ID
  const targetDiv = document.getElementById(divNeedUpdateStyle.id);

  // Kiểm tra xem thẻ có tồn tại hay không
  if (targetDiv) {
    // Cập nhật chỉ những style có trong divData
    for (const [styleKey, styleValue] of Object.entries(
      divNeedUpdateStyle.styles
    )) {
      targetDiv.style[styleKey] = styleValue; // Cập nhật style
    }
  } else {
    console.error(`Div with ID ${divNeedUpdateStyle.id} not found.`);
  }
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
  //kiểm tra căn lề
  const kiemTraCanLe = checkAligned(currentDiv.id);
  console.log(kiemTraCanLe);
  let leftMost;
  if (currentDiv.textContent != "") {
    leftMost = findLeftMostInSameRow(currentDiv.id);
  } else {
    leftMost = findLeftMostInSameRow(currentDiv.nextElementSibling.id);
  }

  var needUpdateStyle = false;
  // Tạo một thẻ <div> mới
  const newDiv = document.createElement("div");

  // gán ID cho div mới
  newDiv.id = spawnID(null, currentDiv.id);

  if (key == " ") {
    newDiv.textContent = "\u00A0"; // Hiển thị ký tự space không phá vỡ (tương đương &nbsp;)
  } else {
    if (key == "Enter") {
      newDiv.textContent = "";
      newDiv.style.display = "block";
      needUpdateStyle = true;
    } else {
      newDiv.textContent = key; // Nội dung là phím vừa nhấn
    }
  }
  // Chèn thẻ <div> mới trước thẻ currentDiv
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
  if (needUpdateStyle) {
    const divStyle = {
      id: newDiv.id, // The ID of the div to update
      styles: {
        display: "block",
      },
    };
    socket.emit("update-style", JSON.stringify(divStyle));
  }
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
  var needUpdateStyle = false;
  // Tạo một thẻ <div> mới
  const newDiv = document.createElement("div");

  // gán ID cho div mới
  newDiv.id = "1:" + pri;
  if (key == " ") {
    newDiv.textContent = "\u00A0"; // Hiển thị ký tự space không phá vỡ (tương đương &nbsp;)
  } else {
    if (key == "Enter") {
      newDiv.textContent = "";
      newDiv.style.display = "block";
      needUpdateStyle = true;
    } else {
      newDiv.textContent = key; // Nội dung là phím vừa nhấn
    }
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
  if (needUpdateStyle) {
    const divStyle = {
      id: newDiv.id, // The ID of the div to update
      styles: {
        display: "block",
      },
    };
    socket.emit("update-style", JSON.stringify(divStyle));
  }
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

// xử lý style
function getSelectedDivIds() {
  const content = document.getElementById("content");
  let selectedDivIds = [];

  if (window.getSelection) {
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      // Kiểm tra xem vùng chọn có nằm trong phần tử "content" hay không
      if (content.contains(range.commonAncestorContainer)) {
        // Lấy tất cả các thẻ div trong vùng chọn
        const selectedNodes = range.cloneContents().querySelectorAll("div");

        // Lọc và lấy id của các thẻ div có id trong vùng chọn
        selectedDivIds = Array.from(selectedNodes)
          .filter((node) => node.id) // Lọc các thẻ div có `id`
          .map((node) => node.id); // Lấy `id` của từng thẻ div
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

          // Di chuyển lên cấp cha cho đến khi gặp thẻ div có ID
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
        // Kiểm tra nếu fontWeight là "bold" thì xóa đi, nếu không thì thêm vào
        if (div.style.fontWeight === "bold") {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              fontWeight: "", // Đặt fontWeight rỗng để xóa
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
        // Kiểm tra nếu textDecoration là "underline" thì xóa đi, nếu không thì thêm vào
        if (div.style.textDecoration === "underline") {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "", // Đặt textDecoration rỗng để xóa
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
        // Kiểm tra nếu textDecoration là "line-through" thì xóa đi, nếu không thì thêm vào
        if (div.style.textDecoration === "line-through") {
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              textDecoration: "", // Đặt textDecoration rỗng để xóa
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
//     let checkLeftmost;
//     if (input == "center") {
//       selectedDivIds.forEach((divId) => {
//         const leftMost = findLeftMostInSameRow(divId);
//         if (checkLeftmost != leftMost) {
//           const marginLeftValue = calculateMarginLeftForCenterAlign(
//             leftMost.id
//           );
//           const divStyle = {
//             time: Date.now().toString(),
//             pri: pri,
//             id: leftMost.id,
//             styles: {
//               marginLeft: marginLeftValue + "px",
//               textAlign: "center",
//             },
//           };
//           if (applyStyle(divStyle)) {
//             socket.emit("update-style", JSON.stringify(divStyle));
//           }
//           checkLeftmost = leftMost;
//         }
//       });
//       return;
//     } else if (input == "right") {
//       selectedDivIds.forEach((divId) => {
//         const leftMost = findLeftMostInSameRow(divId);
//         if (checkLeftmost != leftMost) {
//           const marginLeftValue = calculateMarginLeftForRightAlign(leftMost.id);
//           const divStyle = {
//             time: Date.now().toString(),
//             pri: pri,
//             id: leftMost.id,
//             styles: {
//               marginLeft: marginLeftValue + "px",
//               textAlign: "right",
//             },
//           };
//           if (applyStyle(divStyle)) {
//             socket.emit("update-style", JSON.stringify(divStyle));
//           }
//           checkLeftmost = leftMost;
//         }
//       });
//       return;
//     } else if (input == "left") {
//       selectedDivIds.forEach((divId) => {
//         const leftMost = findLeftMostInSameRow(divId);
//         if (checkLeftmost != leftMost) {
//           const marginLeftValue = 0;
//           const divStyle = {
//             time: Date.now().toString(),
//             pri: pri,
//             id: leftMost.id,
//             styles: {
//               marginLeft: "",
//               textAlign: "",
//             },
//           };
//           if (applyStyle(divStyle)) {
//             socket.emit("update-style", JSON.stringify(divStyle));
//           }
//           checkLeftmost = leftMost;
//         }
//       });
//       return;
//     }
//   } else {
//     console.log("Không có thẻ <div> nào được bôi đen hoặc có id.");
//   }
// }

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

function makeSelectedDivsItalic() {
  const selectedDivIds = getSelectedDivIds();

  if (selectedDivIds.length > 0) {
    selectedDivIds.forEach((id) => {
      const div = document.getElementById(id);
      if (div) {
        // Kiểm tra nếu fontStyle là "italic" thì xóa đi, nếu không thì thêm vào
        if (div.style.fontStyle === "italic") {
          // Xóa fontStyle
          const divStyle = {
            time: Date.now().toString(),
            pri: pri,
            id: div.id,
            styles: {
              fontStyle: "", // Đặt fontStyle rỗng để xóa
            },
          };
          if (applyStyle(divStyle)) {
            socket.emit("update-style", JSON.stringify(divStyle));
          }
        } else {
          // Thêm fontStyle là "italic"
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

// Hàm xóa hết các phần tử trong mảng sau mỗi 30 giây
setInterval(() => {
  arrdivStyle = []; // Đặt lại mảng về rỗng
}, 30000);

// xử lý Ctrl C, Ctrl V

function controlPlusCHandling() {
  const selectedIds = getSelectedDivIds();
  getDivContentsByIds(selectedIds); // Gọi hàm và lưu kết quả vào arrContentForCtrlV
}

function controlPlusVHandling() {
  console.log(arrContentForCtrlV);
  simulateKeydownForArray();
}

function getDivContentsByIds(selectedIds) {
  arrContentForCtrlV.splice(0, arrContentForCtrlV.length); //làm trống mảng
  selectedIds.forEach((id) => {
    const div = document.getElementById(id); // Lấy thẻ <div> dựa vào id
    if (div) {
      arrContentForCtrlV.push(div.textContent); // Lấy nội dung của thẻ và thêm vào mảng arrContentForCtrlV
    }
  });

  return arrContentForCtrlV;
}

function simulateKeydownForArray() {
  const contentDiv = document.getElementById("content"); // Lấy thẻ div với id là "content"

  if (contentDiv) {
    arrContentForCtrlV.forEach((key) => {
      const keydownEvent = new KeyboardEvent("keydown", { key: key }); // Tạo sự kiện keydown với key là phần tử của mảng
      contentDiv.dispatchEvent(keydownEvent); // Gọi sự kiện keydown trên thẻ content
    });
  }
}

// xử lý gõ khi bôi đen nhiều chữ
function isTextSelected() {
  const selection = window.getSelection();
  const selectedText = selection.toString();

  if (selectedText.length > 0) {
    return true; // Đang bôi đen một từ hoặc đoạn văn bản
  } else {
    return false; // Chỉ đặt con trỏ chuột mà không có bôi đen
  }
}

function simulateKeydownBackSpaceForArray(count) {
  const contentDiv = document.getElementById("content"); // Lấy thẻ div với id là "content"

  if (contentDiv) {
    for (let i = 0; i < count; i++) {
      const keydownEvent = new KeyboardEvent("keydown", { key: "Backspace" }); // Tạo sự kiện keydown với key là backspace
      contentDiv.dispatchEvent(keydownEvent); // Gọi sự kiện keydown trên thẻ content
    }
  }
}
function deleteMultiHandling() {
  const selectedIds = getSelectedDivIds();
  const count = selectedIds.length;

  // Kiểm tra nếu selectedIds không rỗng
  const lastDiv =
    selectedIds.length > 0
      ? document.getElementById(selectedIds[selectedIds.length - 1])
      : null;

  console.log(lastDiv); // Kết quả là thẻ <div> cuối cùng trong danh sách hoặc null nếu không có

  const selection = window.getSelection();
  // Tạo một range mới để đặt con trỏ ở cuối lastDiv
  const newRange = document.createRange();
  newRange.selectNodeContents(lastDiv);
  newRange.collapse(false); // Đặt con trỏ ở cuối

  // Xóa các vùng chọn hiện tại và thêm vùng chọn mới
  selection.removeAllRanges();
  selection.addRange(newRange);
  simulateKeydownBackSpaceForArray(count);
}
// xử lý phím mũi tên
// lấy div nằm trên
function getDivAbove(currentDiv) {
  const currentRect = currentDiv.getBoundingClientRect(); // Lấy vị trí và kích thước của thẻ hiện tại
  const allDivs = document.querySelectorAll("#content div"); // Lấy tất cả các thẻ <div> trong vùng chứa
  let divAbove = null;
  let closestVerticalDistance = Infinity;
  let closestHorizontalDistance = Infinity;

  allDivs.forEach((div) => {
    if (
      div !== currentDiv &&
      div.id !== "" &&
      getComputedStyle(div).display !== "none"
    ) {
      // Bỏ qua thẻ hiện tại và thẻ bị ẩn
      const rect = div.getBoundingClientRect();

      // Kiểm tra nếu thẻ này nằm phía trên thẻ hiện tại
      if (rect.bottom <= currentRect.top) {
        const verticalDistance = currentRect.top - rect.bottom;
        const horizontalDistance = Math.abs(currentRect.left - rect.left);

        // Cập nhật thẻ gần nhất phía trên thẻ hiện tại
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

  return divAbove; // Trả về thẻ <div> nằm trên, hoặc null nếu không có
}

// lấy div nằm dưới
function getDivBelow(currentDiv) {
  const currentRect = currentDiv.getBoundingClientRect(); // Lấy vị trí và kích thước của thẻ hiện tại
  const allDivs = document.querySelectorAll("#content div"); // Lấy tất cả các thẻ <div> trong vùng chứa
  let divBelow = null;
  let closestVerticalDistance = Infinity;
  let closestHorizontalDistance = Infinity;

  allDivs.forEach((div) => {
    if (
      div !== currentDiv &&
      div.id !== "" &&
      getComputedStyle(div).display !== "none"
    ) {
      // Bỏ qua thẻ hiện tại và thẻ bị ẩn
      const rect = div.getBoundingClientRect();

      // Kiểm tra nếu thẻ này nằm phía dưới thẻ hiện tại
      if (rect.top >= currentRect.bottom) {
        const verticalDistance = rect.top - currentRect.bottom;
        const horizontalDistance = Math.abs(currentRect.left - rect.left);

        // Cập nhật thẻ gần nhất phía dưới thẻ hiện tại
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

  return divBelow; // Trả về thẻ <div> nằm dưới, hoặc null nếu không có
}

// xử lý xung đột style
function applyStyle(divStyle) {
  for (var i = 0; i < arrdivStyle.length; i++) {
    if (checkConflict(arrdivStyle[i], divStyle) == true) {
      // thời gian chỉnh của ai lớn hơn thì áp dụng
      if (Number(arrdivStyle[i].time) > Number(divStyle.time)) {
        return false;
      } else if (Number(arrdivStyle[i].time) < Number(divStyle.time)) {
        arrdivStyle[i] = divStyle;
        updateStyle(divStyle);
        return true;
      } else {
        // nếu thời gian chỉnh = nhau thì mới xét pri
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
  // không xung đột
  arrdivStyle.push(divStyle);
  updateStyle(divStyle);
  return true;
}
function checkConflict(element, divStyle) {
  if (element == null) {
    return false;
  }
  if (element.id.toString() !== divStyle.id.toString()) {
    //id của thẻ div khác nhau thì return false
    return false;
  } else if (
    // id của thẻ div giống nhau nhưng thay đổi style khác nhau(1 thằng chỉnh màu, 1 thằng chỉnh font) thì return false
    Object.keys(element.styles).toString() !==
    Object.keys(divStyle.styles).toString()
  ) {
    return false;
  } else {
    // chỉnh cùng 1 chữ(cùng id) và cùng 1 loại style thì return true báo có xung đột để check thời gian
    return true;
  }
}

// xử lý căn lề
// hàm trả về chiều rộng content
function getContentWidth() {
  const content = document.getElementById("content");
  if (content) {
    return content.getBoundingClientRect().width;
  }
  return 0; // Trả về 0 nếu phần tử không tồn tại
}

// lấy phần tử nằm ở đầu của 1 hàng
function findLeftMostInSameRow(targetId) {
  const targetElement = document.getElementById(targetId);
  if (!targetElement) {
    console.log(`Element with ID: ${targetId} not found.`);
    return null;
  }

  const targetRect = targetElement.getBoundingClientRect();
  const allDivs = document.querySelectorAll("div");
  let leftMostElement = targetElement;
  let minLeft = targetRect.left;

  allDivs.forEach((element) => {
    const rect = element.getBoundingClientRect();

    // Kiểm tra cùng hàng (cùng top) và tìm phần tử có left nhỏ nhất
    if (Math.abs(rect.top - targetRect.top) < 1) {
      // Cùng hàng với độ lệch nhỏ
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
// kiểm tra xem phần tử trái nhất ở cùng hàng có căn lề hay không
function checkAligned(targetId) {
  const leftMostElement = findLeftMostInSameRow(targetId);

  if (!leftMostElement) {
    console.log(
      `Không tìm thấy phần tử trái nhất ở cùng hàng với ${targetId}.`
    );
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
// xử lý căn lề khi gõ
function handleAlignedInput(currentDiv, insertedDiv, check, isDeleted = false) {
  if (check == -1) {
    return;
  }
  const leftMost = findLeftMostInSameRow(currentDiv.id);
  console.log("lef most ", leftMost);
  let insertedDivWidth;
  let align;
  if (check == 1) {
    insertedDivWidth = insertedDiv.getBoundingClientRect().width;
    console.log("xử lý căn lề phải");
    align = "right";
  } else if (check == 0) {
    insertedDivWidth = insertedDiv.getBoundingClientRect().width / 2;
    console.log("xử lý căn lề giữa");
    align = "center";
  }
  // nếu bấm backspace thì cộng thêm px chứ không trừ;
  if (isDeleted) {
    insertedDivWidth = -insertedDivWidth;
  }
  let marginLeftValue =
    parseFloat(leftMost.style.marginLeft) - insertedDivWidth;
  console.log(parseFloat(leftMost.style.marginLeft), " and ", insertedDivWidth);
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
//trả về số px để căn lề phải
function calculateMarginLeftForRightAlign(divId) {
  const content = document.getElementById("content");
  const targetDiv = document.getElementById(divId);

  if (content && targetDiv) {
    const contentStyle = window.getComputedStyle(content);
    const paddingLeft = parseFloat(contentStyle.paddingLeft);
    const paddingRight = parseFloat(contentStyle.paddingRight);

    const contentWidth = content.getBoundingClientRect().width;
    const targetDivWidth = targetDiv.getBoundingClientRect().width;
    const targetRect = targetDiv.getBoundingClientRect();

    let totalWidthOfRightSiblings = 0;

    // Lấy tất cả các phần tử div con trong #content
    const allDivs = Array.from(document.querySelectorAll("#content > div"));

    // Lọc các phần tử cùng hàng với targetDiv
    const sameRowDivs = allDivs.filter((div) => {
      const rect = div.getBoundingClientRect();
      return Math.abs(rect.top - targetRect.top) < 1;
    });

    // Sắp xếp các phần tử từ trái sang phải theo vị trí left
    sameRowDivs.sort(
      (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left
    );

    // Tính tổng chiều rộng của các phần tử bên phải của targetDiv
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

    // Tính toán margin-left để căn lề phải
    const marginLeft =
      contentWidth -
      paddingLeft -
      paddingRight -
      targetDivWidth -
      totalWidthOfRightSiblings;

    return marginLeft;
  } else {
    console.log(`Không tìm thấy #content hoặc #${divId}`);
    return null;
  }
}
//trả về số px để căn lề giữa
function calculateMarginLeftForCenterAlign(divId) {
  return calculateMarginLeftForRightAlign(divId) / 2;
}
// xử lý căn lề sau khi mở file
function HandleAlignAfterOpenFile() {
  // Lấy tất cả các thẻ <div> bên trong #content
  const divs = document.querySelectorAll("#content > div");
  // Lặp qua từng thẻ <div>
  divs.forEach((div) => {
    // Lấy giá trị text-align từ CSS của thẻ
    const textAlign = window.getComputedStyle(div).textAlign;
    // Kiểm tra nếu text-align khác "left"
    if (textAlign === "right") {
      const marginLeftValue = calculateMarginLeftForRightAlign(div.id);
      const divStyle = {
        time: Date.now().toString(),
        pri: pri,
        id: div.id,
        styles: {
          marginLeft: marginLeftValue + "px",
          textAlign: "right",
        },
      };
      if (applyStyle(divStyle)) {
        socket.emit("update-style", JSON.stringify(divStyle));
      }
    } else if (textAlign === "center") {
      const marginLeftValue = calculateMarginLeftForCenterAlign(div.id);
      const divStyle = {
        time: Date.now().toString(),
        pri: pri,
        id: div.id,
        styles: {
          marginLeft: marginLeftValue + "px",
          textAlign: "center",
        },
      };
      if (applyStyle(divStyle)) {
        socket.emit("update-style", JSON.stringify(divStyle));
      }
    }
  });
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
        <div id=""></div></div><div id="1:1">a</div><div id="2:2">b</div><div id="3:1">c</div><div id="4:2">d</div><br>
  `;
  ``;
});

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>
<template>
  <div class="container">
    <div class="container mt-3" style="width: 1092px">
      <div class="toolbar p-3 bg-light border rounded" style="width: 1092px">
        <div
          class="d-flex justify-content-start align-items-center mb-3 position-relative"
        >
          <img src="../assets/logo.png" alt="" style="width: 40px" />
          <input
            type="text"
            class="border border-success py-1 px-5 border-opacity-25 me-3 rounded"
            placeholder="Document Title"
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
          <div class="dropdown position-absolute top-0 end-0">
            <button
              class="btn btn-secondary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Share
            </button>
            <ul class="dropdown-menu dropdown-menu-dark">
              <li><a class="dropdown-item active" href="#">Coppy Id</a></li>
              <li><a class="dropdown-item" href="#">Email</a></li>
            </ul>
          </div>
          <!-- Color Picker -->
        </div>
        <hr />
        <div class="d-flex justify-content-start align-items-center">
          <!-- Toolbar buttons -->
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
              style="height: 22px; width: 24px"
            />
          </div>
        </div>
      </div>

      <div
        id="content"
        class="border mt-3 p-3 rounded"
        contenteditable="true"
        spellcheck="false"
        style="min-height: 200px; width: 1092px"
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
