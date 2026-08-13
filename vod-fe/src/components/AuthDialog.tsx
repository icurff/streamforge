import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "./auth/LoginForm";
import { SignupForm } from "./auth/SignupForm";
import { ForgotPasswordForm } from "./auth/ForgotPasswordForm";
import { ResetPasswordForm } from "./auth/ResetPasswordForm";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "signup";
}

export function AuthDialog({ open, onOpenChange, defaultMode = "login" }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(defaultMode);
  const [resetEmail, setResetEmail] = useState<string>("");

  // Update mode when defaultMode changes
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const handleSuccess = () => {
    onOpenChange(false);
  };

  // const handleSocialLogin = async (provider: string) => {
  //   setLoading(true);
  //   try {
  //     await socialLogin(provider);
  //     toast({
  //       title: "Success",
  //       description: "Logged in successfully!",
  //     });
  //     onOpenChange(false);
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: error instanceof Error ? error.message : "Something went wrong",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-semibold text-center">
              {mode === "login"
                ? "Log in to VideoShare"
                : mode === "signup"
                ? "Sign up for VideoShare"
                : mode === "forgot"
                ? "Reset your password"
                : "Enter OTP and new password"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Social Login Buttons */}
          
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 h-12 border-2"
              onClick={() => {}}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Log in with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email/Password or Forgot Form */}
            {mode === "login" && (
              <LoginForm onSuccess={handleSuccess} onForgotPassword={() => setMode("forgot")} />
            )}
            {mode === "signup" && <SignupForm onSuccess={handleSuccess} />}
            {mode === "forgot" && (
              <ForgotPasswordForm
                onEmailSent={(email) => {
                  setResetEmail(email);
                  setMode("reset");
                }}
              />
            )}
            {mode === "reset" && (
              <ResetPasswordForm
                emailHint={resetEmail}
                onSuccess={() => {
                  // After successful reset, return to login
                  setMode("login");
                  onOpenChange(false);
                }}
              />
            )}

            <div className="text-center text-sm">
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline font-medium"
                  >
                    Join VideoShare.
                  </button>
                </>
              ) : mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Log in.
                  </button>
                </>
              ) : mode === "forgot" ? (
                <>
                  Remember your password?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Back to log in.
                  </button>
                </>
              ) : (
                <>
                  Didn't get the email?{" "}
                  <button
                    onClick={() => setMode("forgot")}
                    className="text-primary hover:underline font-medium"
                  >
                    Resend OTP
                  </button>
                </>
              )}
            </div>

            {mode === "signup" && (
              <p className="text-xs text-muted-foreground text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
