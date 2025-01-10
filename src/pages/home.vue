<template>
  <div class="container-fluid">
    <!-- Header Section -->
    <header
      class="d-flex justify-content-between align-items-center py-3 px-4 bg-dark text-white"
    >
      <div class="d-flex align-items-center">
        <img
          src="../assets/logohome.png"
          alt="Logo"
          class="img-responsive"
          style="max-width: 3em; margin: 0 auto"
        />
        <div class="logo fs-3 fw-bold ms-2">DOCSYNC</div>
      </div>

      <div
        class="input-group d-flex justify-content-start"
        style="max-width: 700px"
      >
        <input
          type="text"
          class="form-control rounded-start-pill border-0 shadow-sm px-5"
          placeholder="Find your document"
          v-model="searchKeyword"
        />
        <button
          class="input-group-text bg-secondary-subtle rounded-end-pill border-start-0 py-2"
          @click="handleSearch"
        >
          <button class="btn-search" @click="handleSearch">
            <i class="fas fa-search"></i>
          </button>
        </button>
      </div>

      <div class="d-flex align-items-center" style="max-height: 50px">
        <button
          class="btn dropdown-toggle btn-account"
          type="button"
          id="dropdownMenuButton"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <img
            :src="avatarUrl"
            class="rounded-circle custom-img-hover"
            alt="Avatar"
            style="width: 40px; height: 40px; margin-left: 140px"
          />
        </button>
        <ul
          class="dropdown-menu dropdown-menu-end shadow account-menu"
          aria-labelledby="dropdownMenuButton"
        >
          <!-- Header Section -->
          <li class="text-center p-3 account-header">
            <h6 class="fw-bold mb-0">{{ email }}</h6>
            <div class="position-relative">
              <img
                :src="avatarUrl"
                class="rounded-circle mb-2"
                alt="Avatar"
                style="width: 80px; height: 80px"
              />
            </div>
            <p class="text-muted mb-1">Hi, {{ name }}</p>
            <button
              @click="openSetting()"
              class="btn btn-outline-dark btn-sm mb-3 py-2"
            >
              Manage your Account
            </button>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <!-- Sign Out Section -->
          <li class="text-center">
            <button
              @click="handleLogout()"
              class="btn btn-dark text-white w-100 px-3 py-2"
            >
              <i class="fas fa-sign-out-alt me-2"></i>
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </header>
    <SettingModal :visible="currentModal" @close="closeModal" />

    <section class="join-section my-5 text-center custom-join-section">
      <div class="input-group mx-auto join-group custom-width">
        <input
          type="text"
          class="form-control join-code"
          placeholder="Enter a join code"
          v-model="joinCode"
        />
        <button class="btn-join join-button" @click="joinDocument">Join</button>
      </div>
      <p v-if="errorMessageJoin" class="text-danger mt-3">
        {{ errorMessageJoin }}
      </p>
    </section>
    <section class="assigned-activities">
      <div class="row">
        <div class="col-6 text-end">
          <h2 class="mb-4">Assigned Activities</h2>
        </div>
        <div class="col-6 text-start">
          <div class="dropdown custom-dropdown">
            <button
              class="btn dropdown-toggle custom-btn"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="true"
            >
              <i class="fas fa-plus"></i>
            </button>
            <ul class="dropdown-menu custom-dropdown-menu">
              <li @click="handleCreateNewDoc">
                <a class="dropdown-item custom-dropdown-item" href="#">New</a>
              </li>
              <li @click="handleOpenExistingFile">
                <a class="dropdown-item custom-dropdown-item" href="#"
                  >Open exist file</a
                >
              </li>
            </ul>
            <input
              type="file"
              id="fileInput"
              style="display: none"
              accept=".docx"
            />
          </div>
        </div>
      </div>

      <div
        class="activities-container d-flex flex-wrap gap-3 border rounded border-secondary mx-5 p-4"
      >
        <button
          v-for="(document, index) in filteredDocuments &&
          filteredDocuments.length > 0
            ? filteredDocuments
            : documents"
          :key="document._id"
          :class="['card activity-card p-3 text-white bg-dark btn-document']"
          style="width: 12rem; height: 5rem"
          @contextmenu.prevent="showContextMenu($event, document)"
          @click="goToTextEditor(document._id)"
          @mouseenter="handleMouseEnter(document)"
          @mouseleave="handleMouseLeave(document)"
        >
          <input
            type="text"
            v-model="document.documentTitle"
            :readonly="!document.isEditable"
            class="text-light bg-dark border-0 title text-center"
            :ref="(el) => (inputRefs[index] = el)"
            @blur="saveDocument(document)"
            @focus="$event.target.select()"
          />
        </button>
        <p v-if="documents.length === 0">No documents found</p>
      </div>

      <div
        v-if="contextMenuVisible"
        :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
        class="context-menu"
      >
        <ul class="position-relative">
          <li class="ms-4" @click="handleSettingShare(selectedDocument)">
            <i
              class="fa-solid fa-share position-absolute top-0 start-0 ms-2 mt-2"
            ></i>
            Setting Share
          </li>
          <li class="ms-4" @click="handleDelete(selectedDocument)">
            <i
              class="fa-regular fa-trash-can position-absolute top-50 start-0 translate-middle-y ms-2"
            ></i>
            Delete
          </li>
          <li class="ms-4" @click="toggleEdit(selectedDocument)">
            <i
              class="fa-solid fa-highlighter position-absolute bottom-0 start-0 mb-2 ms-2"
            ></i>
            Change Name
          </li>
        </ul>
      </div>
    </section>
    <settingShareModal
      v-if="idDocument && idDocument !== ''"
      :idDoc="idDocument"
      :visible="currentModal"
      @close="closeModal"
      @documentUpdated="handleDocumentUpdated"
    />
    <createDocModal
      :visible="currentModal"
      @close="closeModal"
      @documentCreated="handleDocumentCreated"
    />
    <openExistingFile
      :visible="currentModal"
      @close="closeModal"
      @documentCreated="handleDocumentCreated"
    />
  </div>
</template>
<script setup>
import { ref, onMounted, nextTick } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

import { useStore } from "vuex";
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
import SettingModal from "./setting.vue";
import settingShareModal from "./settingShare.vue";
import createDocModal from "./create_new_doc.vue";
import openExistingFile from "./openExistingFile.vue";
let ownerId = ref("");
let documents = ref([]);
let avatarUrl = ref("");
let email = ref("");
let name = ref("");
let idDocument = ref("");
const inputRefs = ref([]);
const router = useRouter();
const store = useStore();
let currentModal = ref("");
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
let selectedDocument = ref(null);
const errorMessageJoin = ref("");
const joinCode = ref("");
let ownerIdDocument = ref("");
const joinDocument = async () => {
  const trimmedJoinCode = joinCode.value.trim();
  if (!trimmedJoinCode) {
    errorMessageJoin.value = "Please enter a valid join code.";
    return;
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/documents/share/${trimmedJoinCode}`,
      {
        withCredentials: true,
      }
    );

    const { _id: documentID, documentOwnerID: ownerId } =
      response.data.document;

    localStorage.setItem("idOwn", ownerId);
    localStorage.setItem("documentId", documentID);
    ownerIdDocument.value = ownerId;

    router.push({
      path: `/documents/detail/${documentID}`,
      query: {
        ownerIdDocument: ownerId,
      },
    });
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          errorMessageJoin.value = "Document not found or not shared.";
          break;
        case 403:
          errorMessageJoin.value = "You do not have access to this document.";
          break;
        default:
          errorMessageJoin.value = "An error occurred. Please try again.";
      }
    } else {
      errorMessageJoin.value = "An error occurred. Please try again.";
    }

    if (import.meta.env.DEV) {
      console.error("API Error: ", error);
    }
  }
};
const handleMouseEnter = (document) => {
  localStorage.setItem("documentId", document._id);
  console.log("move enter ", document._id);
};
const handleMouseLeave = (document) => {
  console.log("move leave");
};
const openFile = () => {
  document.getElementById("fileInput").click();
};
const goToTextEditor = (documentId) => {
  const idOw = localStorage.getItem("idUser");
  const idUserAndIdDocument = {
    idOwner: idOw,
    idDoc: documentId,
  };
  localStorage.setItem("idOwn", idUserAndIdDocument.idOwner);
  localStorage.setItem("documentId", idUserAndIdDocument.idDoc);

  router.push({
    path: `/documents/detail/${documentId}?ownerIdDocument=${idOw.value}`,
    query: {
      ownerIdDocument: ownerIdDocument.value,
    },
  });
};
const openSetting = () => (currentModal.value = "settingAccount");
const handleSettingShare = async (document) => {
  if (!document._id) {
    console.error("Document _id is undefined or null:", document);
    return;
  }

  idDocument.value = document._id;
  router.push({ params: { idDoc: idDocument } });
  await nextTick();
  currentModal.value = "settingShare";
};
const handleCreateNewDoc = () => {
  currentModal.value = "createNewDoc";
};
const handleOpenExistingFile = () => {
  currentModal.value = "openExistingFile";
};

const handleDocumentCreated = (response) => {
  const newDocument = response.createdDocument || response;
  if (newDocument && newDocument.documentTitle) {
    documents.value.push(newDocument);
    currentModal.value = "";
    console.error("success: ", newDocument);
  } else {
    console.error("Invalid document structure:", newDocument);
  }
};
const handleDocumentUpdated = (response) => {
  const newDocument = response.updatedDocument || response;
  if (newDocument && newDocument.documentTitle) {
    currentModal.value = "";
    console.error("success: ", newDocument);
  } else {
    console.error("Invalid document structure:", newDocument);
  }
};

const closeModal = () => (currentModal.value = "");

const showContextMenu = (event, document) => {
  selectedDocument.value = document;
  contextMenuVisible.value = true;
  idDocument.value = document._id;
  contextMenuX.value = event.pageX;
  contextMenuY.value = event.pageY;
};

const hideContextMenu = () => {
  contextMenuVisible.value = false;
  selectedDocument.value = null;
};

const handleDelete = (document) => {
  axios
    .delete(`${import.meta.env.VITE_SERVER_URL}/documents/${document._id}`)
    .then((result) => {
      console.log("Delete successfull: ", result);
      documents.value = documents.value.filter(
        (doc) => doc._id !== document._id
      );
    })
    .catch((err) => {
      console.log(err.response);
    });
};
const toggleEdit = async (document) => {
  document.isEditable = !document.isEditable;
  contextMenuVisible.value = false; // Ẩn menu sau khi click

  // Đợi DOM cập nhật xong trước khi focus
  await nextTick();

  if (document.isEditable) {
    const index = documents.value.findIndex((doc) => doc._id === document._id);
    console.log(index);
    console.log(inputRefs.value[index]);
    if (inputRefs.value[index]) {
      inputRefs.value[index].focus(); // Focus vào input khi bật chế độ chỉnh sửa
    }
  }
};

const saveDocument = (document) => {
  document.isEditable = false;
  axios
    .put(`${import.meta.env.VITE_SERVER_URL}/documents/${document._id}`, {
      documentTitle: document.documentTitle,
      anotherField: document.anotherField,
    })
    .then((response) => {
      // console.log("Document saved successfully:", response.data);
    })
    .catch((error) => {
      console.error("Error saving document:", error);
    });
};

document.addEventListener("click", hideContextMenu);
const checkSessionStatus = async () => {
  try {
    const result = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/user/${ownerId}`,
      {
        withCredentials: true,
      }
    );
    if (result.data && result.data.name) {
      email.value = result.data.email;
      name.value = result.data.name;
      avatarUrl.value = result.data.avatar
        ? `${import.meta.env.VITE_SERVER_URL}/${result.data.avatar.replace(
            /\\/g,
            "/"
          )}`
        : "https://danviet.vn/loat-hinh-anh-dep-me-man-ve-dai-duong-bao-la-20221013095215296.htm";

      fetchDocuments();
    } else {
      // handleLogout();
    }
  } catch (err) {
    console.error("Error fetching user info or session invalid:", err);
    handleLogout();
  }
};
let searchKeyword = ref("");
let filteredDocuments = ref(null);
filteredDocuments.value = documents.value;
const handleSearch = () => {
  filteredDocuments.value = documents.value.filter((doc) =>
    doc.documentTitle.toLowerCase().includes(searchKeyword.value.toLowerCase())
  );
  console.log(searchKeyword.value);
};
const handleLogout = async () => {
  try {
    await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/user/logout`,
      {},
      {
        withCredentials: true,
      }
    );

    store.commit("setUser", null);
    localStorage.removeItem("idUser");
    localStorage.removeItem("documentId");
    localStorage.removeItem("idOwn");
    router.push("/");
  } catch (error) {
    console.error("Error logging out:", error);
    router.push("/");
  }
};
const fetchDocuments = async () => {
  console.log(ownerId);
  const result = await axios.get(
    `${import.meta.env.VITE_SERVER_URL}/documents/${ownerId}`,
    {
      withCredentials: true,
    }
  );

  if (result.data.documents) {
    documents.value = result.data.documents;
    ownerIdDocument.value = result.data.documents[0].documentOwnerID;
    console.log(result.data);
  } else {
    console.warn("No documents found for the user.");
  }
};

onMounted(async () => {
  ownerId = localStorage.getItem("idUser");
  await checkSessionStatus();
});
</script>
<style scoped>
.context-menu {
  position: absolute;
  background: #fff; /* Màu nền trắng */
  border: 1px solid #ddd; /* Viền xám nhạt */
  border-radius: 8px; /* Bo góc */
  padding: 8px 0;
  width: 200px; /* Chiều rộng menu */
  z-index: 1000;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15); /* Đổ bóng */
  animation: fadeIn 0.2s ease-in-out; /* Hiệu ứng mờ */
  cursor: pointer; /* Thay đổi con trỏ chuột thành chỉ mục */
}

.context-menu ul {
  list-style: none; /* Xóa ký hiệu trước các mục */
  padding: 0;
  margin: 0;
}

.context-menu li {
  display: flex;
  align-items: center; /* Căn giữa icon và text */
  padding: 10px 16px; /* Khoảng cách giữa các mục */
  font-size: 14px;
  color: #333; /* Màu chữ đen nhạt */
  cursor: pointer;
  transition: background-color 0.2s ease-in-out; /* Hiệu ứng hover */
}

.context-menu li:hover {
  background: #f8f9fa; /* Nền xám nhạt khi hover */
  color: #000; /* Màu chữ đen đậm */
}

.context-menu i {
  font-size: 16px; /* Kích thước biểu tượng */
  color: #666; /* Màu biểu tượng */
  transition: color 0.2s ease-in-out; /* Hiệu ứng hover cho biểu tượng */
}

.context-menu li:hover i {
  color: #000; /* Màu biểu tượng khi hover */
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.btn-search {
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #2386cd, #27a9e6);
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  cursor: pointer;
}

.btn-search:hover {
  background: linear-gradient(135deg, #076bb3, #27a9e6);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.btn-search i {
  color: white;
  font-size: 1.5rem;
}

/* Style mặc định của tài liệu */
.activities-container .activity-card {
  width: 200px;
  height: 100px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Style của tài liệu khi được chọn (chuột phải click) */
.document-selected {
  background-color: rgb(131, 131, 140) !important;
  border-color: rgb(255, 165, 0) !important;
  color: white !important;
}

.activity-title {
  font-size: 16px;
}
.dropdown-toggle::after {
  display: none !important;
}

ul li:last-child button:hover {
  font-weight: bold;
  color: rgb(189, 144, 144) !important;
  background-color: rgb(246, 245, 244);
}

.btn-document:hover,
input.text-light.bg-dark.border-0.title:hover {
  background-color: rgb(180, 180, 191) !important;
  color: rgb(20, 12, 1) !important;
}
.btn-document:hover input.text-light.bg-dark.border-0 {
  background-color: rgb(180, 180, 191) !important;
  color: rgb(20, 12, 1) !important;
}

/* Khi hover trực tiếp vào input */
input.text-light.bg-dark.border-0:hover {
  background-color: rgb(180, 180, 191) !important;
  color: rgb(20, 12, 1) !important;
}

.btn-account {
  background: transparent;
  border: none;
  padding: 0;
  outline: none;
  transition: box-shadow 0.2s ease;
}

.btn-account:hover {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

/* Dropdown Menu */
.account-menu {
  width: 320px;
  border-radius: 12px;
  background-color: #ffffff; /* Màu trắng */
  border: 1px solid #e6e6e6;
}

.account-menu .account-header {
  background-color: #f8f9fa; /* Màu nền header nhạt */
  border-bottom: 1px solid #e6e6e6;
}

.account-menu h6 {
  color: #333; /* Màu chữ tối */
}

.account-menu p {
  color: #666; /* Màu chữ phụ */
}

/* Nút Manage Account */
.btn-outline-dark {
  border: 1px solid #333;
  color: #333;
}

.btn-outline-dark:hover {
  background-color: #333;
  color: #fff;
}

/* Nút Sign Out */
.btn-dark {
  background-color: #333;
  color: #fff;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.btn-dark:hover {
  background-color: #000;
}

/* Divider */
.dropdown-divider {
  border-color: #e6e6e6;
}

/* Hiệu ứng bóng cho menu */
.account-menu {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Tăng kích thước icon trong nút */
.account-menu i {
  font-size: 1.25rem;
}

/* Section Join */
.join-section {
  background-color: #f8f9fa; /* Màu nền nhạt */
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: auto;
}

.join-section .join-group {
  display: flex;
  align-items: center;
  border: 1px solid #ddd; /* Viền nhạt */
  border-radius: 50px;
  overflow: hidden;
  background-color: #fff; /* Màu nền trắng */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Input Field */
.join-code {
  border: none;
  border-right: 1px solid #ddd; /* Viền giữa input và nút */
  padding: 15px 20px;
  font-size: 16px;
  border-radius: 0;
  flex: 1;
  outline: none;
  background: none;
}

.join-code:focus {
  box-shadow: none;
  outline: none;
}

/* Button Join */
.btn-join {
  background: linear-gradient(135deg, #2386cd, #27a9e6); /* Màu gradient */
  border: none;
  color: white;
  padding: 15px 20px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 0 50px 50px 0;
  transition: all 0.2s ease;
}

.btn-join:hover {
  background: linear-gradient(135deg, #076bb3, #2386cd);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Error Message */
.join-section .text-danger {
  font-size: 14px;
  font-style: italic;
}
/* Hiệu ứng hover trên toàn bộ button (ô văn bản) */
.btn-document {
  cursor: pointer; /* Con trỏ chỉ mục */
  transition: transform 0.2s ease, background-color 0.2s ease,
    border-color 0.2s ease; /* Thời gian và kiểu chuyển đổi */
}

.btn-document:hover {
  transform: scale(1.05); /* Tăng kích thước nhẹ khi hover */
  background-color: #333; /* Đổi nền thành màu đen đậm hơn */
  border-color: #555; /* Đổi màu viền */
}

/* Hiệu ứng hover và focus trên input (khung tên văn bản) */
.title {
  cursor: pointer; /* Con trỏ chỉ mục khi hover */
  transition: background-color 0.2s ease, border-color 0.2s ease,
    color 0.2s ease; /* Đồng bộ thời gian và kiểu chuyển đổi */
  background-color: transparent; /* Nền trong suốt */
}

.title:focus {
  cursor: text; /* Con trỏ nhập liệu khi focus */
  outline: none; /* Loại bỏ viền focus mặc định */
  background-color: #222; /* Nền đen nhạt khi focus */
  border-bottom: 2px solid #ccc; /* Viền dưới khi focus */
  color: #fff; /* Màu chữ trắng khi focus */
}

/* Đảm bảo toàn bộ phần input và button đồng bộ */
.btn-document:hover .title {
  background-color: #333; /* Đổi màu nền của input khi hover đồng bộ với button */
  color: #fff; /* Màu chữ */
}
.assigned-activities .dropdown-toggle {
  font-size: 18px; /* Kích thước biểu tượng vừa phải */
  width: 40px; /* Kích thước nút (chiều rộng) */
  height: 40px; /* Kích thước nút (chiều cao) */
  background-color: #000; /* Nền đen */
  color: #fff; /* Chữ trắng */
  border: none; /* Xóa viền mặc định */
  border-radius: 50%; /* Bo tròn nút */
  display: flex; /* Dùng Flexbox để căn giữa biểu tượng */
  align-items: center; /* Căn giữa dọc */
  justify-content: center; /* Căn giữa ngang */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Đổ bóng nhẹ */
  transition: transform 0.2s ease, background-color 0.2s ease; /* Hiệu ứng */
}

/* Hiệu ứng hover cho nút dấu + */
.assigned-activities .dropdown-toggle:hover {
  background-color: #333; /* Màu nền sáng hơn khi hover */
  transform: scale(1.1); /* Phóng to nhẹ khi hover */
}

.custom-width {
  width: 500px; /* Đảm bảo div co giãn theo màn hình */
}
.custom-join-section {
  max-width: 700px; /* Đặt chiều rộng tối đa */
  margin: auto;
}
.container-fluid {
  padding: 0;
}
.custom-img-hover {
  border: 3px solid transparent; /* Đường viền mặc định trong suốt */
  border-radius: 50%; /* Đảm bảo bo tròn nếu ảnh là hình tròn */
  transition: border-color 0.3s ease; /* Hiệu ứng chuyển màu viền mượt */
}

.custom-img-hover:hover {
  border-color: white; /* Đổi viền thành màu trắng khi hover */
}
/* Style cho nút dropdown */
.custom-btn {
  background-color: rgb(180, 180, 191) !important;
  color: rgb(37, 25, 8) !important;
  border: 1px solid rgb(150, 150, 160);
  border-radius: 8px;
  padding: 10px 15px;
  transition: all 0.3s ease;
}

.custom-btn:hover {
  background-color: rgb(20, 12, 1) !important;
  color: white !important;
}

/* Style cho dropdown-menu */
.custom-dropdown-menu {
  background-color: rgb(180, 180, 191) !important;
  border: 1px solid rgb(150, 150, 160);
  border-radius: 8px;
  margin-top: 10px;
  padding: 10px 0;
}

/* Style cho từng item */
.custom-dropdown-item {
  color: rgb(20, 12, 1) !important;
  padding: 10px 20px;
  transition: all 0.3s ease;
}

.custom-dropdown-item:hover {
  background-color: rgb(20, 12, 1);
  color: white !important;
  border-radius: 4px;
}

/* Tạo shadow nhẹ cho dropdown */
.custom-dropdown {
  position: relative;
}

.custom-dropdown-menu {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
