"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  return { user, ready: !loading && !!user };
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export function useRequireAdmin() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!ADMIN_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  return { user, ready: !loading && !!user && ADMIN_ROLES.includes(user.role) };
}
