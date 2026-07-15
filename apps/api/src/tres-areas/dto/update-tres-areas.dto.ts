import { IsArray, IsOptional, IsString } from 'class-validator';
import sanitizeHtml from 'sanitize-html';
import { Transform } from 'class-transformer';

export class UpdateTresAreasDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value) : value,
  )
  narrative?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? sanitizeHtml(v) : v));
    }
    return value;
  })
  tendencies?: string[];

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value) : value,
  )
  possibleJobs?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value) : value,
  )
  relatedProfessions?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((section) => {
        if (typeof section === 'object' && section !== null) {
          const items = Array.isArray(section.items)
            ? section.items
                .map((i: any) =>
                  typeof i === 'string'
                    ? sanitizeHtml(i, { allowedTags: [] })
                    : '',
                )
                .filter(Boolean)
            : [];
          return {
            title:
              typeof section.title === 'string'
                ? sanitizeHtml(section.title, { allowedTags: [] })
                : '',
            items,
          };
        }
        return section;
      });
    }
    return value;
  })
  customSections?: { title: string; items: string[] }[];
}
