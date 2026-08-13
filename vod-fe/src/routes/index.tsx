import HomePage from "@/routes/HomePage";

import UserChannelPage from "@/routes/UserChannelPage";

import NotFoundPage from "@/routes/NotFoundPage";
import AdminDashboardPage from "@/routes/AdminDashboardPage";
import AdminUsersPage from "@/routes/AdminUserPage";
import AdminServerPage from "@/routes/AdminServerPage";
import PlayVideoPage from "@/routes/PlayVideoPage";
import ManageVideoPage from "@/routes/ManageVideoPage";
import ManageLivestreamPage from "@/routes/ManageLivestreamPage";
import SettingsPage from "@/routes/SettingsPage";
import SubscriptionsPage from "@/routes/SubscriptionsPage";
import FeedPage from "@/routes/FeedPage";
import HistoryPage from "@/routes/HistoryPage";
import LikedVideosPage from "@/routes/LikedVideosPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LiveSetupPage from "./LiveSetupPage";
import PlayLivestreamPage from "./PlayLivestreamPage";
import LivestreamPage from "./LivesteamPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/feed",
    element: <FeedPage />,
  },
  {
    path: "/livestream",
    element: <LiveSetupPage />,
  },
  {
    path: "/subscriptions",
    element: <SubscriptionsPage />,
  },
  {
    path: "/history",
    element: <HistoryPage />,
  },
  {
    path: "/liked-videos",
    element: <LikedVideosPage />,
  },
  {
    // Route format: /@username/live
    // The @ is encoded as %40 in the URL
    // This must come before /:atUsername to avoid conflicts
    path: "/:atUsername/live",
    element: <LivestreamPage />,
  },
  {
    // Route format: /@username
    // The @ is encoded as %40 in the URL
    path: "/:atUsername",
    element: <UserChannelPage />,
  },
  {
    path: "/video/:videoId",
    element: <PlayVideoPage />,
  },
  {
    path: "/livestream/:livestreamId",
    element: <PlayLivestreamPage />,
  },
  {
    path: "/manage/videos/:videoId",
    element: <ManageVideoPage />,
  },
  {
    path: "/manage/livestreams/:livestreamId",
    element: <ManageLivestreamPage />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
  },
  {
    path: "/admin",
    element: <AdminDashboardPage />,
  },
  {
    path: "/admin/users",
    element: <AdminUsersPage />,
  },
  {
    path: "/admin/servers",
    element: <AdminServerPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
