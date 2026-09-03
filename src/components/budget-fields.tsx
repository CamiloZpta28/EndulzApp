"use client";

import { useId, useState } from "react";
import { Candy, Gift } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  currencyMeta,
  groupDigits,
} from "@/lib/currencies";

/**
 * Moneda + los dos topes, juntos porque el formato de los montos depende de
 * la moneda escogida: cambiarla reagrupa los miles al instante.
 *
 * Cada monto viaja al servidor como dígitos puros, no como el texto formateado
 * — así el servidor nunca tiene que adivinar si un "." separa miles o
 * decimales.
 */
export function BudgetFields({
  defaultCurrency = DEFAULT_CURRENCY,
  defaultEndulzada = 0,
  defaultRegalo = 0,
}: {
  defaultCurrency?: string;
  defaultEndulzada?: number;
  defaultRegalo?: number;
}) {
  const [currency, setCurrency] = useState(
    currencyMeta(defaultCurrency).code as string,
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="currency-trigger">Moneda</Label>
        <Select
          name="currency"
          value={currency}
          onValueChange={(value) => {
            // Base UI puede entregar `null` al deseleccionar; ignóralo antes
            // de que un String(null) meta "null" en el formulario.
            if (typeof value === "string") setCurrency(value);
          }}
        >
          <SelectTrigger id="currency-trigger" className="w-full">
            {/* Sin esta función el trigger mostraría el código crudo. */}
            <SelectValue>
              {(value) => {
                const meta = currencyMeta(String(value));
                return `${meta.code} · ${meta.label}`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} · {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MoneyField
          name="budget_endulzada"
          label="Tope endulzada"
          icon={<Candy className="size-3.5" style={{ color: "var(--endulzada)" }} />}
          currency={currency}
          defaultValue={defaultEndulzada}
        />
        <MoneyField
          name="budget_regalo"
          label="Tope regalo"
          icon={<Gift className="size-3.5" style={{ color: "var(--regalo)" }} />}
          currency={currency}
          defaultValue={defaultRegalo}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Montos redondos, sin centavos. Deja en 0 para no poner tope.
      </p>
    </div>
  );
}

function MoneyField({
  name,
  label,
  icon,
  currency,
  defaultValue,
}: {
  name: string;
  label: string;
  icon: React.ReactNode;
  currency: string;
  defaultValue: number;
}) {
  const id = useId();
  // El estado es solo dígitos; el formato se deriva de él en cada render, así
  // que cambiar de moneda reagrupa sin tocar el valor.
  const [digits, setDigits] = useState(
    defaultValue > 0 ? String(Math.round(defaultValue)) : "",
  );
  const meta = currencyMeta(currency);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {icon}
        {label}
      </Label>

      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm tabular-nums">
          {meta.symbol}
        </span>
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          className="pl-10 text-right tabular-nums"
          placeholder="0"
          value={groupDigits(digits, currency)}
          onChange={(event) =>
            setDigits(event.target.value.replace(/\D/g, "").slice(0, 10))
          }
        />
      </div>

      {/* Lo que realmente lee el Server Action. */}
      <input type="hidden" name={name} value={digits || "0"} />
    </div>
  );
}
