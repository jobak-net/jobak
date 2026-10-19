"use client";
import { useAutoRotate } from "@/frontend/hooks/ui/use-auto-rotate";
import { steps } from "./data";
import { StepsList } from "./steps-list";
import { CodePreview } from "./code-preview";

export function InteractiveSteps() {
  const { activeIndex: activeStep, setActiveIndex: setActiveStep } = useAutoRotate(steps.length, 5000);

  return (
    /*
      `*:min-w-0` is load-bearing: the code panel is a <pre>, whose min-content
      width is its longest unwrapped line. In a one-column grid that sized the
      track to ~500px on a 360px phone, pushing the step headings and copy off
      the right edge too. With the floor removed the track fits the viewport
      and the code scrolls inside its own box.
    */
    <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 *:min-w-0">
      <StepsList 
        steps={steps} 
        activeStep={activeStep} 
        onStepClick={setActiveStep} 
      />
      <CodePreview 
        code={steps[activeStep].code} 
        activeStep={activeStep} 
      />
    </div>
  );
}
