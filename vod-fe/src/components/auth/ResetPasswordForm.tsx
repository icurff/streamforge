import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useResetPasswordMutation } from "@/hooks/Auth/useResetPasswordMutation";

interface ResetPasswordFormProps {
  onSuccess: () => void;
  emailHint?: string;
}

export function ResetPasswordForm({ onSuccess, emailHint }: ResetPasswordFormProps) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const resetMutation = useResetPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await resetMutation.mutateAsync({ token, password, passwordConfirmation });
      toast({ title: "Success", description: "Password has been reset. Please log in." });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {emailHint ? (
        <p className="text-sm text-muted-foreground">OTP has been sent to {emailHint}.</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="otp">OTP code</Label>
        <Input
          id="otp"
          placeholder="Enter the OTP from email"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Re-enter new password"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full h-12 bg-[#00b8e6] hover:bg-[#00a3d1] text-white" disabled={loading}>
        {loading ? "Please wait..." : "Reset password"}
      </Button>
    </form>
  );
}









