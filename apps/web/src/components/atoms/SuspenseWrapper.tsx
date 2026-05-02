import { Suspense, ReactNode } from "react";
import { Spinner } from "./Spinner";

interface SuspenseWrapperProps {
  children: ReactNode;
}

export const SuspenseWrapper = ({ children }: SuspenseWrapperProps) => {
  return (
    <Suspense 
      fallback={
        <div className="flex justify-center items-center w-full h-screen">
          <Spinner size="lg" />
          </div>
        }>
      {children}
    </Suspense>
  );
};