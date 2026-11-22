import { AiToolGate, CoverLetterView } from "@/frontend/modules/ai-tools";
import { loadAiAccess } from "@/frontend/modules/ai-tools/server";

export default async function CoverLetterPage() {
  const { unlocked } = await loadAiAccess();
  return (
    <AiToolGate feature="cover letters" unlocked={unlocked}>
      <CoverLetterView />
    </AiToolGate>
  );
}
