<template>
  <div
    class="email-form-container"
    data-aos="zoom-in-up"
    data-aos-duration="1000"
  >
    <h2>Reset Password</h2>
    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="email">Enter your email to reset password:</label>
        <input
          type="email"
          id="email"
          v-model="email"
          placeholder="Enter your email"
          required
        />
      </div>
      <button type="submit">Send Reset Link</button>
    </form>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import AOS from "aos";
import "aos/dist/aos.css";
import axios from "axios";
export default {
  data() {
    return {
      email: "",
      successMessage: "",
      errorMessage: "",
    };
  },
  mounted() {
    AOS.init(); // Initialize AOS when the component is mounted
  },
  methods: {
    async submitForm() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/user/forgotPassword`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: this.email }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          this.successMessage = data.message;
          this.errorMessage = ""; // Clear any previous errors
        } else {
          const errorData = await response.json();
          this.errorMessage = errorData.message || "Error sending reset email";
          this.successMessage = ""; // Clear any success message
        }
      } catch (error) {
        this.errorMessage = "Something went wrong, please try again later.";
        this.successMessage = ""; // Clear any success message
      }
    },
  },
};
</script>

<style scoped>
.email-form-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
  text-align: center;
}

h2 {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

input[type="email"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 15px;
  background-color: #343a40;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #3d4044;
}

.success-message {
  color: green;
  margin-top: 20px;
}

.error-message {
  color: red;
  margin-top: 20px;
}
</style>
