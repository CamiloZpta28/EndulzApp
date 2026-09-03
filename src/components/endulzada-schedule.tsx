"use client";

import { useState } from "react";
import { Candy, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Cuántas endulzadas van a haber y cuándo.
 *
 * Una lista de fechas y no "cada N semanas": los parches reales las mueven
 * (el puente, el cierre de mes, la semana que nadie va a la oficina), así que
 * una regla automática habría que corregirla a mano de todas formas.
 *
 * Cada fecha va como un `endulzada_dates` aparte, y el Server Action las lee
 * con `formData.getAll(...)`.
 */
export function EndulzadaSchedule({
  defaultDates = [],
}: {
  defaultDates?: string[];
}) {
  // Las filas llevan una llave estable propia: usar el índice hacía que al
  // borrar la de la mitad React reutilizara el input y la fecha "saltara" de
  // fila.
  const [rows, setRows] = useState(() =>
    defaultDates.map((date, index) => ({ key: `inicial-${index}`, date })),
  );

  const add = () =>
    setRows((current) => [
      ...current,
      { key: `nueva-${Date.now()}-${current.length}`, date: "" },
    ]);

  const remove = (key: string) =>
    setRows((current) => current.filter((row) => row.key !== key));

  const change = (key: string, date: string) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, date } : row)),
    );

  const filled = rows.filter((row) => row.date).length;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Candy className="size-3.5" style={{ color: "var(--endulzada)" }} aria-hidden />
        Endulzadas
        {filled > 0 && (
          <span className="text-muted-foreground font-normal">
            · {filled === 1 ? "1 fecha" : `${filled} fechas`}
          </span>
        )}
      </Label>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Todavía no hay endulzadas agendadas.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.key} className="flex items-center gap-2">
              <span className="text-muted-foreground w-5 shrink-0 text-right text-xs tabular-nums">
                {index + 1}.
              </span>
              <Input
                type="date"
                name="endulzada_dates"
                value={row.date}
                onChange={(event) => change(row.key, event.target.value)}
                aria-label={`Fecha de la endulzada ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(row.key)}
                aria-label={`Quitar la endulzada ${index + 1}`}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="size-3.5" aria-hidden />
        Agregar endulzada
      </Button>

      <p className="text-muted-foreground text-xs">
        En la tarjeta del parche se ve la próxima que no haya pasado.
      </p>
    </div>
  );
}
