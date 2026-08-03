type StatusType = "loading" | "error" | "empty" | "success";

type StatusMessageProps = {
  type: StatusType;
  title: string;
  message?: string;
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
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  );
}