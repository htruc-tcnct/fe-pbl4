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
        data-aos-duration="700"
      >
        <div class="modal-header">
          <button style="color: #000" class="close mb-5" @click="closeModal">
            &times;
          </button>
          <h2 class="modal-title text-center">Sign in</h2>
        </div>

        <div
          class="modal-body"
          data-aos="flip-left"
          data-aos-easing="ease-out-cubic"
          data-aos-duration="1000"
        >
          <div class="row px-3">
            <button
              @click="loginWithGG"
              class="btn btn-block btn-social btn-google py-2"
              style="
                background-color: #f4f1ee;
                color: #000;
                margin-bottom: 15px;
              "
            >
              <img
                src="../assets/gg.png"
                style="width: 20px; margin-right: 10px"
              />
              Sign in with Google
            </button>
          </div>

          <div class="text-center">
            <hr />
            <span>or</span>
            <hr />
          </div>

          <div class="position-relative">
            <input
              type="email"
              class="form-control bg-light text-dark my-2"
              placeholder="Enter your email"
              v-model="formData.email"
              autocomplete="email"
            />
            <div class="input-group">
              <input
                class="form-control bg-light text-dark my-2"
                :type="showPassword ? 'text' : 'password'"
                v-model="formData.password"
                autocomplete="current-password"
                placeholder="Enter your password"
              />
              <i
                class="icon my-4 px-3"
                :class="
                  showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'
                "
                @click="showPassword = !showPassword"
              ></i>
            </div>

            <!-- Display error message if any -->
            <div v-if="errorMessage">
              <hr />
              <p>{{ errorMessage }}</p>
            </div>

            <div class="py-2">
              <button
                type="submit"
                class="btn btn-primary px-5 position-absolute bottom-10 end-0"
              >
                Login
              </button>
            </div>
          </div>

          <div class="text-center mt-3 py-3">
            <a
              href="#"
              class="text-decoration-none text-danger forgot-password-link"
              @click.prevent="goToForgotPassword"
              >Forgot password?</a
            >
          </div>

          <div class="text-center">
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
      "http://localhost:8000/user/login",
      // `${import.meta.env.VITE_SERVER_URL}/user/login`,
      formData,
      {
        withCredentials: true, // Ensures cookies are sent with requests
      }
    );
    console.log("Login Success:", result.data);
    const user = result.data.user;
    store.commit("setUser", user); // Save user information in Vuex
    errorMessage.value = "";
    router.push("/");
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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* Modal container */
.modal-container {
  background-color: #f3f7f9;
  padding: 20px;
  border-radius: 10px;
  width: 400px;
  position: relative;
}

/* Close button */
.close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
}

/* Modal body styling */
.modal-body input {
  background-color: #2f3336;
  color: white;
  border: 1px solid #444;
  margin-top: 10px;
}

/* Social button styling */
.btn-social {
  border: 1px solid #ddd;
  text-align: left;
}

hr {
  display: inline-block;
  width: 40%;
  margin: 0 10px;
}

.forgot-password-link {
  transition: color 0.3s ease, text-decoration 0.3s ease;
}

.forgot-password-link:hover {
  text-decoration: underline !important;
  color: #0056b3 !important;
}
</style>
