<template>
  <form action="" @submit.prevent="onSubmit">
    <div
      v-if="currentModal === 'register'"
      class="modal-overlay"
      data-aos="flip-right"
    >
      <div
        class="modal-container"
        data-aos="flip-right"
        data-aos-easing="ease-out-cubic"
        data-aos-duration="1000"
      >
        <div class="modal-header">
          <button style="color: #000" class="close mb-5" @click="closeModal">
            &times;
          </button>
          <h2 class="modal-title text-center">Sign up</h2>
        </div>

        <div
          class="modal-body"
          data-aos="flip-right"
          data-aos-easing="ease-out-cubic"
          data-aos-duration="2000"
        >
          <div class="position-relative">
            <input
              type="email"
              class="form-control bg-light text-dark my-2"
              v-model="formData.email"
              placeholder="Enter your email"
            />
            <input
              type="text"
              class="form-control bg-light text-dark my-2"
              v-model="formData.name"
              placeholder="Enter your name"
            />

            <input
              type="password"
              class="form-control bg-light text-dark my-2"
              v-model="formData.password"
              placeholder="Enter your password"
            />
            <input
              type="password"
              class="form-control bg-light text-dark my-2"
              v-model="formData.confirmPassword"
              placeholder="Re-enter your password"
            />
            <input
              type="date"
              v-model="formData.dateOfBirth"
              class="form-control bg-light text-dark my-2"
            />
            <div v-if="errorMessage">
              <hr />
              <p>{{ errorMessage }}</p>
            </div>
            <div class="py-2 mt-5">
              <button
                class="btn btn-primary px-5 position-absolute bottom-0 end-0"
                type="submit"
              >
                Sign up
              </button>
            </div>
          </div>
          <div class="text-center">
            <p>
              Already have an account?
              <a href="#" @click="switchToRegister">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, reactive, ref } from "vue";
import AOS from "aos";
import "aos/dist/aos.css";
import axios from "axios";

// Manage form data
const formData = reactive({
  email: "",
  password: "",
  dateOfBirth: "",
  name: "",
});
const errorMessage = ref("");
const onSubmit = async () => {
  console.log("Form Data:", formData); // Log form data to kiểm tra giá trị form

  // Kiểm tra nếu password và confirmPassword không trùng khớp
  if (formData.password !== formData.confirmPassword) {
    errorMessage.value = "Passwords do not match";
    return;
  }

  // Kiểm tra nếu các trường bắt buộc không có giá trị
  if (
    !formData.email ||
    !formData.name ||
    !formData.password ||
    !formData.dateOfBirth
  ) {
    errorMessage.value = "Please fill all required fields";
    return;
  }

  try {
    const result = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/user/signup`,
      formData
    );
    console.log("Create new user success: ", result.data);

    errorMessage.value = "";
    alert("Created account successfully!");
    closeModal();
  } catch (err) {
    if (err.response) {
      errorMessage.value =
        err.response.data.message || "An error occurred during registration.";
    } else {
      errorMessage.value =
        "Unable to connect to the server. Please try again later.";
    }

    console.log(err.response || err.message);
  }
};

const props = defineProps({
  currentModal: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["close", "openModal"]);

const closeModal = () => {
  emit("close");
};

const switchToRegister = () => {
  emit("switchModal", "login");
};

onMounted(() => {
  AOS.init({
    duration: 1000,
    once: true, // Animation runs only once
  });
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7); /* Nền tối mờ */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* Modal container */
.modal-container {
  background-color: #fff; /* Nền trắng */
  padding: 20px 30px;
  border-radius: 10px;
  width: 400px;
  position: relative;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3); /* Đổ bóng mềm */
}

/* Close button */
.close {
  background: none;
  border: none;
  color: #000; /* Nút đóng màu đen */
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  position: absolute;
  top: 10px;
  right: 15px;
}

.close:hover {
  color: #555; /* Đổi màu khi hover */
}

/* Modal title */
.modal-title {
  font-size: 1.8rem;
  color: #000; /* Màu tiêu đề đen */
  margin-bottom: 20px;
}

/* Input styling */
.modal-body input {
  background-color: #f8f9fa; /* Màu nền xám nhạt */
  color: #000; /* Chữ đen */
  border: 1px solid #ddd; /* Viền xám nhạt */
  border-radius: 5px;
  padding: 10px;
  width: 100%;
  margin-bottom: 10px;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

.modal-body input:focus {
  outline: none;
  border-color: #000; /* Viền đen khi focus */
  background-color: #fff; /* Nền trắng */
}

/* Error message styling */
.modal-body p {
  color: #d9534f; /* Màu đỏ cho thông báo lỗi */
  font-size: 0.9rem;
  margin-top: 10px;
}

/* Button styling */
.btn-primary {
  background-color: #000; /* Nền đen */
  color: #fff; /* Chữ trắng */
  border: 1px solid #000; /* Viền đen */
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: bold;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.btn-primary:hover {
  background-color: #333; /* Nền xám đậm khi hover */
  color: #fff;
}

/* Link styling */
.forgot-password-link {
  color: #555; /* Màu xám nhạt */
  font-size: 0.9rem;
  transition: color 0.3s ease, text-decoration 0.3s ease;
}

.forgot-password-link:hover {
  text-decoration: underline;
  color: #000; /* Màu đen khi hover */
}

/* Additional spacing for the button container */
.modal-body .py-2 {
  text-align: right; /* Căn phải cho nút */
}

.modal-body .py-2 .btn {
  margin-top: 20px;
}

/* Animation styling (optional) */
[data-aos="flip-right"] {
  transform-origin: center;
}
</style>
