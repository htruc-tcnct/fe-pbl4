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

.forgot-password-link {
  transition: color 0.3s ease, text-decoration 0.3s ease;
}

.forgot-password-link:hover {
  text-decoration: underline !important;
  color: #0056b3 !important;
}
</style>
