import { useEffect, useState } from "react";
import { showNotification } from "@/lib/feedback";
import { router } from "@/router";
import { useAuthStore } from "@/stores/auth";

let authStartup: Promise<void> | undefined;

export function useAuthSession() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return useAuthStore.subscribe((state, previous) => {
      if (!previous.tokens?.access_token || state.tokens?.access_token) return;

      // Clearing the session re-runs the parent auth guard, including on full-screen routes.
      router.invalidate().catch((error: unknown) => {
        showNotification({
          id: "auth-session",
          state: "error",
          action: "更新登录状态",
          content: { error, fallback: "请刷新页面后重试" },
        });
      });
    });
  }, []);

  useEffect(() => {
    let active = true;
    const ready = () => {
      if (!active) return;
      setAuthReady(true);
    };
    authStartup ??= useAuthStore.persist.rehydrate();
    authStartup.then(ready, ready);
    return () => {
      active = false;
    };
  }, []);

  return authReady;
}
