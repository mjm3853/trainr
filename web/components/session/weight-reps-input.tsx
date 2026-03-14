"use client";

import { Button } from "@/components/ui/button";

interface StepperRowProps {
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
  unit?: string;
}

function StepperRow({ label, value, step, min = 0, onChange, unit }: StepperRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-muted-foreground">{label}</span>
      <Button
        variant="outline"
        className="size-14 shrink-0 text-xl font-bold"
        onClick={() => onChange(Math.max(min, value - step))}
      >
        &minus;
      </Button>
      <div className="flex-1 text-center">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        {unit && (
          <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
      <Button
        variant="outline"
        className="size-14 shrink-0 text-xl font-bold"
        onClick={() => onChange(value + step)}
      >
        +
      </Button>
    </div>
  );
}

interface WeightRepsInputProps {
  weight: number;
  reps: number;
  unit: "lbs" | "kg";
  weightStep: number;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
}

export function WeightRepsInput({
  weight,
  reps,
  unit,
  weightStep,
  onWeightChange,
  onRepsChange,
}: WeightRepsInputProps) {
  return (
    <div className="space-y-4">
      <StepperRow
        label="Weight"
        value={weight}
        step={weightStep}
        min={0}
        onChange={onWeightChange}
        unit={unit}
      />
      <StepperRow
        label="Reps"
        value={reps}
        step={1}
        min={0}
        onChange={onRepsChange}
      />
    </div>
  );
}

interface SingleStepperProps {
  label: string;
  value: number;
  step?: number;
  min?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function SingleStepper({
  label,
  value,
  step = 1,
  min = 0,
  unit,
  onChange,
}: SingleStepperProps) {
  return (
    <StepperRow
      label={label}
      value={value}
      step={step}
      min={min}
      onChange={onChange}
      unit={unit}
    />
  );
}
