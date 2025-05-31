import type { Route } from "./+types/home";

import { UI } from "~/components/ui";
import { GL } from "~/gl";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="fixed w-screen h-screen">
      <GL />
      <UI />
    </div>
  );
}
