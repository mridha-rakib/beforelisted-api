import userRouter from "@/modules/user/user.route";
import { Router } from "express";

const router = Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
