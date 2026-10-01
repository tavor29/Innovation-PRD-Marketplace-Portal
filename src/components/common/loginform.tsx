"use client";
import { useActionState } from "react";
import { login } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="email">אימייל</Label>
        <Input id="email" name="email" type="email" dir="ltr" required defaultValue="submitter@meridian.demo" />
      </div>
      <div>
        <Label htmlFor="password">סיסמה</Label>
        <Input id="password" name="password" type="password" dir="ltr" required />
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-critical">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        כניסה
      </Button>
      <p className="text-xs text-ink-muted">משתמשי הדמו: submitter@ / manager@ / dev@ / admin@meridian.demo</p>
    </form>
  );
}
