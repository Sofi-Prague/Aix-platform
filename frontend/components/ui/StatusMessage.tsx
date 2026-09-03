type StatusType =
  | "loading"
  | "error"
  | "empty"
  | "success";

type StatusMessageProps = {
  type: StatusType;
  title: string;
  message?: string;
};

const STATUS_ICONS: Record<
  StatusType,
  string
> = {
  loading: "…",
  error: "✕",
  empty: "○",
  success: "✓",
};

export function StatusMessage({
  type,
  title,
  message,
}: StatusMessageProps) {
  return (
    <div
      className="aix-status-message"
      data-status={type}
      role={
        type === "error"
          ? "alert"
          : "status"
      }
      aria-live="polite"
    >
      <strong>
        <span aria-hidden="true">
          {STATUS_ICONS[type]}{" "}
        </span>
        {title}
      </strong>

      {message && <p>{message}</p>}
    </div>
  );
}