import type { Metadata } from "next";
import "./styles.css";
import "./extras.css";
import "./actions.css";
import "./photos.css";
import "./field/field.css";

export const metadata: Metadata = {
  title: "CAM Golf Job Tracker",
  description: "Field job cards, admin review and EZGO reports"
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
