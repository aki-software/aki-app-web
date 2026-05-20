import { ArrowLeft, Download } from "lucide-react";
import { Button } from "../../../../components/atoms/Button";
import { SessionReportButton } from "./SessionReportButton";

interface SessionDetailHeaderProps {
  patientName: string;
  hollandCode: string;
  sessionId: string;
  onBack: () => void;
  onDownloadPdf: () => void;
}

export const SessionDetailHeader = ({
  patientName,
  hollandCode,
  sessionId,
  onBack,
  onDownloadPdf,
  patientEmail,
}: SessionDetailHeaderProps & { patientEmail?: string }) => {
  const hasEmailInName = patientName.includes('(') && patientName.includes('@');
  const nameParts = patientName.split('(');
  const displayName = hasEmailInName ? nameParts[0].trim() : patientName;
  const displayEmail = hasEmailInName 
    ? nameParts[1].replace(')', '').trim() 
    : patientEmail;

  return (
    <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between border-b border-app-border pb-16 mb-16">
      <div className="flex items-center gap-10">
        <Button 
          variant="outline" 
          className="h-16 w-16 !p-0 !rounded-[1.5rem]" 
          onClick={onBack} 
          title="Volver"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="h-2 w-10 bg-app-primary rounded-full"></div>
            <span className="app-label">DETALLE DEL TEST</span>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-5xl font-black tracking-tighter text-app-text-main leading-none uppercase">
              {displayName}
            </h1>
            {displayEmail && (
              <span className="text-app-text-muted font-medium tracking-wide mt-1 lowercase">
                {displayEmail}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="hidden lg:flex flex-col items-end border-r border-app-border pr-12">
          <span className="app-label mb-3 opacity-40">CÓDIGO HOLLAND</span>
          <span className="app-value !text-4xl">{hollandCode}</span>
        </div>
        <div className="flex items-start gap-4">
          <Button 
            variant="outline"
            onClick={onDownloadPdf}
            title="Descargar reporte en PDF"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Descargar PDF</span>
          </Button>
          <SessionReportButton sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
};