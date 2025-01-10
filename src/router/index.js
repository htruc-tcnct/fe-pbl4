import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", component: () => import("../pages/intro.vue") },

  { path: "/login", component: () => import("../pages/login.vue") },
  { path: "/register", component: () => import("../pages/register.vue") },
  {
    path: "/forgot-password",
    component: () => import("../pages/forgot_password.vue"),
  },
  {
    path: "/user/resetPassword/:id/:token",
    component: () => import("../pages/reset_password.vue"),
    props: true,
  },
  {
    path: "/home",
    component: () => import("../pages/home.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/documents/share/:id",
    component: () => import("../pages/text_editor.vue"),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: "/documents/detail/:id", // ':id' matches the dynamic segment
    component: () => import("../pages/text_editor.vue"),
    meta: { requiresAuth: true },
    props: (route) => ({
      id: route.params.id, // Use 'id' instead of 'documentId'
      ownerIdDocument: route.query.ownerIdDocument,
    }),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
