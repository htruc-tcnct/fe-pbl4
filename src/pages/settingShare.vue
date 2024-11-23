<template>
  <div v-if="visible === 'settingShare'" class="modal-overlay">
    <div class="modal-content px-4" style="background-color: #f2f2f2">
      <button @click="$emit('close')" class="btn-close">&times;</button>
      <h5 class="modal-title">Share Settings</h5>

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
            <button @click="CancelSendEmail" class="btn btn-light px-3">
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

      <div v-else>
        <h6>People with access</h6>
        <div class="access-info mb-3">
          <div class="access-user d-flex align-items-center mb-2">
            <img :src="avatarUrl" class="avatar me-2" alt="Avatar" />
            <span>{{ userName }}</span>
            <span class="access-role ms-auto">Owner</span>
          </div>
        </div>

        <div class="general-access mb-3">
          <h5>General access</h5>
          <div class="access-option mb-1">
            <div class="row border border-success p-1 border-opacity-10">
              <div class="col-9 d-flex align-items-center">
                <i
                  v-if="selectedAccess === 'Restricted'"
                  class="fas fa-lock text-secondary me-2"
                ></i>
                <i v-else class="fas fa-globe-asia text-secondary me-2"></i>
                <select
                  class="form-select border-0"
                  style="background-color: #f2f2f2"
                  v-model="selectedAccess"
                >
                  <option value="Restricted">Restricted</option>
                  <option value="Everyone">Everyone with the code</option>
                </select>
              </div>
              <div class="col-3" v-if="selectedAccess === 'Everyone'">
                <select
                  class="form-select ms-2 border-0"
                  style="background-color: #f2f2f2"
                  v-model="selectedOption"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Edit">Edit</option>
                </select>
              </div>
            </div>
            <p
              v-if="selectedAccess === 'Restricted'"
              class="text-muted ms-4"
              style="font-size: 12px"
            >
              Only people with access can open with the link.
            </p>
            <p v-else class="text-muted ms-4" style="font-size: 12px">
              Anyone on the internet with the link can access.
            </p>
          </div>
        </div>

        <div class="row">
          <div class="col-9">
            <button
              class="btn btn-outline-primary ms-3 rounded-pill"
              @click="copyLink"
            >
              Copy ID Room
            </button>
          </div>
          <div class="col-3">
            <button
              class="btn btn-primary rounded-pill fw-bold px-3"
              @click="onSubmit"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, defineProps, defineEmits, watch } from "vue";
import axios from "axios";
import { data } from "jquery";

const props = defineProps(["idDoc", "visible"]);
const emit = defineEmits(["close", "documentUpdated"]);

// State variables
const avatarUrl = ref("");
const userName = ref("User");
const documentName = ref("");
const idDocument = ref("");
const emailToShare = ref("");
const emailMessage = ref("");
const selectedAccess = ref("Restricted");
const selectedOption = ref("Viewer");
const emailFormVisible = ref(false);
watch(
  () => props.idDoc,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      console.log(`idDoc changed from ${oldId} to ${newId}`);
      await fetchDocumentInfo();
    }
  },
  { immediate: true } // Gọi ngay lập tức khi component được mounted
);
// API Calls
const fetchUserInfo = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/user-info`,
      { withCredentials: true }
    );
    if (response.data) {
      userName.value = response.data.name || "User";
      avatarUrl.value =
        response.data.avatar || "https://example.com/default-avatar.png";
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
  }
};
const fetchDocumentInfo = async () => {
  try {
    if (!props.idDoc || props.idDoc === "") {
      return;
    }
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/documents/detail/${props.idDoc}`,
      {
        withCredentials: true,
      }
    );
    if (response.data && response.data.document) {
      console.log(response.data);
      const doc = response.data.document;
      documentName.value = doc.documentTitle;
      selectedAccess.value = doc.accessLevel;

      console.log("Fetched document:", response.data.document);
      idDocument.value = response.data.document.shareCode;
    } else {
      console.error("Invalid response structure:", response.data);
    }
  } catch (error) {
    console.error("Error fetching document info:", error);
  }
};

const sendToEmail = async () => {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_SERVER_URL}/documents/share-to-email`,
      {
        email: emailToShare.value,
        id: props.idDoc,
        message: emailMessage.value,
      }
    );
    console.log("Email sent successfully:", response.data);
  } catch (err) {
    console.error("Failed to send email:", err);
    alert("Failed to send email.");
  }
};
const copyLink = async () => {
  if (!idDocument.value) {
    alert("Share code is not available!");
    return;
  }
  try {
    await navigator.clipboard.writeText(idDocument.value);
    alert("Share Code copied to clipboard!");
  } catch (err) {
    console.error("Error copying to clipboard:", err);
    alert("Failed to copy share code.", err);
  }
};
const onSubmit = async () => {
  if (!props.idDoc || props.idDoc === "") {
    console.error("Invalid idDoc:", props.idDoc);
    return;
  }

  try {
    const accessLevel =
      selectedAccess.value === "Everyone"
        ? selectedOption.value
        : selectedAccess.value;

    const response = await axios.put(
      `${import.meta.env.VITE_SERVER_URL}/documents/${props.idDoc}`,
      {
        accessLevel, // Gán giá trị accessLevel từ trạng thái
      }
    );

    console.log("Update success:", response.data);
    alert("Document updated successfully!");
    emit("documentUpdated", response.data);
  } catch (error) {
    console.error("Error updating document:", error);
  }
};

const showEmailForm = () => {
  emailFormVisible.value = true;
};
const CancelSendEmail = () => {
  emailFormVisible.value = false;
};

// Lifecycle
onMounted(async () => {
  await fetchUserInfo();
  await fetchDocumentInfo();
});
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
  width: 460px;
  max-width: 90%;
  text-align: left;
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

.modal-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.access-role {
  font-size: 14px;
  color: #555;
}

.form-select {
  width: auto;
}
</style>
