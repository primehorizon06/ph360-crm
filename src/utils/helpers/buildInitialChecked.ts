import {
  ALL_STEPS_APPROVAL,
  PRE_CHECKED_FOR_SUBSEQUENT,
} from "../constants/productChecklist";

export function buildInitialChecked(
  isFirstProduct: boolean,
): Record<number, boolean> {
  const result: Record<number, boolean> = {};
  ALL_STEPS_APPROVAL.forEach((step) => {
    result[step.id] =
      !isFirstProduct && PRE_CHECKED_FOR_SUBSEQUENT.includes(step.id);
  });
  return result;
}
