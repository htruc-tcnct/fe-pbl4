<template>
  <div v-if="visible === 'openExistingFile'" class="modal-overlay">
    <div class="modal-content">
      <button @click="$emit('close')" class="btn-close">&times;</button>

      <h5 class="modal-title">Create New Document</h5>

      <!-- Nhập tên tài liệu -->
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

      <!-- Chọn file -->
      <div class="form-group mb-3">
        <label for="fileInput">Choose File:</label>
        <input
          type="file"
          id="fileInput"
          ref="fileInput"
          class="form-control"
          @change="handleFileSelection"
          accept=".docx,.txt"
        />
      </div>

      <!-- Submit -->
      <div class="position-relative">
        <button class="btn custom-btn w-100" @click="onSubmit">Create</button>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const props = defineProps({
  visible: Boolean, // Hiển thị modal
});

const emit = defineEmits(["close", "documentCreated"]); // Sự kiện đóng và tạo tài liệu

const router = useRouter();
const documentName = ref("");
const selectedFile = ref(null);

// Xử lý chọn file
const handleFileSelection = (event) => {
  selectedFile.value = event.target.files[0]; // Lưu file đã chọn
  console.log("Selected file:", selectedFile.value);
};

// Hàm tạo hoặc mở tài liệu
const onSubmit = async () => {
  if (!documentName.value) {
    alert("Document name is required.");
    return;
  }

  try {
    const formData = new FormData(); // Dùng FormData để gửi file
    formData.append("documentTitle", documentName.value);

    if (selectedFile.value) {
      formData.append("file", selectedFile.value);
    }

    // Lấy ID người dùng
    const ownerIdDocument = localStorage.getItem("idUser");
    formData.append("documentOwnerID", ownerIdDocument);

    // Gửi yêu cầu tạo tài liệu qua API
    const response = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/documents/`,
      formData,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const createdDocument = response.data.document;
    console.log("Document created successfully:", createdDocument);

    emit("documentCreated", createdDocument); // Phát sự kiện khi tài liệu được tạo
    emit("close"); // Đóng modal
  } catch (error) {
    console.error("Error creating document:", error);
    alert("An error occurred while creating the document.");
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

.form-control {
  margin-bottom: 15px;
}
.custom-btn {
  background-color: rgb(20, 12, 1); /* Màu nền chủ đạo */
  color: rgb(255, 255, 255); /* Màu chữ tương phản */
  border: 1px solid rgb(20, 12, 1); /* Viền nhẹ cùng tông */
  border-radius: 8px; /* Bo tròn góc */
  padding: 12px 20px; /* Khoảng cách bên trong */
  font-size: 16px; /* Cỡ chữ */
  font-weight: 600; /* Chữ đậm */
  text-align: center; /* Canh giữa chữ */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Đổ bóng nhẹ */
  transition: all 0.3s ease; /* Hiệu ứng mượt */
}

.custom-btn:hover {
  background-color: rgb(160, 160, 170); /* Màu nền tối hơn khi hover */
  color: white; /* Chữ đổi thành màu trắng khi hover */
  border-color: rgb(140, 140, 150); /* Viền tối hơn khi hover */
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.2); /* Đổ bóng sâu hơn */
  transform: translateY(-2px); /* Nút nổi lên khi hover */
}

.custom-btn:active {
  background-color: rgb(140, 140, 150); /* Màu nền đậm hơn khi click */
  color: white; /* Chữ giữ nguyên màu trắng */
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.2); /* Đổ bóng nhỏ hơn */
  transform: translateY(1px); /* Nút nhấn xuống */
}
</style>
