"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      const editable = document.activeElement?.getAttribute("contenteditable");
      if (tag === "input" || tag === "textarea" || tag === "select" || editable === "true") return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        router.push("/admin");
      }
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        router.push("/admin/kasse");
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        router.push("/admin/bilder");
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        router.push("/admin/kaufuebersicht");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
