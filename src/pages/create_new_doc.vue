<template>
  <div v-if="visible === 'createNewDoc'" class="modal-overlay">
    <div class="modal-content">
      <button @click="$emit('close')" class="btn-close">&times;</button>

      <h5 class="modal-title">Create New Document</h5>
      <div class="form-group mb-3">
        <label for="documentName">Document Name:</label>
        <input
          type="text"
          id="documentName"
          v-model="documentName"
          class="form-control"
          placeholder="Enter document name..."
        />
      </div>
      <div class="position-relative">
        <button class="btn btn-primary w-100" @click="onSubmit">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, onMounted } from "vue";
import axios from "axios";

const props = defineProps({
  documentId: String,
  visible: String,
});

const emit = defineEmits(["close", "documentCreated"]);

const documentName = ref("");
const userName = ref("User");
const userId = ref("");
let ownerIdDocument = ref("");
// Fetch user information on mounted

const fetchUserInfo = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/user/${userId}`,
      {
        withCredentials: true,
      }
    );
    if (response.data) {
      userName.value = response.data.name || "";
      userId.value = response.data._id || "";
    }
  } catch (error) {
    if (error.response) {
      console.error("Error response:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
  }
};
onMounted(async () => {
  await fetchUserInfo();
});
const onSubmit = async () => {
  if (!documentName.value) {
    alert("Document name is required.");
    return;
  }

  try {
    ownerIdDocument = localStorage.getItem("idUser");
    // Tạo tài liệu mới với dữ liệu người dùng hiện tại
    const response = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/documents/`,
      {
        documentTitle: documentName.value,
        documentContent: "", // Nội dung ban đầu có thể là rỗng
        documentOwnerID: ownerIdDocument, // ID người dùng từ thông tin người dùng hiện tại
        isShared: false, // Mặc định không chia sẻ tài liệu ngay lập tức
        shareCode: Math.random().toString(36).substr(2, 9), // Tạo mã chia sẻ ngẫu nhiên
        accessLevel: "Restricted",
      },
      {
        withCredentials: true, // Gửi cookie cùng với yêu cầu
      }
    );

    const createdDocument = response.data.document;
    console.log("Document created successfully:", createdDocument);

    // Hiển thị thông báo thành công và phát sự kiện khi tài liệu được tạo
    alert("Document created successfully with permissions!");
    emit("documentCreated", createdDocument); // Phát sự kiện khi tài liệu được tạo
  } catch (error) {
    // Xử lý lỗi khi tạo tài liệu
    console.error("Error creating document:", error);

    if (error.response) {
      console.error("Response error:", error.response.data);
      alert(`Error when creating document: ${error.response.data.message}`);
    } else {
      alert("An unexpected error occurred while creating the document.");
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  text-align: left;
  position: relative;
}

.btn-close {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.access-role {
  font-size: 14px;
  color: #555;
}

.form-select {
  width: auto;
}
</style>
