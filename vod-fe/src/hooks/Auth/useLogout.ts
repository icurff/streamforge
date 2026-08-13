import { useQueryClient } from "@tanstack/react-query";
import accessToken from "../../utils/LocalStorage";

type UseLogoutResult = {
  logout: () => void;
};

const useLogout = (): UseLogoutResult => {
  const queryClient = useQueryClient();
  const logout = () => {
    accessToken.removeAccessToken();
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
    window.location.href = "/";
    window.location.reload();
  };

  return { logout };
};

export default useLogout;










