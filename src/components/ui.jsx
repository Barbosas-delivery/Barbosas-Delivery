import { memo } from "react";

// Bloco 4: ajustes de layout e experiência por perfil. Cliente/entregador mobile-first; caixa/admin otimizados para tablet e desktop.
const Card = memo(function Card({ className = "", children, ...props }) {
  return <div className={className} {...props}>{children}</div>;
});

const CardContent = memo(function CardContent({ className = "", children, ...props }) {
  return <div className={className} {...props}>{children}</div>;
});

const Button = memo(function Button({ className = "", variant = "default", children, disabled = false, ...props }) {
  const hasCustomBg = /(?:^|\s)!?bg-/.test(className);
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";
  const variantClass =
    variant === "secondary"
      ? `${hasCustomBg ? "" : "bg-zinc-100 hover:bg-zinc-200"} text-zinc-950`
      : `${hasCustomBg ? "" : "bg-zinc-950 hover:bg-zinc-800"} text-white`;

  return (
    <button
      {...props}
      type={props.type || "button"}
      disabled={disabled}
      className={`inline-flex min-h-[44px] touch-manipulation items-center justify-center transition active:scale-[0.99] ${variantClass} ${className} ${disabledClass}`.trim()}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-1 text-inherit">{children}</span>
    </button>
  );
});

function getStableFocusKey(label = "", placeholder = "", type = "text") {
  return `${label}-${placeholder}-${type}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function keepInputFocused(event, focusKey) {
  const currentInput = event.currentTarget;
  const start = currentInput.selectionStart;
  const end = currentInput.selectionEnd;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  window.requestAnimationFrame(() => {
    const target = currentInput.isConnected ? currentInput : document.querySelector(`[data-focus-key="${focusKey}"]`);
    if (!target) return;
    if (document.activeElement !== target) target.focus({ preventScroll: true });
    try {
      if (typeof start === "number" && typeof end === "number") target.setSelectionRange(start, end);
    } catch {
      // Mantém o foco sem interromper a digitação caso o navegador não permita setSelectionRange.
    }
    window.scrollTo(scrollX, scrollY);
  });
}
const ICONS = {
  lock: "🔒",
  mail: "✉️",
  user: "👤",
  package: "📦",
  percent: "%",
  calendar: "⏱️",
  chart: "📊",
  barcode: "▥",
  truck: "🛵",
  users: "👥",
  search: "🔎",
  plus: "+",
  check: "✅",
  alert: "⚠️",
  logout: "↪",
  shield: "🛡️",
  eye: "👁️",
  eyeOff: "🙈",
  pin: "📍",
  phone: "☎️",
  save: "💾",
  money: "💰",
  bell: "🔔",
  tools: "🧰",
};

function DarkLoginInput({ icon, label, value, onChange, placeholder, type = "text", rightButton = null }) {
  const focusKey = getStableFocusKey(label, placeholder, type);
  return (
    <div>
      <label className="text-sm text-zinc-300">{label}</label>
      <div className="mt-2 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3">
        <Icon name={icon} className="text-zinc-400" />
        <input
          data-focus-key={focusKey}
          value={value ?? ""}
          onChange={(event) => {
            keepInputFocused(event, focusKey);
            onChange?.(event.target.value);
          }}
          placeholder={placeholder}
          type={type}
          className="min-h-[44px] bg-transparent text-base outline-none text-white w-full placeholder:text-zinc-500"
        />
        {rightButton}
      </div>
    </div>
  );
}

function Icon({ name, className = "" }) {
  return <span aria-hidden="true" className={`inline-flex h-5 min-w-5 items-center justify-center text-base leading-none ${className}`}>{ICONS[name] || "•"}</span>;
}

function StoreLogo({ size = "h-14 w-14", logoUrl = "", storeName = "BARBOSAS LANCHES" }) {
  const cleanLogoUrl = String(logoUrl || "").trim();
  const label = String(storeName || "BARBOSAS LANCHES").trim() || "BARBOSAS LANCHES";
  if (cleanLogoUrl) {
    return (
      <div aria-label={`Logo ${label}`} className={`${size} shrink-0 rounded-full bg-white text-black border border-yellow-200 shadow-sm overflow-hidden flex items-center justify-center`}>
        <img src={cleanLogoUrl} alt={`Logo ${label}`} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      aria-label={`Logo ${label}`}
      className={`${size} shrink-0 rounded-full bg-yellow-300 text-black border border-yellow-200 shadow-sm flex flex-col items-center justify-center overflow-hidden px-1`}
    >
      <span className="text-[5px] font-medium tracking-tight leading-none">
        Delivery
      </span>

      <span className="text-[8px] font-extrabold tracking-[-0.05em] leading-none mt-[1px] text-center">
        {label.slice(0, 16).toUpperCase()}
      </span>

      <div className="mt-[2px] h-[1px] w-6 bg-black/30 rounded-full" />

      <span className="text-[7px] leading-none mt-[2px]">🍔</span>
    </div>
  );
}

function Title({ title, subtitle }) {
  return <div className="min-w-0"><h2 className="text-xl md:text-3xl font-bold tracking-tight leading-tight">{title}</h2><p className="text-zinc-500 mt-1 text-sm md:text-base">{subtitle}</p></div>;
}

function Metric({ title, value, icon }) {
  return <Card className="rounded-3xl border-zinc-200 shadow-sm"><CardContent className="p-4 md:p-5"><div className="h-9 w-9 md:h-10 md:w-10 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 md:mb-4"><Icon name={icon} /></div><p className="text-xs md:text-sm text-zinc-500">{title}</p><p className="text-xl md:text-2xl font-bold mt-1 break-words">{value}</p></CardContent></Card>;
}

function CardBox({ children }) {
  return <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden"><CardContent className="p-4 md:p-5 min-w-0">{children}</CardContent></Card>;
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  const focusKey = getStableFocusKey(label, placeholder, type);
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        data-focus-key={focusKey}
        type={type}
        value={value ?? ""}
        onChange={(event) => {
          keepInputFocused(event, focusKey);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-950/20"
      />
    </label>
  );
}

function DarkInput({ label, value, onChange, type = "text", placeholder = "" }) {
  const focusKey = getStableFocusKey(label, placeholder, type);
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <input
        data-focus-key={focusKey}
        type={type}
        value={value ?? ""}
        onChange={(event) => {
          keepInputFocused(event, focusKey);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        className="mt-1 w-full min-h-[48px] rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-base text-white outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-white/20"
      />
    </label>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  const focusKey = getStableFocusKey("Busca", placeholder, "search");
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 px-4 py-2 flex items-center gap-3 shadow-sm">
      <Icon name="search" className="text-zinc-400" />
      <input
        data-focus-key={focusKey}
        value={value ?? ""}
        onChange={(event) => {
          keepInputFocused(event, focusKey);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        className="w-full outline-none bg-transparent"
      />
    </div>
  );
}


export { Card, CardContent, Button, DarkLoginInput, Icon, StoreLogo, Title, Metric, CardBox, Input, DarkInput, SearchBox };
