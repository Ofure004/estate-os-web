import { navigation, type ScreenId } from "./navigation";
import { ScreenIcon } from "./screen-icon";

const copy: Record<ScreenId, { title: string; description: string }> = {
  overview: { title: "Your community overview, coming together", description: "A home for your estate’s access management. Visitor and gate updates will appear here as these features become available." },
  visitors: { title: "A space for every visit", description: "Visitor invitations and visit details will live here. This workspace is being prepared for your community." },
  gate: { title: "Ready for the next arrival", description: "Your gate workspace will bring visitor verification, check-in and check-out together here." },
  access: { title: "Every arrival. Every departure.", description: "On-site visitors and recent gate activity will appear here, giving you a clear view of access across your estate." },
};

export function PagePlaceholder({ screen }: { screen: ScreenId }) {
  const item = navigation.find((item) => item.id === screen)!;
  return (
    <section className="shell-enter overflow-hidden rounded-2xl border bg-card" aria-labelledby="placeholder-title">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <h2 className="text-[14px] font-bold">{item.label}</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground">Coming soon</span>
      </div>
      <div className="flex min-h-[380px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[430px]">
        <div className="mb-6 flex size-16 items-center justify-center rounded-[20px] border border-primary/10 bg-accent text-accent-foreground">
          <ScreenIcon icon={item.icon} className="size-7" />
        </div>
        <p className="mb-2.5 text-[10px] font-bold tracking-[0.14em] text-accent-foreground">ACCESS MANAGEMENT</p>
        <h3 id="placeholder-title" className="max-w-md text-xl font-bold tracking-[-0.035em] sm:text-[23px]">{copy[screen].title}</h3>
        <p className="mt-3 max-w-[390px] text-[13px] leading-6 text-muted-foreground">{copy[screen].description}</p>
      </div>
    </section>
  );
}
