// Códigos válidos
export type StatusCode = 0 | 1 | 2 | 3 | 4 | 5;

// Mapa de etiquetas (tipado con `satisfies` para que te avise si falta alguno)
export const STATUS_LABELS = {
    0: "Informativo con atención",
    1: "En tiempo — respondido (verde)",
    2: "En tiempo — pendiente (amarillo)",
    3: "Vencido — pendiente (naranja)",
    4: "Fuera de tiempo — respondido (rojo)",
    5: "Otro",
} satisfies Record<StatusCode, string>;

// Helper para usar cómodo en componentes
export function getStatusLabel(code: number | null | undefined): string {
    return STATUS_LABELS[(code ?? 5) as StatusCode] ?? STATUS_LABELS[5];
}
