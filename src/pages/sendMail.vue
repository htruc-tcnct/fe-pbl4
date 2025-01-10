<template>
  <div class="send-email-container">
    <div class="form-group mb-3">
      <input
        type="text"
        class="w-100 border border-secondary-subtle p-2"
        style="background-color: #f2f2f2"
        placeholder="Enter an email to share..."
        @keydown.enter="showEmailForm"
        v-model="emailToShare"
      />
    </div>

    <div v-if="emailFormVisible">
      <textarea
        class="w-100"
        style="height: 90px; background-color: #fff"
        placeholder="Message..."
        v-model="emailMessage"
      ></textarea>
      <div class="row mt-3">
        <div class="col-6"></div>
        <div class="col-3">
          <button @click="cancelSendEmail" class="btn btn-light px-3">
            Cancel
          </button>
        </div>
        <div class="col-3">
          <button class="btn btn-primary px-4" @click="sendToEmail">
            Send
          </button>
        </div>
      </div>
    </div>

    <div v-if="emailSent" class="modal-overlay">
      <div class="modal-content px-4" style="background-color: #f2f2f2">
        <button @click="closeSuccessModal" class="btn-close">&times;</button>
        <h5 class="modal-title">Success</h5>
        <p>Email sent successfully!</p>
        <button @click="closeSuccessModal" class="btn btn-primary">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from "vue";
import axios from "axios";

const props = defineProps(["idDoc", "shareCode"]);
const emit = defineEmits(["cancel"]);
const idDocument = localStorage.getItem("documentId");
const emailToShare = ref("");
const emailMessage = ref("");
const emailFormVisible = ref(false);
const emailSent = ref(false);
console.log("shareCode: ", props.shareCode);
const sendToEmail = async () => {
  try {
    const idOwn = localStorage.getItem("idOwn");
    const response = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/documents/share-to-email`,
      {
        email: emailToShare.value,
        id: idDocument,
        ownerId: idOwn,
        shareCode: props.shareCode,
        message: emailMessage.value,
      }
    );
    console.log("Email sent successfully:", response.data);
    emailSent.value = true;
  } catch (err) {
    console.error("Failed to send email:", err);
    alert("Failed to send email.");
  }
};

const showEmailForm = () => {
  emailFormVisible.value = true;
};

const cancelSendEmail = () => {
  emailFormVisible.value = false;
  emit("cancel");
};

const closeSuccessModal = () => {
  emailSent.value = false;
  emailFormVisible.value = false;
  emit("cancel");
};
</script>

<style scoped>
.send-email-container {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group input,
textarea {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px;
  font-size: 14px;
  color: #333;
}

textarea {
  resize: none;
}

textarea:focus,
input:focus {
  outline: none;
  border: 1px solid #333;
}

button {
  border-radius: 5px;
  font-size: 14px;
  font-weight: bold;
}

.btn-primary {
  background-color: #000;
  color: #fff;
  border: 1px solid #000;
}

.btn-primary:hover {
  background-color: #333;
}

.btn-light {
  background-color: #f2f2f2;
  color: #333;
  border: 1px solid #ddd;
}

.btn-light:hover {
  background-color: #e0e0e0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  padding: 25px;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  position: relative;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.btn-close {
  position: absolute;
  top: 15px;
  right: 15px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #333;
  cursor: pointer;
}

.btn-close:hover {
  color: #000;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #000;
}
</style>
