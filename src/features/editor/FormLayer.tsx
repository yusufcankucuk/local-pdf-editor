import { useEffect, useState } from "react";
import type { PageViewport, PDFDocumentProxy } from "pdfjs-dist";
import type { Overlay } from "./model";
interface Field {
  name: string;
  type: "text" | "checkbox" | "choice";
  rect: number[];
  value: string | boolean;
  options: { value: string; label: string }[];
  readOnly: boolean;
  maxLength: number;
}

export function FormLayer({
  pdf,
  page,
  viewport,
  overlays,
  editable,
  onChange,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  viewport: PageViewport;
  overlays: Overlay[];
  editable: boolean;
  onChange: (name: string, value: string | boolean) => void;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  useEffect(() => {
    let cancelled = false;
    void pdf
      .getPage(page)
      .then((pdfPage) => pdfPage.getAnnotations())
      .then((annotations) => {
        if (cancelled) return;
        const fields: Field[] = [];
        for (const data of annotations) {
          if (
            typeof data.fieldName !== "string" ||
            !Array.isArray(data.rect) ||
            data.rect.length !== 4 ||
            !data.rect.every(
              (value: unknown) =>
                typeof value === "number" && Number.isFinite(value),
            )
          )
            continue;
          const type =
            data.fieldType === "Tx"
              ? "text"
              : data.fieldType === "Btn" && data.checkBox
                ? "checkbox"
                : data.fieldType === "Ch" && !data.multiSelect
                  ? "choice"
                  : null;
          if (!type) continue;
          fields.push({
            name: data.fieldName,
            type,
            rect: data.rect,
            value:
              type === "checkbox"
                ? data.fieldValue !== undefined && data.fieldValue !== "Off"
                : typeof data.fieldValue === "string"
                  ? data.fieldValue
                  : Array.isArray(data.fieldValue)
                    ? String(data.fieldValue[0] ?? "")
                    : "",
            options: Array.isArray(data.options)
              ? data.options
                  .filter(
                    (option: { exportValue: unknown; displayValue: unknown }) =>
                      typeof option.exportValue === "string" &&
                      typeof option.displayValue === "string",
                  )
                  .map(
                    (option: {
                      exportValue: string;
                      displayValue: string;
                    }) => ({
                      value: option.exportValue,
                      label: option.displayValue,
                    }),
                  )
              : [],
            readOnly: Boolean(data.readOnly),
            maxLength:
              typeof data.maxLen === "number" && data.maxLen > 0
                ? Math.min(data.maxLen, 5000)
                : 5000,
          });
        }
        setFields(fields);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, page]);
  const values = new Map(
    overlays
      .filter((item) => item.kind === "form")
      .map((item) => [item.name, item.value]),
  );
  return (
    <div
      className={`form-overlay ${editable ? "form-editable" : ""}`}
      aria-label="PDF form alanları"
    >
      {fields.map((field, index) => {
        const edited = values.has(field.name);
        if (!editable && !edited) return null;
        const value = values.get(field.name) ?? field.value;
        const [x, y] = viewport.convertToViewportPoint(
          field.rect[0],
          field.rect[3],
        );
        const [a, b, c, d] = viewport.transform;
        const style = {
          left: 0,
          top: 0,
          width: field.rect[2] - field.rect[0],
          height: field.rect[3] - field.rect[1],
          transform: `matrix(${a},${b},${-c},${-d},${x},${y})`,
          transformOrigin: "0 0",
          fontSize: Math.max(
            8,
            Math.min(14, (field.rect[3] - field.rect[1]) * 0.45),
          ),
        };
        const props = {
          style,
          "aria-label": field.name,
          disabled: !editable || field.readOnly,
        };
        return field.type === "checkbox" ? (
          <input
            key={index}
            {...props}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
        ) : field.type === "choice" ? (
          <select
            key={index}
            {...props}
            value={String(value)}
            onChange={(event) => onChange(field.name, event.target.value)}
          >
            {!field.options.some((option) => option.value === value) && (
              <option value={String(value)}>{String(value) || "Seçin"}</option>
            )}
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            key={`${index}-${String(value)}`}
            {...props}
            type="text"
            maxLength={field.maxLength}
            defaultValue={String(value)}
            onBlur={(event) => {
              if (event.target.value !== String(value))
                onChange(field.name, event.target.value);
            }}
          />
        );
      })}
      {editable && !fields.length && (
        <span className="form-empty-message">
          Bu sayfada desteklenen bir form alanı yok.
        </span>
      )}
    </div>
  );
}
