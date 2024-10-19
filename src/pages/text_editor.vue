<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import axios from "axios";
import { useRouter } from "vue-router";
import { socket } from "../socket";
const quill = ref(null);
const accessLevel = ref("Viewer");
const errorMessage = ref("");
const router = useRouter();
const props = defineProps(["id", "ownerIdDocument"]);
const storedIdUser = localStorage.getItem("idUser");
const versionID = ref(null);
const checkAccessLevel = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_URL}/documents/detail/${props.id}`
    );
    accessLevel.value = response.data.documents[0].accessLevel;
    versionID.value = response.data.documents[0].currentVersionID;

    if (
      accessLevel.value === "Restricted" &&
      props.ownerIdDocument !== storedIdUser
    ) {
      const userResponse = window.confirm(
        "You cannot access this document. Would you like to request access?"
      );

      if (userResponse) {
        console.log("Requesting access...");
        router.push("/home");
      } else {
        router.push("/home");
      }
    }
  } catch (error) {
    console.error("Error checking access level:", error);
  }
};

onMounted(async () => {
  socket.connect();
  await checkAccessLevel();
  quill.value = new Quill(document.querySelector("#editorContainer"), {
    debug: "info",
    modules: {
      toolbar: [
        [{ font: [] }],
        [{ size: ["small", false, "large", "huge"] }],
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ script: "sub" }, { script: "super" }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link", "image"],
        ["clean"],
      ],
      history: {
        delay: 2000,
        maxStack: 500,
        userOnly: true,
      },
    },
    // placeholder: "Compose an epic...",
    readOnly: accessLevel.value === "View",
    theme: "snow",
  });
  quill.value.on("text-change", (delta, oldDelta, source) => {
    if (source === "user") {
      socket.emit("send-change", delta, versionID.value, storedIdUser);
    }
  });
  socket.on("receive-change", (delta) => {
    quill.value.updateContents(delta);
  });
});

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div>
    <div id="editorContainer"></div>
    <p v-if="accessLevel === 'Viewer'" class="text-info">
      Bạn chỉ có quyền xem tài liệu này.
    </p>
    <p v-if="errorMessage" class="text-danger">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
#editorContainer {
  height: 400px;
}

.text-info {
  color: blue;
  text-align: center;
  margin-top: 20px;
}

.text-danger {
  color: red;
  text-align: center;
  margin-top: 20px;
}
</style>
