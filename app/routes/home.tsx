import type { Route } from "./+types/home";

import { UI } from "@/components/ui";
import { GL } from "@/gl";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Opentopia - A Turn-Based Strategy Game" },
    {
      name: "description",
      content:
        "Join the battle in this minimalist Polytopia-style strategy game!",
    },
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
