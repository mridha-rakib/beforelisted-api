import agentRouter from "@/modules/agent/agent.route";
import authRouter from "@/modules/auth/auth.route";
import fileRouter from "@/modules/file/file.route";
import renterRouter from "@/modules/renter/renter.route";
import userRouter from "@/modules/user/user.route";
import { Router } from "express";

const router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/user",
    route: userRouter,
  },
  {
    path: "/agent",
    route: agentRouter,
  },
  {
    path: "/renter",
    route: renterRouter,
  },
  {
    path: "/file",
    route: fileRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
