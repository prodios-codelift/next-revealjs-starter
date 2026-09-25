import { deckFontVariables } from "@/deck/fonts";
import { Presentation } from "@/deck/presentation";

export default function Home() {
  return (
    <div className={`deck-root ${deckFontVariables}`}>
      <Presentation />
    </div>
  );
}
