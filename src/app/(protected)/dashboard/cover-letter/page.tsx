import { AiToolGate, CoverLetterView } from "@/frontend/modules/ai-tools";
import { loadCoverLetterPage } from "@/frontend/modules/ai-tools/server";

export default async function CoverLetterPage() {
  const { unlocked, defaults, ai, skill } = await loadCoverLetterPage();
  return (
    <AiToolGate feature="cover letters" unlocked={unlocked}>
      <CoverLetterView defaults={defaults} ai={ai} skill={skill} />
    </AiToolGate>
  );
}
