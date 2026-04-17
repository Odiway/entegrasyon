import { requireUser, json, err } from '@/lib/auth-utils';
import { getRulesSummary, SIPARIS_MAP, DAGITIM_MAP, UZMANLIK_KEYWORDS, KALEM_TIPI_OPTIONS, BIRIM_OPTIONS } from '@/lib/rules';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'admin') {
      return err('Sadece admin erişebilir', 403);
    }

    const summary = getRulesSummary();

    return json({
      ...summary,
      siparisMap: SIPARIS_MAP,
      dagitimMap: DAGITIM_MAP,
      uzmanlikKeywords: UZMANLIK_KEYWORDS,
      kalemTipiOptions: KALEM_TIPI_OPTIONS,
      birimOptions: BIRIM_OPTIONS,
    });
  } catch {
    return err('Unauthorized', 401);
  }
}
