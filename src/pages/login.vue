<template>
  <form @submit.prevent="onSubmit">
    <div
      v-if="currentModal === 'login'"
      class="modal-overlay"
      data-aos="flip-left"
    >
      <div
        class="modal-container"
        data-aos="flip-left"
        data-aos-easing="ease-out-cubic"
        data-aos-duration="1000"
      >
        <div class="modal-header">
          <button style="color: #000" class="close" @click="closeModal">
            &times;
          </button>
          <h2 class="modal-title text-center">Sign in</h2>
        </div>

        <div class="modal-body">
          <div class="position-relative">
            <input
              type="email"
              class="form-control bg-light text-dark my-2"
              placeholder="Enter your email"
              v-model="formData.email"
              autocomplete="email"
            />
            <div class="input-group my-2">
              <input
                :type="showPassword ? 'text' : 'password'"
                class="form-control bg-light text-dark"
                v-model="formData.password"
                placeholder="Enter your password"
                autocomplete="current-password"
              />
              <span
                class="password-toggle-icon"
                @click="showPassword = !showPassword"
              >
                <i
                  :class="
                    showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'
                  "
                ></i>
              </span>
            </div>

            <!-- Display error message if any -->
            <div v-if="errorMessage" class="error-message">
              <p>{{ errorMessage }}</p>
            </div>

            <div class="py-3">
              <button
                type="submit"
                class="btn btn-primary px-5 d-block mx-auto"
              >
                Login
              </button>
            </div>
          </div>

          <div class="text-center mt-3">
            <a
              href="#"
              class="text-decoration-none forgot-password-link"
              @click.prevent="goToForgotPassword"
              >Forgot password?</a
            >
          </div>

          <div class="text-center mt-3">
            <p>
              Don't have an account?
              <a href="#" @click="switchToRegister">Sign up</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>
<script setup>
import { defineProps, defineEmits, ref, reactive, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { useStore } from "vuex"; // Use Vuex store
import AOS from "aos";
import "aos/dist/aos.css";

const showPassword = ref(false);
const errorMessage = ref("");
const router = useRouter();
const store = useStore(); // Use Vuex store

const props = defineProps({
  currentModal: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["close", "switchModal"]);

const closeModal = () => {
  emit("close");
};
const switchToRegister = () => {
  emit("switchModal", "register");
};

const formData = reactive({
  email: "",
  password: "",
});
const onSubmit = async () => {
  try {
    const result = await axios.post(
      // "http://localhost:8000/user/login",
      `${import.meta.env.VITE_SERVER_URL}/user/login`,
      formData,
      {
        withCredentials: true,
      }
    );
    const user = result.data.user;
    store.commit("setUser", user);
    localStorage.setItem("idUser", user.id);
    errorMessage.value = "";
    router.push("/home");
  } catch (err) {
    console.error("Login Error:", err);
    if (err.response) {
      errorMessage.value =
        err.response.data.message || "An error occurred during login.";
      console.log("Response data:", err.response.data);
      console.log("Response status:", err.response.status);
      console.log("Response headers:", err.response.headers);
    } else if (err.request) {
      console.log("Request:", err.request);
    } else {
      console.log("Error message:", err.message);
    }
  }
};

const loginWithGG = () => {
  window.location.href = `${
    import.meta.env.VITE_SERVER_URL
  }/login/federated/google`;
};
const goToForgotPassword = () => {
  router.push("/forgot-password");
};

onMounted(() => {
  AOS.init({
    duration: 1000, // Animation duration (1 second)
    once: true, // Run animation only once
  });
});
</script>

<style scoped>
/* Modal overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7); /* Nền đen mờ */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* Modal container */
.modal-container {
  background-color: #fff; /* Nền trắng */
  padding: 30px;
  border-radius: 10px;
  width: 400px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3); /* Đổ bóng */
  position: relative;
}

/* Close button */
.close {
  background: none;
  border: none;
  color: #000; /* Màu đen */
  font-size: 1.5rem;
  position: absolute;
  top: 15px;
  right: 15px;
  cursor: pointer;
}

.close:hover {
  color: #555; /* Màu xám đậm khi hover */
}

/* Modal title */
.modal-title {
  font-size: 1.8rem;
  color: #000;
  margin-bottom: 20px;
}

/* Input styling */
.modal-body input {
  background-color: #f8f9fa; /* Xám nhạt */
  color: #000;
  border: 1px solid #ddd; /* Viền xám nhạt */
  border-radius: 5px;
  padding: 10px;
  width: 100%;
}

.modal-body input:focus {
  outline: none;
  border-color: #000;
}

/* Password toggle icon */
.password-toggle-icon {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  font-size: 1.2rem;
  color: #666; /* Xám */
  cursor: pointer;
}

.password-toggle-icon:hover {
  color: #000;
}

/* Google button */
.btn-social {
  width: 100%;
  border: 1px solid #ddd;
  background-color: #f4f1ee; /* Nền xám nhạt */
  color: #000; /* Chữ đen */
  text-align: left;
  border-radius: 5px;
}

.btn-social:hover {
  background-color: #e0e0e0;
}

/* Error message styling */
.error-message p {
  color: #d9534f; /* Màu đỏ */
  font-size: 0.9rem;
  margin-top: 10px;
}

/* Button styling */
.btn-primary {
  background-color: #000;
  color: #fff;
  border: 1px solid #000;
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: bold;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.btn-primary:hover {
  background-color: #333;
}

/* Forgot password link */
.forgot-password-link {
  color: #555;
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.forgot-password-link:hover {
  color: #000;
  text-decoration: underline;
}

/* Divider styling */
hr {
  display: inline-block;
  width: 40%;
  margin: 0 10px;
  border: 1px solid #ddd;
}
</style>
