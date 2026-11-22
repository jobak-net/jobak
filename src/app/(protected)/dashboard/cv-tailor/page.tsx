import { AiToolGate, CvTailorView } from "@/frontend/modules/ai-tools";
import { loadAiAccess } from "@/frontend/modules/ai-tools/server";

export default async function CvTailorPage() {
  const { unlocked } = await loadAiAccess();
  return (
    <AiToolGate feature="CV tailoring" unlocked={unlocked}>
      <CvTailorView />
    </AiToolGate>
  );
}
