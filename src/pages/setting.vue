<template>
  <div v-if="visible === 'settingAccount'" class="modal-overlay">
    <div class="modal-content">
      <button @click="$emit('close')" class="btn-close">&times;</button>
      <h2>Settings</h2>
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
</template>

<script>
import { ref, onMounted } from "vue";
import axios from "axios";

export default {
  props: {
    visible: {
      type: String,
      required: true,
    },
  },
  setup() {
    const name = ref("");
    const dateOfBirth = ref("");
    const email = ref("");
    const avatarUrl = ref("../assets/logo.png");
    const idUser = localStorage.getItem("idUser");
    let file = null;
    const formatDate = (isoString) => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/user/${idUser}`,
          {
            withCredentials: true,
          }
        );
        if (response.data) {
          name.value = response.data.name || "";
          dateOfBirth.value = response.data.birthDate
            ? formatDate(response.data.birthDate)
            : "";
          avatarUrl.value = response.data.avatar
            ? `${
                import.meta.env.VITE_SERVER_URL
              }/${response.data.avatar.replace(/\\/g, "/")}`
            : "https://lh3.googleusercontent.com/a/default-avatar-url";
          email.value = response.data.email;
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    const onFileChange = (event) => {
      file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          avatarUrl.value = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    const onSubmit = async () => {
      try {
        const formData = new FormData();
        formData.append("name", name.value);
        formData.append("dateOfBirth", dateOfBirth.value);
        formData.append("avatar", file);
        formData.append("email", email.value);

        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/user/update-user`,
          formData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        const updatedData = response.data.updatedFields;
        name.value = updatedData.name || "";
        dateOfBirth.value = updatedData.dateOfBirth || "";
        avatarUrl.value = `${
          import.meta.env.VITE_SERVER_URL
        }/${updatedData.avatar.replace(/\\/g, "/")}`;
        alert("Update user info successfully!");
      } catch (error) {
        console.error("Error updating user info:", error);
        if (error.response) {
          alert(`Error: ${error.response.data.message}`);
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
