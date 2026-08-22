import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateTresAreasDto } from './update-tres-areas.dto.js';

describe('UpdateTresAreasDto', () => {
  it('trims a title before validating and retaining it', async () => {
    const dto = plainToInstance(UpdateTresAreasDto, {
      title: '  Updated title  ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.title).toBe('Updated title');
  });

  it.each(['area1', 'area2', 'area3', 'combinationKey', 'id'])(
    'rejects immutable identity field %s with Nest whitelist semantics',
    async (field) => {
      const errors = await validate(
        plainToInstance(UpdateTresAreasDto, { [field]: 'immutable' }),
        { whitelist: true, forbidNonWhitelisted: true },
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        property: field,
        constraints: { whitelistValidation: expect.any(String) },
      });
    },
  );

  it('rejects blank and oversized titles', async () => {
    const blankTitleErrors = await validate(
      plainToInstance(UpdateTresAreasDto, { title: '   ' }),
    );
    const oversizedTitleErrors = await validate(
      plainToInstance(UpdateTresAreasDto, { title: 'a'.repeat(256) }),
    );

    expect(blankTitleErrors).toHaveLength(1);
    expect(oversizedTitleErrors).toHaveLength(1);
  });
});
