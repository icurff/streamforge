import { createContext, useContext, ReactNode } from "react";
import { useLoginMutation, type AuthUser } from "@/hooks/Auth/useLoginMutation";
import { useRegisterMutation } from "@/hooks/Auth/useRegisterMutation";
import { useGoogleLoginMutation } from "@/hooks/Auth/useGoogleLoginMutation";
import { useFetchAuthUser } from "@/hooks/Auth/useFetchAuthUser";
import useLogout from "@/hooks/Auth/useLogout";
import { useForgotPasswordMutation } from "@/hooks/Auth/useForgotPasswordMutation";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  socialLogin: (provider: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: fetchedUser } = useFetchAuthUser();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const { logout: performLogout } = useLogout();
  const forgotPasswordMutation = useForgotPasswordMutation();

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const signup = async (username: string, email: string, password: string) => {
    // Backend API currently expects email, password, passwordConfirmation
    await registerMutation.mutateAsync({
      username,
      email,
      password,
    });
  };

  const logout = () => {
    performLogout();
  };

  const socialLogin = async (provider: string) => {
    if (provider.toLowerCase() === "google") {
      // Pass current location search params to complete the OAuth callback
      await googleLoginMutation.mutateAsync(window.location.search ?? "");
      return;
    }
    throw new Error(`Unsupported social provider: ${provider}`);
  };

  const forgotPassword = async (email: string) => {
    await forgotPasswordMutation.mutateAsync(email);
  };

  return (
    <AuthContext.Provider
      value={{
        user: fetchedUser ?? null,
        isAuthenticated: !!fetchedUser,
        login,
        signup,
        logout,
        socialLogin,
        forgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
