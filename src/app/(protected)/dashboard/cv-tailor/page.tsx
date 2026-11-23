import { AiToolGate, CvTailorView } from "@/frontend/modules/ai-tools";
import { loadCvTailorPage } from "@/frontend/modules/ai-tools/server";

export default async function CvTailorPage() {
  const { unlocked, name, ai, skill, savedCvs } = await loadCvTailorPage();
  return (
    <AiToolGate feature="CV tailoring" unlocked={unlocked}>
      <CvTailorView name={name} ai={ai} skill={skill} savedCvs={savedCvs} />
    </AiToolGate>
  );
}
