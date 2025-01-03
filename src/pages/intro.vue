<template>
  <div class="container-fluid">
    <!-- Video Background -->
    

      <!-- Nội dung chính -->
      <div class="row">
      <div
        class="col-md-6 text-center"
        style="padding-top: 50px"
        data-aos="fade-up"
      >
        <img
          src="../assets/logoremove.png"
          alt="Logo"
          class="img-responsive"
          style="max-width: 340px; margin: 0 auto"
        />
        <h2 style="margin-top: 20px">Edit as one, sync right away!</h2>
      </div>

      <div class="col-md-6 p-5" data-aos="fade-left">
        <h1 class="text-center p-3">Sign up now.</h1>


      

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

<style scoped>
.video-bg {
  position: fixed; /* Đặt cố định để phủ toàn màn hình */
  top: 0;
  left: 0;
  width: 100%; /* Phủ hết chiều rộng */
  height: 100%; /* Phủ hết chiều cao */
  object-fit: cover; /* Đảm bảo giữ tỷ lệ video */
  z-index: -1; /* Đặt phía sau nội dung */
}
.container-fluid {
  position: relative; /* Đảm bảo nội dung nằm phía trên video */
  z-index: 1;
}
.main-content {
  padding-bottom: 350px; /* Tạo khoảng trống giữa nội dung chính và footer */
}

.footer {
  position: relative;
  color: white;
  margin-top: 50px; /* Đẩy footer xuống dưới */
}
.footer {
  color: white; /* Đặt màu chữ trắng */
}

.footer a {
  color: white; /* Đặt màu cho các liên kết */
  text-decoration: none; /* Bỏ gạch chân */
}

.footer a:hover {
  text-decoration: underline; /* Thêm gạch chân khi hover */
}
button:hover {
  transform: translateY(-2px); /* Nhô lên nhẹ khi hover */
  transition: transform 0.2s ease, box-shadow 0.2s ease; /* Hiệu ứng mượt */
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2); /* Tăng shadow khi hover */
}

/* Hover cho nút màu chính (primary) */
.btn-primary:hover {
  background-color: #429dd9 !important; /* Tô đậm màu xanh dương */
}

/* Hover cho nút màu phụ (secondary) */
.btn-secondary:hover {
  background-color: #e1e5e8 !important; /* Màu sáng hơn */
}

/* Hover cho nút Google (social) */
.btn-social:hover {
  background-color: #e0dedc !important; /* Đổi màu nền */
}
</style>
