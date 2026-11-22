import { AiToolGate, InterviewPrepView } from "@/frontend/modules/ai-tools";
import { loadAiAccess } from "@/frontend/modules/ai-tools/server";

export default async function InterviewPrepPage() {
  const { unlocked } = await loadAiAccess();
  return (
    <AiToolGate feature="interview prep" unlocked={unlocked}>
      <InterviewPrepView />
    </AiToolGate>
  );
}
