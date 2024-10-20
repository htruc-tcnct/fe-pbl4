<template>
  <div class="reset-password-container">
    <h2>Reset Your Password</h2>
    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="new-password">New Password:</label>
        <input
          type="password"
          id="new-password"
          v-model="newPassword"
          placeholder="Enter new password"
          required
        />
      </div>

      <!-- Confirm Password Field -->
      <div class="form-group">
        <label for="confirm-password">Confirm Password:</label>
        <input
          type="password"
          id="confirm-password"
          v-model="confirmPassword"
          placeholder="Confirm new password"
          required
        />
      </div>

      <!-- Display an error message if passwords do not match -->
      <div v-if="passwordError" class="error-message">
        {{ passwordError }}
      </div>

      <!-- Buttons Section -->
      <div class="button-group">
        <!-- Submit Button -->
        <button type="submit" :disabled="isSubmitting">Reset Password</button>

        <!-- Back Button to go to home page -->
        <button type="button" @click="goBack" :disabled="isSubmitting">
          Back
        </button>
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </form>
  </div>
</template>

<script>
export default {
  props: ["id", "token"], // Receive id and token from the route
  data() {
    return {
      newPassword: "",
      confirmPassword: "",
      passwordError: "",
      successMessage: "",
      isSubmitting: false,
    };
  },
  methods: {
    async submitForm() {
      // Check if the passwords match
      if (this.newPassword !== this.confirmPassword) {
        this.passwordError = "Passwords do not match!";
        return;
      }
      this.passwordError = ""; // Clear any previous errors
      this.isSubmitting = true; // Disable the button to prevent multiple submissions

      try {
        // Use the id and token received as props in the request
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/user/resetPassword/${this.id}/${
            this.token
          }`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: this.newPassword }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          this.successMessage = data.message || "Password reset successfully!";
          this.passwordError = ""; // Clear errors if the password reset is successful

          // Redirect to the homepage after 2 seconds
          setTimeout(() => {
            this.$router.push("/");
          }, 2000); // Adjust the time as necessary
        } else {
          const errorData = await response.json();
          this.passwordError = errorData.message || "Error resetting password!";
        }
      } catch (error) {
        this.passwordError = "Something went wrong, please try again later.";
      } finally {
        this.isSubmitting = false; // Enable the button again after submission
      }
    },

    // Method to go back to the homepage immediately
    goBack() {
      this.$router.push("/"); // Redirect to the homepage
    },
  },
};
</script>

<style scoped>
/* Same styling as before */
.reset-password-container {
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

input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.button-group {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

button {
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button[type="button"] {
  background-color: #6c757d; /* Gray background for the Back button */
}

button[type="button"]:hover {
  background-color: #5a6268; /* Darker gray on hover */
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
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
