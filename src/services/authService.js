import axios from "axios";
import { useStore } from "vuex";
import { useRouter } from "vue-router";

export const checkSessionStatus = async () => {
  const store = useStore();
  const router = useRouter();

  try {
    const result = await axios.get("http://localhost:8000/user-info", {
      withCredentials: true,
    });

    if (result.data && result.data.name) {
    } else {
      handleLogout(store, router);
    }
  } catch (err) {
    console.error("Error fetching user info or session invalid:", err);
    handleLogout(store, router);
  }
};

export const handleLogout = async (store, router) => {
  try {
    await axios.post(
      "http://localhost:8000/user/logout",
      {},
      {
        withCredentials: true,
      }
    );

    store.commit("setUser", null);
    router.push("/");
  } catch (error) {
    console.error("Error logging out:", error);
    router.push("/");
  }
};
