import { DEFAULT_DEVICE_TOKEN, DEFAULT_SCREEN_ID } from "@/lib/constants";
import { PlayerSurface } from "@/components/player-surface";

export const dynamic = "force-dynamic";

export default function PlayerPage() {
  return <PlayerSurface screenId={DEFAULT_SCREEN_ID} deviceToken={DEFAULT_DEVICE_TOKEN} />;
}