import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...rest }: IconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function LogoIcon(props: IconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M 32 6 A 26 26 0 1 1 6.4 27.49"
        stroke="var(--infinity-light, #9165bc)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M 32 15.5 A 16.5 16.5 0 1 1 23.75 46.29"
        stroke="var(--eternity-steel, #5880b4)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <g stroke="var(--bg-surface)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 21 21 L 10 32 L 21 43 M 43 21 L 54 32 L 43 43 M 36 18 L 28 46" />
      </g>
      <g strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M 21 21 L 10 32 L 21 43 M 43 21 L 54 32 L 43 43"
          stroke="var(--text-primary)"
        />
        <path d="M 36 18 L 28 46" stroke="var(--accent)" />
      </g>
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
    </IconBase>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.2 9.9A5.5 5.5 0 0 1 6.1 2.8a5.5 5.5 0 1 0 7.1 7.1Z" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase width="12" height="12" {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </IconBase>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.75A1.25 1.25 0 0 0 9.25 2.5h-5.5A1.25 1.25 0 0 0 2.5 3.75v5.5a1.25 1.25 0 0 0 1.25 1.25H5.5" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.25 8.5 6.5 11.75 12.75 4.5" />
    </IconBase>
  );
}

export function FormatIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 4h11M4.5 8h9M4.5 12h6" />
    </IconBase>
  );
}

export function FolderOpenIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 4.25A1.25 1.25 0 0 1 3.25 3h3l1.25 1.5h5.25A1.25 1.25 0 0 1 14 5.75v6A1.25 1.25 0 0 1 12.75 13h-9.5A1.25 1.25 0 0 1 2 11.75v-7.5Z" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 2.5v7.5M5 7.5 8 10.5l3-3M2.75 13h10.5" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.2 10.2 3.3 3.3" />
    </IconBase>
  );
}

export function SidebarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M9.75 2.5v11" />
    </IconBase>
  );
}

export function ChevronIcon({ open = false, ...rest }: IconProps & { open?: boolean }) {
  return (
    <IconBase
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
      {...rest}
    >
      <path d="m6 4 4 4-4 4" />
    </IconBase>
  );
}

export function ErrorCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="5.75" />
      <path d="m6 6 4 4M10 6l-4 4" />
    </IconBase>
  );
}

export function WarningTriangleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 2.25 14 13H2L8 2.25Z" />
      <path d="M8 6.25v3M8 11.25h.01" />
    </IconBase>
  );
}

export function InfoCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 7.25v3.5M8 5.25h.01" />
    </IconBase>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <IconBase width="12" height="12" {...props}>
      <path d="M6.5 3.5H3.75A1.25 1.25 0 0 0 2.5 4.75v7.5A1.25 1.25 0 0 0 3.75 13.5h7.5a1.25 1.25 0 0 0 1.25-1.25V9.5M9 2.5h4.5V7M7.25 8.75 13.5 2.5" />
    </IconBase>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <IconBase width="12" height="12" {...props}>
      <path d="M8 12.5V3.5M4.5 7 8 3.5 11.5 7" />
    </IconBase>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <IconBase width="12" height="12" {...props}>
      <path d="M8 3.5v9M4.5 9 8 12.5 11.5 9" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase width="12" height="12" {...props}>
      <path d="M2.5 4.25h11M6 4.25V2.75h4v1.5M4 4.25l.7 8.5a1 1 0 0 0 1 .95h4.6a1 1 0 0 0 1-.95l.7-8.5" />
    </IconBase>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4.5 3.25 8 4.75-8 4.75V3.25Z" />
    </IconBase>
  );
}

export function StepForwardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3.5 3.5 6.25 4.5-6.25 4.5V3.5ZM12 3.5v9" />
    </IconBase>
  );
}

export function SkipForwardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m2.5 3.75 5 4.25-5 4.25V3.75ZM8.25 3.75l5 4.25-5 4.25V3.75Z" />
    </IconBase>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 8a5 5 0 1 0 1.46-3.54L3 6M3 2.75V6h3.25" />
    </IconBase>
  );
}

export function BlocksIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2" y="2.25" width="5" height="4.5" rx="1" />
      <rect x="2" y="9.25" width="12" height="4.5" rx="1" />
      <rect x="9" y="2.25" width="5" height="4.5" rx="1" />
    </IconBase>
  );
}

export function TerminalIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="m4.75 6 2.25 2-2.25 2M8.25 10h3" />
    </IconBase>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 3.25A1.25 1.25 0 0 1 3.75 2H8v11.5H3.75a1.25 1.25 0 0 0-1.25 1V3.25ZM13.5 3.25A1.25 1.25 0 0 0 12.25 2H8v11.5h4.25a1.25 1.25 0 0 1 1.25 1V3.25Z" />
    </IconBase>
  );
}
