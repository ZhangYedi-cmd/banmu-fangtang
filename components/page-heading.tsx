import { Separator } from "@/components/ui/separator";

export function PageHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <Separator className="mt-6" />
    </div>
  );
}
