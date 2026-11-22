import { AiToolGate, CvReviewView } from "@/frontend/modules/ai-tools";
import { loadAiAccess } from "@/frontend/modules/ai-tools/server";

export default async function CvReviewPage() {
  const { unlocked } = await loadAiAccess();
  return (
    <AiToolGate feature="CV review" unlocked={unlocked}>
      <CvReviewView />
    </AiToolGate>
  );
}
