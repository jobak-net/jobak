import { AiToolGate, CvMatchView } from "@/frontend/modules/ai-tools";
import { loadAiAccess } from "@/frontend/modules/ai-tools/server";

export default async function CvMatchPage() {
  const { unlocked } = await loadAiAccess();
  return (
    <AiToolGate feature="CV match" unlocked={unlocked}>
      <CvMatchView />
    </AiToolGate>
  );
}
