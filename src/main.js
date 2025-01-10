import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store"; // Import Vuex store


const app = createApp(App);


app.use(store); // Sử dụng Vuex
app.use(router); // Sử dụng Vue Router

app.mount("#app");
