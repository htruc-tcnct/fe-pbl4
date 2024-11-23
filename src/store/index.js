import { createStore } from "vuex";

export default createStore({
  state: {
    user: null,
    token: null,
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setToken(state, token) {
      state.token = token;
    },
  },
  getters: {
    isLoggedIn(state) {
      return !!state.token; // Kiểm tra nếu token tồn tại
    },
    user(state) {
      return state.user; // Trả về thông tin người dùng
    },
  },
});
