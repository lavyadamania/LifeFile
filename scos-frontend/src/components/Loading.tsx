import { Loader2 } from 'lucide-react';

export default function Loading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
