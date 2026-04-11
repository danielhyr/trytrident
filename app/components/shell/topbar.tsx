interface TopbarProps {
  tenantName: string;
}

export function Topbar({ tenantName }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[#DDE1E8] bg-[#EEF0F4] px-5">
      <span className="text-sm font-medium text-[#64748B]">{tenantName}</span>
    </header>
  );
}
