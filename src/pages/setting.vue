<template>
  <form action="" @submit.prevent="onSubmit">
    <div v-if="visible === 'settingAccount'" class="modal-overlay">
      <div class="modal-content">
        <button @click="$emit('close')" class="btn-close">&times;</button>
        <h2>Settings</h2>
        <!-- Form chỉnh sửa thông tin -->
        <form @submit.prevent="onSubmit" class="text-start">
          <!-- Ảnh đại diện -->
          <div class="mb-3 text-center">
            <img
              :src="avatarUrl"
              class="rounded-circle mb-2"
              alt="Avatar"
              style="width: 80px; height: 80px"
            />
            <div>
              <label for="avatar" class="form-label">Change Avatar</label>
              <input
                type="file"
                class="form-control"
                id="avatar"
                @change="onFileChange"
              />
            </div>
          </div>
          <!-- Tên -->
          <div class="mb-3">
            <label for="name" class="form-label">Name</label>
            <input
              type="text"
              class="form-control"
              id="name"
              v-model="name"
              placeholder="Enter your name"
            />
          </div>
          <!-- Ngày sinh -->
          <div class="mb-3">
            <label for="dateOfBirth" class="form-label">Date of Birth</label>
            <input
              type="date"
              class="form-control"
              id="dateOfBirth"
              v-model="dateOfBirth"
            />
          </div>
          <!-- Email (không cho chỉnh sửa) -->
          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input
              type="email"
              class="form-control"
              id="email"
              :value="email"
              disabled
            />
          </div>
          <!-- Nút lưu -->
          <button type="submit" class="btn btn-primary w-100">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  </form>
</template>

<script>
import { ref, onMounted } from "vue";
import axios from "axios"; // Import axios để gọi API

export default {
  props: {
    visible: {
      type: String,
      required: true,
    },
  },
  setup() {
    const name = ref(""); // Tên người dùng
    const dateOfBirth = ref(""); // Ngày sinh người dùng
    const email = ref(""); // Email người dùng
    const avatarUrl = ref("../assets/logo.png"); // URL avatar

    // Hàm chuyển đổi ISO 8601 thành định dạng YYYY-MM-DD
    const formatDate = (isoString) => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // Hàm lấy dữ liệu người dùng từ API
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/user-info`,
          {
            withCredentials: true,
          }
        );
        console.log(">>>>>>>>>>>>>>>>>>>>: ", response.data);
        if (response.data) {
          name.value = response.data.name || "";
          dateOfBirth.value = formatDate(response.data.dateOfBirth || ""); // Giả sử API trả về 'dateOfBirth' dưới dạng chuỗi 'YYYY-MM-DD'
          email.value = response.data.email || "";
          avatarUrl.value =
            response.data.avatar ||
            "https://lh3.googleusercontent.com/a/ACg8ocKoDEyexWhhk5WyueZTOjq8_ZA0Z9-iUeytfG6WU2kCwKVS5BWwoA=s96-c-rg-br100";
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    // Hàm xử lý thay đổi ảnh đại diện
    const onFileChange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          avatarUrl.value = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    // Hàm gọi API cập nhật thông tin người dùng khi submit form
    const onSubmit = async () => {
      try {
        const updateData = {
          name: name.value,
          dateOfBirth: dateOfBirth.value,
          avatar: avatarUrl.value,
        };
        console.log("Sending update data:", updateData); // Log dữ liệu trước khi gửi
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/update-user`,
          updateData,
          {
            withCredentials: true,
          }
        );
        console.log("Update success:", response.data);
      } catch (error) {
        console.error("Error updating user info:", error);
        if (error.response) {
          console.error("Response error:", error.response.data);
        }
      }
    };

    onMounted(() => {
      fetchUserInfo();
    });

    return {
      name,
      dateOfBirth,
      email,
      avatarUrl,
      onFileChange,
      onSubmit,
    };
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5); /* Nền mờ */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Z-index cao để đè lên nội dung khác */
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  text-align: center;
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

.form-label {
  margin-bottom: 5px;
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 1;
}
</style>
