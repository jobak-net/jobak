import { AiToolGate, CvReviewView } from "@/frontend/modules/ai-tools";
import { loadCvReviewPage } from "@/frontend/modules/ai-tools/server";

export default async function CvReviewPage() {
  const { unlocked, defaults, ai, skill, savedCvs } = await loadCvReviewPage();
  return (
    <AiToolGate feature="CV review" unlocked={unlocked}>
      <CvReviewView defaults={defaults} ai={ai} skill={skill} savedCvs={savedCvs} />
    </AiToolGate>
  );
}
