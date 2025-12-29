import agentRouter from "@/modules/agent/agent.route";
import authRouter from "@/modules/auth/auth.route";
import faqRouter from "@/modules/faq/faq.route";
import fileRouter from "@/modules/file/file.route";
import grantAccessRouter from "@/modules/grant-access/grant-access.route";
import monthlyReportRouter from "@/modules/monthly-report/monthly-report.route";
import noticeRouter from "@/modules/notice/notice.route";
import notificationRouter from "@/modules/notification/notification.route";
import preMarketRouter from "@/modules/pre-market/pre-market.route";
import renterRouter from "@/modules/renter/renter.route";
import supportRouter from "@/modules/support/support.route";
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
  {
    path: "/pre-market",
    route: preMarketRouter,
  },
  {
    path: "/notice",
    route: noticeRouter,
  },
  {
    path: "/faq",
    route: faqRouter,
  },
  {
    path: "/grant-access",
    route: grantAccessRouter,
  },
  {
    path: "/notifications",
    route: notificationRouter,
  },
  {
    path: "/monthly-reports",
    route: monthlyReportRouter,
  },
  {
    path: "/support",
    route: supportRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
