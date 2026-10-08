import { useEffect, useRef, useState } from "react";
import { LockKeyhole, X } from "lucide-react";
import { IconButton } from "./IconButton";

export function PasswordDialog({
  incorrect,
  resolve,
}: {
  incorrect: boolean;
  resolve: (password: string | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="info-dialog"
      aria-labelledby="password-title"
      onCancel={(event) => {
        event.preventDefault();
        resolve(null);
      }}
    >
      <div className="dialog-heading">
        <span className="dialog-icon">
          <LockKeyhole size={24} />
        </span>
        <IconButton
          label="Şifre girişini iptal et"
          onClick={() => resolve(null)}
        >
          <X size={20} />
        </IconButton>
      </div>
      <h2 id="password-title">Belge şifresini girin.</h2>
      <p>
        Şifreniz yalnızca bu cihazda kullanılır ve saklanmaz. Şifreli belgeler
        şu anda salt okunur açılır.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const password = value;
          setValue("");
          resolve(password);
        }}
      >
        <label className="password-field">
          PDF şifresi
          <input
            type="password"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        {incorrect && (
          <p className="tool-error" role="alert">
            Şifre doğru değil. Tekrar deneyin.
          </p>
        )}
        <button className="button button-dark dialog-done" disabled={!value}>
          Belgeyi aç
        </button>
      </form>
    </dialog>
  );
}
