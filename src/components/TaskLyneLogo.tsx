export default function TaskLyneLogo({ className = "", size = 48 }: { className?: string; size?: number }) {
  return (
    <span 
      className={`font-bold dark:text-white ${className}`}
      style={{ 
        fontFamily: "Inter, sans-serif",
        fontSize: size * 0.45,
        fontWeight: 700,
        color: "#FF7A00",
        letterSpacing: "-0.02em",
      }}
    >
      <span className="text-[#FF7A00] dark:text-[#FF7A00]">Task</span>
      <span className="text-gray-900 dark:text-white">Lyne</span>
    </span>
  );
}
