<template>
  <div v-if="visible === 'settingShare'" class="modal-overlay">
    <div class="modal-content px-4" style="background-color: #f2f2f2">
      <button @click="$emit('close')" class="btn-close">&times;</button>
      <h5 class="modal-title">Share Settings</h5>

      <send-mail
        v-if="emailFormVisible"
        :id-doc="props.idDoc"
        :share-code="shareCode"
        @cancel="CancelSendEmail"
      />

      <div v-else>
        <div class="form-group mb-3">
          <button
            class="w-100 border border-secondary-subtle p-2"
            style="background-color: #f2f2f2"
            @click="showEmailForm"
          >
            Enter an email to share...
          </button>
        </div>

        <h6>People with access</h6>
        <div class="access-info mb-3">
          <div class="access-user d-flex align-items-center mb-2">
            <img :src="avatarUrl" class="avatar me-2" alt="Avatar" />
            <span>{{ userName }}</span>
            <span class="access-role ms-auto">Owner</span>
          </div>
        </div>

        <div class="general-access mb-3">
          <h5>General access</h5>
          <div class="access-option mb-1">
            <div class="row border-success p-1 border-opacity-10">
              <div class="col-9 d-flex align-items-center">
                <i
                  v-if="selectedAccess === 'Restricted'"
                  class="fas fa-lock text-secondary me-2"
                ></i>
                <i v-else class="fas fa-globe-asia text-secondary me-2"></i>
                <select
                  class="form-select border-0"
                  style="background-color: #f2f2f2"
                  v-model="selectedAccess"
                >
                  <option value="Restricted">Restricted</option>
                  <option value="Everyone">Everyone with the code</option>
                </select>
              </div>
              <div class="col-3" v-if="selectedAccess === 'Everyone'">
                <label
                  class="form-edit ms-2 border-0"
                  style="background-color: #f2f2f2"
                >
                  Edit
                </label>
              </div>
            </div>
            <p
              v-if="selectedAccess === 'Restricted'"
              class="text-muted ms-4"
              style="font-size: 12px"
            >
              Only people with access can open with the link.
            </p>
            <p v-else class="text-muted ms-4" style="font-size: 12px">
              Anyone on the internet with the link can access.
            </p>
          </div>
        </div>

        <div class="row">
          <div class="col-9">
            <button
              class="btn btn-outline-primary ms-3 rounded-pill"
              @click="copyLink"
            >
              Copy ID Room
            </button>
          </div>
          <div class="col-3">
            <button
              class="btn btn-primary rounded-pill fw-bold px-3"
              @click="onSubmit"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps, defineEmits, watch } from "vue";
import axios from "axios";
import SendMail from "./sendMail.vue"; // Import the SendMail component

const props = defineProps(["idDoc", "visible"]);
const emit = defineEmits(["close", "documentUpdated"]);
const idUser = localStorage.getItem("idUser");

// State variables
const avatarUrl = ref("");
const userName = ref("User");
const documentName = ref("");
const idDocument = ref("");
const shareCode = ref("");
const emailToShare = ref("");
const emailMessage = ref("");
const selectedAccess = ref("Restricted");
const selectedOption = ref("Viewer");
const emailFormVisible = ref(false);
watch(
  () => props.idDoc,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      console.log(`idDoc changed from ${oldId} to ${newId}`);
      await fetchDocumentInfo();
    }
  },
  { immediate: true } // Gọi ngay lập tức khi component được mounted
);
// API Calls
const fetchUserInfo = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/user/${idUser}`,
      { withCredentials: true }
    );
    if (response.data) {
      userName.value = response.data.name || "User";
      avatarUrl.value = response.data.avatar
        ? `${import.meta.env.VITE_SERVER_URL}/${response.data.avatar.replace(
            /\\/g,
            "/"
          )}`
        : "https://lh3.googleusercontent.com/a/default-avatar-url";
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
  }
};
const fetchDocumentInfo = async () => {
  try {
    if (!props.idDoc || props.idDoc === "") {
      console.error("Invalid idDoc:", props.idDoc);
      return;
    }
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/documents/detail/${props.idDoc}`,
      {
        withCredentials: true,
      }
    );
    if (response.data && response.data.document) {
      const doc = response.data.document;
      documentName.value = doc.documentTitle;
      idDocument.value = doc.shareCode;
      selectedAccess.value = doc.accessLevel;

      // console.log("Fetched document:", response.data.document);
      shareCode.value = response.data.document.shareCode;
      console.log("shareCode:", shareCode.value);
    } else {
      console.error("Invalid response structure:", response.data);
    }
  } catch (error) {
    console.error("Error fetching document info:", error);
  }
};

const copyLink = async () => {
  if (!idDocument.value) {
    alert("Share code is not available!");
    return;
  }
  try {
    await navigator.clipboard.writeText(idDocument.value);
    alert("Share Code copied to clipboard!");
    console.log("Copied to clipboard:", idDocument.value);
  } catch (err) {
    console.log("Error copying to clipboard:", err);
    // Sử dụng phương pháp sao chép thủ công nếu API clipboard không hoạt động
    const textArea = document.createElement("textarea");
    textArea.value = idDocument.value;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      alert("Share Code copied to clipboard!");
      console.log("Copied to clipboard:", idDocument.value);
    } catch (err) {
      console.log("Error copying to clipboard using execCommand:", err);
      alert("Failed to copy share code.");
    }
    document.body.removeChild(textArea);
  }
};
const onSubmit = async () => {
  if (!props.idDoc || props.idDoc === "") {
    console.error("Invalid idDoc:", props.idDoc);
    return;
  }

  try {
    const accessLevel =
      selectedAccess.value === "Everyone"
        ? selectedOption.value
        : selectedAccess.value;

    const response = await axios.put(
      `${import.meta.env.VITE_SERVER_URL}/documents/${props.idDoc}`,
      {
        accessLevel, // Gán giá trị accessLevel từ trạng thái
      }
    );

    console.log("Update success:", response.data);
    alert("Document updated successfully!");
    emit("documentUpdated", response.data);
  } catch (error) {
    console.error("Error updating document:", error);
  }
};

const showEmailForm = () => {
  emailFormVisible.value = true;
};
const CancelSendEmail = () => {
  emailFormVisible.value = false;
};

// Lifecycle
onMounted(async () => {
  await fetchUserInfo();
  await fetchDocumentInfo();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7); /* Màu nền tối hơn */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff; /* Màu trắng làm nền chính */
  padding: 25px;
  border-radius: 10px;
  width: 500px;
  max-width: 90%;
  text-align: left;
  position: relative;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.btn-close {
  position: absolute;
  top: 15px;
  right: 15px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #333; /* Màu đen nhạt */
  cursor: pointer;
}

.btn-close:hover {
  color: #000; /* Màu đen đậm khi hover */
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #000; /* Tiêu đề đen đậm */
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #000; /* Viền đen đậm cho avatar */
}

.access-role {
  font-size: 14px;
  color: #777; /* Màu xám cho vai trò */
}

.form-group input,
textarea {
  border: 1px solid #ddd; /* Viền xám nhạt */
  border-radius: 5px;
  padding: 10px;
  font-size: 14px;
  color: #333; /* Màu đen nhạt cho chữ */
}

textarea {
  resize: none; /* Tắt resize của textarea */
}

textarea:focus,
input:focus {
  outline: none;
  border: 1px solid #333; /* Đổi viền sang đen khi focus */
}

button {
  border-radius: 5px;
  font-size: 14px;
  font-weight: bold;
}

.btn-primary {
  background-color: #000; /* Nút đen */
  color: #fff; /* Chữ trắng */
  border: 1px solid #000;
}

.btn-primary:hover {
  background-color: #333; /* Nút đen nhạt hơn khi hover */
}

.btn-light {
  background-color: #f2f2f2; /* Màu xám nhạt */
  color: #333; /* Màu chữ đen nhạt */
  border: 1px solid #ddd;
}

.btn-light:hover {
  background-color: #e0e0e0; /* Xám đậm hơn khi hover */
}

.access-info .access-user {
  border-bottom: 1px solid #ddd; /* Viền xám nhạt giữa các user */
  padding: 8px 0;
}

.general-access h5 {
  color: #333; /* Màu tiêu đề đen nhạt */
  font-size: 16px;
}

.access-option {
  background-color: #fafafa; /* Nền xám rất nhạt */
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

p.text-muted {
  font-size: 12px;
  color: #666; /* Màu xám cho đoạn text nhỏ */
}

button.btn-outline-primary {
  color: #000; /* Nút đen viền trắng */
  border: 1px solid #000;
  background-color: transparent;
}

button.btn-outline-primary:hover {
  background-color: #000; /* Nền đen khi hover */
  color: #fff; /* Chữ trắng khi hover */
}

button.rounded-pill {
  border-radius: 50px; /* Nút bo tròn */
  padding: 8px 16px;
}
.form-edit {
  background-color: #f2f2f2;
  border: 1px solid #ddd;
  border-radius: 4px; /* Làm tròn góc cho phần tử */
  padding: 8px 12px; /* Thêm padding để các phần tử không bị dính vào nhau */
  font-size: 16px; /* Đảm bảo font nhìn rõ và dễ đọc */
  transition: all 0.3s ease; /* Thêm hiệu ứng chuyển đổi mượt mà */
}
</style>
