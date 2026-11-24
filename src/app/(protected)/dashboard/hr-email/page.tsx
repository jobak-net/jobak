import { AiToolGate, HrEmailView } from "@/frontend/modules/ai-tools";
import { loadHrEmailPage } from "@/frontend/modules/ai-tools/server";

export default async function HrEmailPage() {
  const { unlocked, name, ai, skill, savedCvs } = await loadHrEmailPage();
  return (
    <AiToolGate feature="emails to HR" unlocked={unlocked}>
      <HrEmailView name={name} ai={ai} skill={skill} savedCvs={savedCvs} />
    </AiToolGate>
  );
}
