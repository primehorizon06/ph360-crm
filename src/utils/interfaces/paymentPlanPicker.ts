export interface Installment {
  number: number;
  date: Date;
  amount: string;
}

export interface Props {
  value: Installment[];
  onChange: (installments: Installment[]) => void;
  error?: string;
}