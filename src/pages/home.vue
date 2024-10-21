<template>
  <div class="container-fluid">
    <!-- Header Section -->
    <header
      class="d-flex justify-content-between align-items-center py-3 px-4 bg-dark text-white"
    >
      <div class="d-flex align-items-center">
        <img
          src="../assets/logo.png"
          alt="Logo"
          class="img-responsive"
          style="max-width: 2em; margin: 0 auto"
        />
        <div class="logo fs-3 fw-bold ms-2">DOCSYNC</div>
      </div>

      <div
        class="input-group d-flex justify-content-between"
        style="max-width: 600px"
      >
        <input
          type="text"
          class="form-control rounded-start-pill border-end-0"
          placeholder="Find your document"
          aria-label="Search"
        />
        <!-- Search Icon -->
        <button
          class="input-group-text bg-secondary-subtle rounded-end-pill border-start-0 py-2"
        >
          <i class="fas fa-search fs-5 text-muted"></i>
        </button>
      </div>

      <div class="d-flex align-items-center" style="max-height: 50px">
        <button
          class="btn btn-dark-subtle dropdown-toggle"
          type="button"
          id="dropdownMenuButton"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <img
            :src="avatarUrl"
            class="rounded-circle"
            alt="Avatar"
            style="width: 40px; height: 40px"
          />
        </button>
        <ul
          class="dropdown-menu dropdown-menu-end shadow"
          aria-labelledby="dropdownMenuButton"
          style="width: 300px; border-radius: 12px"
        >
          <li class="text-center p-3">
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
              class="btn btn-outline-primary btn-sm mb-3 py-2"
            >
              Manage your Account
            </button>
          </li>
          <li><hr class="dropdown-divider" /></li>
          <li class="text-center">
            <button
              class="btn btn-link text-dark d-flex justify-content-between w-100 px-3 py-2 align-items-center"
              style="font-size: 14px"
            ></button>
          </li>

          <li class="d-flex justify-content-end">
            <button
              @click="handleLogout()"
              class="btn btn-link text-dark d-flex align-items-end px-3 py-2 text-decoration-none"
              style="font-size: 14px"
            >
              <i class="fas fa-sign-out-alt me-2 fs-5"></i>
              <span class="fs-6 text-decoration-none fs-5"> Sign out</span>
            </button>
          </li>
        </ul>
      </div>
    </header>
    <SettingModal :visible="currentModal" @close="closeModal" />

    <section class="join-section my-5 text-center">
      <div class="input-group w-50 mx-auto">
        <input
          type="text"
          class="form-control join-code"
          placeholder="Enter a join code"
          v-model="joinCode"
        />
        <button class="btn btn-primary join-button" @click="joinDocument">
          Join
        </button>
      </div>
      <p v-if="errorMessageJoin" class="text-danger">
        {{ errorMessageJoin }}
      </p>
    </section>
    <section class="assigned-activities text-center">
      <h2 class="mb-4">
        Assigned Activities
        <button
          class="border-0 bg-light text-body-secondary"
          @click="handleCreateNewDoc()"
        >
          <i class="fas fa-folder-plus"></i>
        </button>
      </h2>

      <div
        class="activities-container d-flex flex-wrap gap-3 border rounded border-secondary mx-5 p-4"
      >
        <button
          v-for="(document, index) in documents"
          :key="document._id"
          :class="['card activity-card p-3 text-white bg-dark btn-document']"
          style="width: 12rem; height: 5rem"
          @contextmenu.prevent="showContextMenu($event, document)"
          @click="goToTextEditor(document._id)"
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
          <li @click="handleSettingShare(selectedDocument)">
            <i
              class="fa-solid fa-share position-absolute top-0 start-0 ms-2 mt-2"
            ></i>
            Setting Share
          </li>
          <li @click="handleDelete(selectedDocument)">
            <i
              class="fa-regular fa-trash-can position-absolute top-50 start-0 translate-middle-y ms-2"
            ></i>
            Delete
          </li>
          <li @click="toggleEdit(selectedDocument)">
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
  </div>
</template>
<script setup>
import { ref, onMounted, nextTick } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import SettingModal from "./setting.vue";
import settingShareModal from "./settingShare.vue";
import createDocModal from "./create_new_doc.vue";
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
const joinDocument = async () => {
  if (!joinCode.value) {
    errorMessageJoin.value = "Please enter a join code.";
    return;
  }
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/documents/share/${joinCode.value}`,
      {
        withCredentials: true, // Cho phép gửi cookie
      }
    );
    const documentID = response.data.document._id;
    router.push({
      path: `/documents/detail/${documentID}`,
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      errorMessageJoin.value = "Document not found or not shared.";
    } else if (error.response && error.response.status === 403) {
      errorMessageJoin.value = "You do not have access to this document.";
    } else {
      errorMessageJoin.value = "An error occurred. Please try again.";
    }
  }
};

const goToTextEditor = (documentId) => {
  // console.log(ownerIdDocument.value);

  router.push({
    path: `/documents/detail/${documentId}`,
    query: {
      // ownerIdDocument: ownerIdDocument.value,
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
      avatarUrl.value =
        result.data.avatar ||
        "https://lh3.googleusercontent.com/a/default-avatar";

      fetchDocuments();
    } else {
      // handleLogout();
    }
  } catch (err) {
    console.error("Error fetching user info or session invalid:", err);
    handleLogout();
  }
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
    router.push("/");
  } catch (error) {
    console.error("Error logging out:", error);
    router.push("/");
  }
};
const fetchDocuments = async () => {
  const result = await axios.get(
    `${import.meta.env.VITE_SERVER_URL}/documents/${ownerId}`,
    {
      withCredentials: true,
    }
  );

  if (result.data.documents) {
    documents.value = result.data.documents;
    // ownerIdDocument.value = result.data.documents[0].documentOwnerID;
  } else {
    console.warn("No documents found for the user.");
  }
};

onMounted(async () => {
  ownerId = localStorage.getItem("idUser");
  await checkSessionStatus();
  // localStorage.setItem("ownerIdDocument", ownerIdDocument.value);
});
</script>
<style scoped>
.context-menu {
  position: absolute;
  z-index: 1000;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 10px;
  width: 200px;
}

.context-menu ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.context-menu ul li {
  padding: 8px 12px;
  cursor: pointer;
}

.context-menu ul li:hover {
  background-color: #f1f1f1;
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
</style>
