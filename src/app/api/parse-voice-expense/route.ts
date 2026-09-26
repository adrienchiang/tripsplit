import { NextRequest, NextResponse } from 'next/server';
import { CurrencyCode, ExpenseCategory } from '@/lib/types';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const CURRENCIES: CurrencyCode[] = ['HKD', 'THB', 'USD', 'JPY', 'EUR', 'CNY', 'KRW'];
const CATEGORIES: ExpenseCategory[] = ['accommodation', 'transport', 'food', 'activities', 'shopping', 'others'];

interface MemberInput {
  id: string;
  name: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY 未設定' }, { status: 500 });
  }

  let body: {
    audioBase64: string;
    mimeType: string;
    members: MemberInput[];
    settlementCurrency: CurrencyCode;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }
  const { audioBase64, mimeType, members, settlementCurrency } = body;

  if (!audioBase64 || !members?.length) {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
  }

  const memberIds = members.map((m) => m.id);
  const memberList = members.map((m) => `${m.id} = ${m.name}`).join('\n');

  const prompt = `你是旅行分賬App的語音輸入解析助手。使用者會用廣東話、英文或中英夾雜嘅口語講出一筆支出。
請聆聽錄音，將內容轉錄，並抽取以下資訊，回傳JSON。

呢個旅行嘅成員名單（id = 名稱）：
${memberList}

結算貨幣：${settlementCurrency}

規則：
- transcript：你聽到嘅完整逐字轉錄內容
- interpretation：用一句廣東話講清楚「邊個實際出錢（付款人）」同「邊個要負責分擔呢筆錢」。先諗清楚呢句，再填 payerId 同 participantIds
- name：呢筆支出嘅簡短名稱（例如：晚餐、的士、酒店），用廣東話或中文
- amount：金額數字
- currency：貨幣代碼，一定要係 ${CURRENCIES.join(', ')} 其中一個。如果無提及貨幣，用結算貨幣 ${settlementCurrency}
- payerId：實際掏錢出嚟嗰個人（墊付者），一定要係上面成員名單嘅id其中一個。如果聽唔出邊個付款，或者唔肯定，就唔好回傳呢個欄位
- category：分類，一定要係 ${CATEGORIES.join(', ')} 其中一個，按支出內容判斷
- participantIds：要分擔呢筆支出嘅成員id陣列（見下面「付款人同分擔者」）

配對人名：
- 錄音入面嘅人名可能係廣東話讀音、諧音或者暱稱，要按讀音同意思配對到成員名單最接近嘅成員。例如「阿冰」即係成員「冰」（「阿」係前綴，可以忽略）；英文名可能會被讀成中文諧音（例如「聽聽」可能係「Sing Ting」）。

付款人同分擔者（好重要，唔好講反）：
- 「A幫B畀咗」、「A代B畀咗」、「A墊咗」：A 係付款人（payerId），B 係受益人，唔係付款人。
- 「B要畀返」、「B還返」、「B補返」、「B全數畀番」、「由B負責」、「B包」：B 要負責分擔（participantIds）。如果講「全數」、「全部」、「100%」，participantIds 就只有 B 一個人，付款人唔使放入去。
- 如果指明只係某幾個人分，participantIds 只包括嗰幾個人。
- 只有講「平均分」、「大家夾」、「AA」而無指名邊個，participantIds 先用晒成員名單所有id。

例子（人名只係示範，請用返上面成員名單配對）：
- 「小明幫阿華畀咗800日圓買鞋，要由阿華全數畀番」→ 付款人係小明，participantIds 只有阿華
- 「阿強喺餐廳畀咗一千日圓，大家平均分」→ 付款人係阿強，participantIds 係所有成員
- 「阿珊搭的士用咗三百蚊，阿珊同阿強平均分」→ 付款人係阿珊，participantIds 係阿珊同阿強

只回傳JSON，唔好加任何其他文字。`;

  const responseSchema = {
    type: 'OBJECT',
    propertyOrdering: ['transcript', 'interpretation', 'name', 'amount', 'currency', 'payerId', 'category', 'participantIds'],
    properties: {
      transcript: { type: 'STRING' },
      interpretation: { type: 'STRING' },
      name: { type: 'STRING' },
      amount: { type: 'NUMBER' },
      currency: { type: 'STRING', enum: CURRENCIES },
      payerId: { type: 'STRING', enum: memberIds },
      category: { type: 'STRING', enum: CATEGORIES },
      participantIds: { type: 'ARRAY', items: { type: 'STRING', enum: memberIds } },
    },
    required: ['transcript', 'interpretation', 'name', 'amount', 'currency', 'category', 'participantIds'],
  };

  const requestBody = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  };

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  if (!geminiRes.ok) {
    const errBody = await geminiRes.json().catch(() => null);
    const status = geminiRes.status;
    if (status === 429) {
      return NextResponse.json(
        { error: '已超過Gemini免費用量限制，請稍後再試，或考慮升級Gemini帳戶。', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      );
    }
    if (status === 503) {
      return NextResponse.json(
        { error: 'Gemini伺服器繁忙，請稍後再試。', code: 'UNAVAILABLE' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: errBody?.error?.message || '語音解析失敗', code: 'GEMINI_ERROR' },
      { status: 502 }
    );
  }

  const geminiData = await geminiRes.json();
  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return NextResponse.json({ error: '未能解析語音內容，請再試一次', code: 'NO_SPEECH' }, { status: 422 });
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: '解析結果格式錯誤，請再試一次', code: 'PARSE_ERROR' }, { status: 422 });
  }

  return NextResponse.json({ draft: parsed });
}
