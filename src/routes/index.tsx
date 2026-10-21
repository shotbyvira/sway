import { createFileRoute } from "@tanstack/react-router";
import { SwayApp } from "@/game/SwayApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SwayApp />;
}
