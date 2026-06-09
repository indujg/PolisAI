import type { ReactNode } from "react";
import { PolisAppLayout } from "@/components/polisai/app-layout";

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <PolisAppLayout>{children}</PolisAppLayout>;
}
