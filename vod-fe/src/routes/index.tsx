import HomePage from "@/routes/HomePage";
import UserChannelPage from "@/routes/UserChannelPage";
import NotFoundPage from "@/routes/NotFoundPage";
import AdminDashboardPage from "@/routes/AdminDashboardPage";
import AdminUsersPage from "@/routes/AdminUserPage";
import AdminServerPage from "@/routes/AdminServerPage";
import PlayVideoPage from "@/routes/PlayVideoPage";
import ManageVideoPage from "@/routes/ManageVideoPage";
import SettingsPage from "@/routes/SettingsPage";
import HistoryPage from "@/routes/HistoryPage";
import LikedVideosPage from "@/routes/LikedVideosPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
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
    path: "/manage/videos/:videoId",
    element: <ManageVideoPage />,
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
