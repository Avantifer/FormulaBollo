import { decodeJwtPayload } from './jwt';

describe('decodeJwtPayload', () => {
  it('decodes unpadded base64url payloads as UTF-8', () => {
    const payload = { sub: 'Peña Muñoz, áéíóú', text: '¿ÿ?' };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeJwtPayload(`header.${encoded}.signature`)).toEqual(payload);
  });

  it('rejects tokens with only two parts', () => {
    expect(decodeJwtPayload(`header.${btoa('{}')}`)).toBeNull();
  });

  it('rejects non-JSON payloads', () => {
    expect(decodeJwtPayload(`header.${btoa('not json')}.signature`)).toBeNull();
  });

  it('rejects invalid base64', () => {
    expect(decodeJwtPayload('header.!!!.signature')).toBeNull();
  });

  it('rejects non-object payloads and invalid UTF-8', () => {
    for (const encoded of [btoa('null'), btoa('[]'), btoa('1'), btoa('\xff')]) {
      expect(decodeJwtPayload(`header.${encoded}.signature`)).toBeNull();
    }
  });
});
