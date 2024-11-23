<template>
  <div class="container-fluid">
    <div class="row">
      <div
        class="col-md-6 text-center"
        style="padding-top: 50px"
        data-aos="fade-up"
      >
        <img
          src="../assets/logo.png"
          alt="Logo"
          class="img-responsive"
          style="max-width: 340px; margin: 0 auto"
        />
        <h2 style="margin-top: 20px">Edit as one, sync right away!</h2>
      </div>

      <div class="col-md-6 p-5" data-aos="fade-left">
        <h1 class="text-center p-3">Sign up now.</h1>

        <div class="text-center">
          <div class="row">
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
              Sign up with Google
            </button>
          </div>
        </div>

        <div class="text-center" style="margin: 20px 0">
          <hr />
          <span>or</span>
          <hr />
        </div>

        <div class="text-center">
          <button
            @click="openModal('register')"
            class="btn fw-bold text-white btn-block"
            style="background-color: #54b2f2; margin-bottom: 20px"
          >
            Register new account
          </button>
        </div>

        <p class="text-center fw-bold">Already have an account?</p>
        <div class="text-center">
          <button
            @click="openModal('login')"
            class="btn fw-bold text-dark btn-block"
            style="
              background-color: #f3f7f9;
              margin-bottom: 20px;
              border: black solid 1px;
            "
          >
            Sign in
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <RegisterModal
      :currentModal="currentModal"
      @close="closeModal"
      @switchModal="openModal"
    />
    <LoginModal
      :currentModal="currentModal"
      @close="closeModal"
      @switchModal="openModal"
    />

    <!-- Footer -->
    <footer class="text-center" style="padding: 20px 0">
      <a href="/introduction" class="text-decoration-none text-body-tertiary"
        >Introduction</a
      >
      |
      <a href="/about" class="text-decoration-none text-body-tertiary">About</a>
      <p>&copy; 2024 PBL4</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import AOS from "aos";
import "aos/dist/aos.css";
import LoginModal from "./login.vue";
import RegisterModal from "./register.vue";

const currentModal = ref(null);
const openModal = (type) => {
  currentModal.value = type;
};
const closeModal = () => {
  currentModal.value = null;
};

onMounted(() => {
  AOS.init({
    duration: 1000, // Thời gian chuyển động của AOS (1 giây)
  });
});
const loginWithGG = () => {
  window.location.href = `${
    import.meta.env.VITE_SERVER_URL
  }/login/federated/google`;
};
</script>

<style scoped></style>
