<template>
  <div v-if="visible === 'settingShare'" class="modal-overlay">
    <div class="modal-content px-4" style="background-color: #f2f2f2">
      <button @click="$emit('close')" class="btn-close">&times;</button>
      <h5 class="modal-title">Share Settings</h5>
      <div class="form-group mb-3">
        <input
          style="background-color: #f2f2f2"
          type="text"
          class="w-100 border border-secondary-subtle p-2"
          placeholder="Enter an email to share..."
          @keydown.enter="showEmailForm"
          v-model="emailToShare"
        />
      </div>
      <div v-if="emailFormVisible">
        <input
          type="text"
          class="w-100"
          style="height: 90px"
          placeholder="Message..."
        />
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
      <div class="" v-if="!emailFormVisible">
        <h6>People with access</h6>
        <div class="access-info mb-3">
          <div class="access-user d-flex align-items-center mb-2">
            <img :src="avatarUrl" class="avatar me-2" alt="Avatar" />
            <span>{{ userName }} </span>
            <span class="access-role ms-auto">Owner</span>
          </div>
        </div>
        <div class="general-access mb-3">
          <h5>General access</h5>
          <div class="access-option mb-1">
            <div class="row border border-success p-1 border-opacity-10">
              <div class="col-9 d-flex">
                <i
                  v-if="selectedAccess === 'Restricted'"
                  class="fas fa-lock mt-3 text-secondary"
                ></i>
                <i v-else class="fas fa-globe-asia mt-3 text-secondary"></i>
                <select
                  style="background-color: #f2f2f2"
                  v-model="selectedAccess"
                  class="form-select border-0"
                >
                  <option value="Restricted">Restricted</option>
                  <option value="Everyone">Everyone with the code</option>
                </select>
              </div>
              <div class="col-3 d-flex" v-if="selectedAccess === 'Everyone'">
                <select
                  style="background-color: #f2f2f2"
                  v-model="selectedOption"
                  class="form-select ms-2 border-0"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Edit">Edit</option>
                </select>
              </div>
              <p
                v-if="selectedAccess === 'Restricted'"
                class="text-muted m-0 ms-4"
                style="font-size: 12px"
              >
                Only people with access can open with the link
              </p>
              <p v-else class="text-muted m-0 ms-4" style="font-size: 12px">
                Anyone on the internet with the link can access
              </p>
            </div>
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
              @click="onSubmit(idDoc)"
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
import { ref, onMounted, defineProps } from "vue";
import axios from "axios";
const props = defineProps(["idDoc", "visible"]);

const emit = defineEmits(["close", "documentUpdated"]);

onMounted(async () => {
  await fetchUserInfo();
  await fetchDocumentInfo();
});
const avatarUrl = ref("");
const documentName = ref("");
const userName = ref("User");
let selectedOption = ref("");
let selectedAccess = ref("");
const emailFormVisible = ref(false);
const emailToShare = ref("");
const sendToEmail = async () => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL}/documents/share-to-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailToShare.value,
          id: props.idDoc,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error sending email: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("Email sent successfully:", data);
  } catch (err) {
    console.error("Failed to send email:", err);
    // Hiển thị thông báo lỗi cho người dùng
    alert("Failed to send email: " + err.message);
  }
};

const showEmailForm = () => {
  if (documentName.value.trim() !== "") {
    emailFormVisible.value = true;
  }
};
const CancelSendEmail = () => {
  if (documentName.value.trim() !== "") {
    emailFormVisible.value = false;
  }
};
const fetchUserInfo = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/user-info`,
      {
        withCredentials: true,
      }
    );
    if (response.data) {
      userName.value = response.data.name || "";
      avatarUrl.value =
        response.data.avatar ||
        "https://lh3.googleusercontent.com/a/ACg8ocKoDEyexWhhk5WyueZTOjq8_ZA0Z9-iUeytfG6WU2kCwKVS5BWwoA=s96-c-rg-br100";
    }
  } catch (error) {
    if (error.response) {
      console.error("Error response:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    console.error("Full error object:", error);
  }
};
const fetchDocumentInfo = async () => {
  try {
    if (!props.idDoc || props.idDoc === "") {
      console.error("Invalid idDoc:", props.idDoc);
      return;
    }
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/documents/detail/${props.idDoc}`,
      {
        withCredentials: true,
      }
    );
    if (response.data) {
      console.log(response.data.documents[0].accessLevel);
      documentName.value = response.data.documents[0].documentTitle;

      selectedOption.value = response.data.documents[0].accessLevel;
      if (selectedOption.value === "Restricted") {
        selectedAccess.value = "Restricted";
      } else {
        selectedAccess.value = "Everyone";
      }
      console.log(response.data);
    }
  } catch (error) {
    console.error("Error fetching document info:", error);
  }
};

const onSubmit = async () => {
  if (!props.idDoc || props.idDoc === "") {
    console.error("Invalid idDoc:", props.idDoc);
    return;
  }

  try {
    // console.log(`Updating document with ID: ${props.idDoc}`);

    let accessLevel;

    if (selectedAccess.value === "Everyone") {
      accessLevel = selectedOption.value;
    } else {
      accessLevel = selectedAccess.value;
    }
    const response = await axios.put(
      `${import.meta.env.VITE_SERVER_URL}/documents/${props.idDoc}`,
      {
        accessLevel: accessLevel, // Gán giá trị accessLevel
      }
    );

    console.log("Update success:", response.data);
    alert("Document updated successfully!");
    emit("documentUpdated", response.data);
  } catch (error) {
    console.error("Error updating document info:", error);

    // Xử lý lỗi trả về từ API
    if (error.response) {
      console.error("Response error:", error.response.data); // In thông báo lỗi từ API
      alert(`Error updating document: ${error.response.data.message}`);
    }
  }
};

const copyLink = () => {
  axios
    .get(`${import.meta.env.VITE_SERVER_URL}/documents/detail/${props.idDoc}`)
    .then((result) => {
      if (
        result.data &&
        result.data.documents &&
        result.data.documents.length > 0
      ) {
        const shareCode = result.data.documents[0].shareCode;
        // console.log("Share Code:", shareCode);

        navigator.clipboard
          .writeText(shareCode)
          .then(() => {
            alert("Share Code copied to clipboard!");
          })
          .catch((err) => {
            console.error("Error copying share code:", err);
          });
      } else {
        console.error("No documents found or invalid response");
      }
    })
    .catch((err) => {
      console.log(err.response);
    });

  // navigator.clipboard.writeText("https://example.com/document-link");
  // alert("Link copied to clipboard!");
};
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
