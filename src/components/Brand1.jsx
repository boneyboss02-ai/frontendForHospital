// Simple tooth-icon wordmark used wherever the app shows its brand
// (sidebar header, login screen, print headers). Kept as one component
// so the mark stays consistent and is easy to swap for a real logo later.
export default function Brand({ size = 26, className = '', style }) {
  return (
    <svg
      className={`tooth-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 12c-6 0-9 3-13 3-4.5 0-7 3.5-7 8.5 0 5 2 9 3.5 14.5 1.2 4.4 1.8 10.5 5.5 10.5 3.2 0 3.2-7 4.5-11 .8-2.4 1.6-4 2.5-4 1 0 1.7 1.6 2.5 4 1.3 4 1.3 11 4.5 11 3.7 0 4.3-6.1 5.5-10.5C42 33.5 44 29.5 44 24.5 44 19.5 41.5 16 37 16c-4 0-7-4-13-4Z"
        fill="currentColor"
      />
    </svg>
  );
}
