import { ArrowLeft, Download } from "lucide-react";
import { Button } from "../../../../components/atoms/Button";
import { SessionReportButton } from "./SessionReportButton";

interface SessionDetailHeaderProps {
  patientName: string;
  sessionId: string;
  onBack: () => void;
  onDownloadPdf: () => void;
}

export const SessionDetailHeader = ({
  patientName,
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
    <div className="flex flex-col gap-6 sm:gap-10 lg:flex-row lg:items-center lg:justify-between border-b border-app-border pb-8 sm:pb-12 mb-8 sm:mb-12">
      <div className="flex items-center gap-4 sm:gap-8">
        <Button 
          variant="outline" 
          className="h-12 w-12 sm:h-14 sm:w-14 !p-0 !rounded-2xl sm:!rounded-[1.5rem] flex-shrink-0" 
          onClick={onBack} 
          title="Volver"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-6 sm:w-8 bg-app-primary rounded-full"></div>
            <span className="app-label !text-[10px] sm:!text-xs">DETALLE DEL TEST</span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-app-text-main leading-tight uppercase truncate">
              {displayName}
            </h1>
            {displayEmail && (
              <span className="text-app-text-muted text-xs sm:text-sm font-medium tracking-wide lowercase truncate">
                {displayEmail}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 self-end sm:self-auto">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onDownloadPdf}
            title="Descargar reporte en PDF"
            className="flex items-center gap-2"
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