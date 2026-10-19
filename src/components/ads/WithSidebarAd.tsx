import AdSlot from "./AdSlot";

/** Content with a sticky ad column on wide desktop screens only. */
export default function WithSidebarAd({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl justify-center gap-8 px-4">
      <div className="min-w-0 max-w-4xl flex-1">{children}</div>
      <div className="hidden w-[300px] shrink-0 pt-12 xl:block">
        <div className="sticky top-24">
          <AdSlot placement="sidebar" />
        </div>
      </div>
    </div>
  );
}
