import { InterviewPrepView } from "@/frontend/modules/ai-tools";
import { loadInterviewPrepPage } from "@/frontend/modules/ai-tools/server";

export default async function InterviewPrepPage() {
  const { accountId, candidateName } = await loadInterviewPrepPage();
  return <InterviewPrepView accountId={accountId} candidateName={candidateName} />;
}
