import { TemplateRendererService } from './template-renderer.service';

type PreviewPayload = Record<string, unknown>;

const IMMUTABLE_SUBTITLES = [
  'COMPETENCIAS IMPORTANTES PARA DESEMPEÑARSE EN EL ÁREA',
  'TAMBIÉN PUEDE INCLUIR PROFESIONES MÁS TÉCNICAS O FORMALES COMO',
  'ALGUNAS OCUPACIONES QUE SE VINCULAR AL ÁREA',
] as const;

function createPayload(content: string): PreviewPayload {
  return {
    fontFaceCss: '',
    logoDataUri: 'data:image/png;base64,preview',
    patientName: `Paciente ${content}`,
    patientEmail: `${content.toLowerCase()}@example.com`,
    topResults: [
      {
        categoryId: 'ART',
        title: `Área ${content}`,
        percentage: 80,
        description: `Descripción ${content}`,
        parsedBlocks: [
          { subtitle: 'Descripción breve', content: `Texto ${content}` },
          {
            subtitle: 'Competencias importantes',
            list: [`Competencia ${content}`],
          },
          { subtitle: 'Ocupaciones y oficios', list: [`Oficio ${content}`] },
          {
            subtitle: 'Profesiones técnicas o formales',
            list: [`Profesión ${content}`],
          },
        ],
      },
    ],
    bottomAreas: [{ title: `Área baja ${content}`, percentage: 20 }],
    summary: {
      rankedAreas: [{ title: `Área ${content}`, percentage: 80 }],
    },
    tripletInsight: {
      title: `Combinación ${content}`,
      narrative: `Narrativa ${content}`,
      competencies: [`Competencia ${content}`],
      possibleJobs: [`Ocupación ${content}`],
      relatedProfessions: [`Profesión ${content}`],
      keyInsight: `Clave ${content}`,
      customSections: [],
    },
  };
}

function extractStyleBlocks(html: string): string[] {
  return html.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? [];
}

function normalizeStructure(html: string): string {
  const body = html.match(/<body[\s\S]*<\/body>/)?.[0] ?? '';
  return body
    .replace(/>[^<]*</g, '><')
    .replace(/\s+(?:style|href)="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('TemplateRendererService PDF invariants', () => {
  it('keeps CSS, structure, and approved subtitles stable between sessions', () => {
    const service = new TemplateRendererService();
    const firstSession = service.renderTemplate(
      'report-pdf.pug',
      createPayload('PRIMERA'),
    );
    const secondSession = service.renderTemplate(
      'report-pdf.pug',
      createPayload('SEGUNDA'),
    );

    expect(extractStyleBlocks(firstSession)).toEqual(
      extractStyleBlocks(secondSession),
    );
    expect(normalizeStructure(firstSession)).toBe(
      normalizeStructure(secondSession),
    );

    for (const subtitle of IMMUTABLE_SUBTITLES) {
      expect(firstSession).toContain(`>${subtitle}<`);
      expect(secondSession).toContain(`>${subtitle}<`);
    }

    expect(firstSession).not.toContain('>COMPETENCIAS IMPORTANTES<');
    expect(firstSession).not.toContain('>PROFESIONES TÉCNICAS O FORMALES<');
    expect(firstSession).not.toContain('>OCUPACIONES Y OFICIOS<');
  });
});
