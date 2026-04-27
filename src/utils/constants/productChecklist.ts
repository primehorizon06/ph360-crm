import { Step } from "../interfaces/productChecklist";

export const ALL_STEPS_APPROVAL: Step[] = [
  { id: 1, label: "Revisar información personal" },
  { id: 2, label: "Revisar formato de análisis" },
  { id: 3, label: "Revisar reportes de crédito" },
  {
    id: 4,
    label: "Evidencias de reporte no disponible (si aplica)",
    situational: true,
  },
  { id: 5, label: "Captura de verificación de dirección en USPS" },
  { id: 6, label: "Revisar el plan de pagos" },
];

export const PRE_CHECKED_FOR_SUBSEQUENT = [1, 5];
