import { NextRequest, NextResponse } from 'next/server';
import { CurrencyCode, ExpenseCategory } from '@/lib/types';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const CURRENCIES: CurrencyCode[] = ['HKD', 'THB', 'USD', 'JPY', 'EUR', 'CNY'];
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
- name：呢筆支出嘅簡短名稱（例如：晚餐、的士、酒店），用廣東話或中文
- amount：金額數字
- currency：貨幣代碼，一定要係 ${CURRENCIES.join(', ')} 其中一個。如果無提及貨幣，用結算貨幣 ${settlementCurrency}
- payerId：邊個member墊付，一定要係上面成員名單嘅id其中一個。如果聽唔出邊個付款，或者唔肯定，就唔好回傳呢個欄位
- category：分類，一定要係 ${CATEGORIES.join(', ')} 其中一個，按支出內容判斷
- participantIds：邊啲成員要分擔呢筆支出嘅id陣列。如果講到「平均分」、「大家夾」但無指名邊個，就用晒成員名單所有id。如果指定咗某幾個人，只回傳嗰幾個人嘅id
- transcript：你聽到嘅完整逐字轉錄內容

只回傳JSON，唔好加任何其他文字。`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING' },
      amount: { type: 'NUMBER' },
      currency: { type: 'STRING', enum: CURRENCIES },
      payerId: { type: 'STRING', enum: memberIds },
      category: { type: 'STRING', enum: CATEGORIES },
      participantIds: { type: 'ARRAY', items: { type: 'STRING', enum: memberIds } },
      transcript: { type: 'STRING' },
    },
    required: ['name', 'amount', 'currency', 'category', 'participantIds', 'transcript'],
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
