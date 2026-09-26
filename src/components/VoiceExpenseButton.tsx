'use client';

import { useRef, useState } from 'react';
import { Mic, Square, Loader2, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { Avatar } from '@/components/ui/Avatar';
import { Trip, CurrencyCode, ExpenseCategory, CATEGORY_LABELS, CATEGORY_ICONS, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';
import { buildSplits, round2 } from '@/lib/calculations';
import { getExchangeRate, getTodayISO, formatAmount, cn } from '@/lib/utils';

type Stage = 'idle' | 'recording' | 'processing' | 'confirm' | 'error';

const CATEGORIES: ExpenseCategory[] = ['accommodation', 'transport', 'food', 'activities', 'shopping', 'others'];
const CURRENCIES: CurrencyCode[] = ['HKD', 'THB', 'USD', 'JPY', 'EUR', 'CNY'];

// Gemini invents an expense when given silence, so require audible sound before calling the API.
const VOICE_RMS_THRESHOLD = 0.02;
const MIN_VOICED_FRAMES = 3;

interface VoiceDraft {
  name: string;
  amount: number;
  currency: CurrencyCode;
  payerId: string;
  category: ExpenseCategory;
  participantIds: string[];
  transcript: string;
}

interface VoiceExpenseButtonProps {
  trip: Trip;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function VoiceExpenseButton({ trip }: VoiceExpenseButtonProps) {
  const addExpense = useTripStore((s) => s.addExpense);
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelTimerRef = useRef<number | null>(null);
  const voicedFramesRef = useRef(0);

  const open = () => setStage('recording');

  const stopLevelMonitor = () => {
    if (levelTimerRef.current !== null) {
      window.clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleRecordingStop;

      voicedFramesRef.current = 0;
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        audioCtxRef.current = ctx;
        levelTimerRef.current = window.setInterval(() => {
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
          if (Math.sqrt(sum / samples.length) > VOICE_RMS_THRESHOLD) voicedFramesRef.current++;
        }, 100);
      } catch {
        voicedFramesRef.current = MIN_VOICED_FRAMES;
      }

      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch {
      setErrorMsg('無法存取麥克風，請檢查瀏覽器權限');
      setStage('error');
    }
  };

  const stopRecording = () => {
    stopLevelMonitor();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const handleRecordingStop = async () => {
    if (voicedFramesRef.current < MIN_VOICED_FRAMES) {
      setErrorMsg('未有偵測到聲音，請對住麥克風再講一次');
      setStage('error');
      return;
    }
    setStage('processing');
    try {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const base64 = await blobToBase64(blob);

      const res = await fetch('/api/parse-voice-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType,
          members: trip.members.map((m) => ({ id: m.id, name: m.name })),
          settlementCurrency: trip.settlementCurrency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '語音解析失敗');
        setStage('error');
        return;
      }

      const d = data.draft as VoiceDraft;
      setDraft({
        name: d.name || '',
        amount: d.amount || 0,
        currency: CURRENCIES.includes(d.currency) ? d.currency : trip.settlementCurrency,
        payerId: d.payerId && trip.members.some((m) => m.id === d.payerId) ? d.payerId : '',
        category: CATEGORIES.includes(d.category) ? d.category : 'others',
        participantIds: d.participantIds?.length ? d.participantIds : trip.members.map((m) => m.id),
        transcript: d.transcript || '',
      });
      setStage('confirm');
    } catch {
      setErrorMsg('網絡錯誤，請再試一次');
      setStage('error');
    }
  };

  const close = () => {
    setStage('idle');
    setDraft(null);
    setErrorMsg('');
  };

  const toggleParticipant = (id: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      participantIds: draft.participantIds.includes(id)
        ? draft.participantIds.filter((x) => x !== id)
        : [...draft.participantIds, id],
    });
  };

  const handleConfirm = () => {
    if (!draft || !draft.name.trim() || draft.amount <= 0 || !draft.payerId || draft.participantIds.length === 0) return;

    const exchangeRate = getExchangeRate(trip.exchangeRates, draft.currency, trip.settlementCurrency);
    const settlementAmount = round2(draft.amount * exchangeRate);
    const splits = buildSplits('equal', settlementAmount, draft.participantIds);

    addExpense(trip.id, {
      name: draft.name.trim(),
      originalAmount: draft.amount,
      originalCurrency: draft.currency,
      exchangeRate,
      settlementAmount,
      paidBy: draft.payerId,
      date: getTodayISO(),
      category: draft.category,
      participants: draft.participantIds,
      splitMode: 'equal',
      splits,
      notes: '',
    });
    close();
  };

  const isValid = draft && draft.name.trim() && draft.amount > 0 && draft.payerId && draft.participantIds.length > 0;

  return (
    <>
      <button
        onClick={open}
        className="fixed bottom-20 right-[4.75rem] w-14 h-14 bg-military-700 hover:bg-military-600 rounded-full flex items-center justify-center shadow-lg shadow-military-900/50 transition-colors active:scale-95 z-40"
      >
        <Mic className="w-6 h-6 text-white" />
      </button>

      {stage !== 'idle' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={stage === 'confirm' ? undefined : close}>
          <div
            className="bg-charcoal-900 rounded-t-2xl w-full p-5 pb-8 max-w-md mx-auto max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {stage === 'recording' && (
              <div className="flex flex-col items-center py-8">
                <p className="text-white font-medium mb-1">語音輸入支出</p>
                <p className="text-xs text-charcoal-400 mb-6 text-center">
                  例如：「Keith 喺餐廳畀咗1000日圓，大家平均分」
                </p>
                <RecordingControls onStart={startRecording} onStop={stopRecording} onCancel={close} />
              </div>
            )}

            {stage === 'processing' && (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-8 h-8 text-navy-400 animate-spin mb-3" />
                <p className="text-sm text-charcoal-300">正在分析語音內容...</p>
              </div>
            )}

            {stage === 'error' && (
              <div className="flex flex-col items-center py-8">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-sm text-red-300 text-center mb-6">{errorMsg}</p>
                <div className="flex gap-3 w-full">
                  <button onClick={close} className="flex-1 py-3 rounded-xl bg-charcoal-800 text-charcoal-300 text-sm font-medium">
                    取消
                  </button>
                  <button onClick={() => setStage('recording')} className="flex-1 py-3 rounded-xl bg-navy-600 text-white text-sm font-medium">
                    再試一次
                  </button>
                </div>
              </div>
            )}

            {stage === 'confirm' && draft && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">確認語音輸入</h3>

                {draft.transcript && (
                  <div className="bg-charcoal-800 rounded-xl p-3">
                    <p className="text-xs text-charcoal-500 mb-1">語音轉錄</p>
                    <p className="text-sm text-charcoal-300">{draft.transcript}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-charcoal-400 mb-1.5 block">支出名稱 *</label>
                  <input
                    className="input-field"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-charcoal-400 mb-1.5 block">金額 *</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCurrencyPicker(true)}
                      className="bg-charcoal-800 border border-charcoal-600 rounded-xl px-3 py-3 flex items-center gap-1.5 shrink-0"
                    >
                      <span className="text-white font-medium">{draft.currency}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-charcoal-500" />
                    </button>
                    <input
                      type="number"
                      className="input-field flex-1"
                      value={draft.amount || ''}
                      onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-charcoal-400 mb-1.5 block">分類</label>
                  <button
                    onClick={() => setShowCategoryPicker(true)}
                    className="input-field flex items-center justify-between w-full"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{CATEGORY_ICONS[draft.category]}</span>
                      <span className="text-sm">{CATEGORY_LABELS[draft.category]}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-charcoal-500" />
                  </button>
                </div>

                <div>
                  <p className="text-xs text-charcoal-400 mb-2">付款人 *</p>
                  <div className="grid grid-cols-4 gap-2">
                    {trip.members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setDraft({ ...draft, payerId: m.id })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-colors',
                          draft.payerId === m.id ? 'bg-navy-800 ring-1 ring-navy-500' : 'bg-charcoal-800 hover:bg-charcoal-700'
                        )}
                      >
                        <Avatar initials={m.initials} color={m.color} size="sm" />
                        <span className="text-xs text-charcoal-300 truncate w-full text-center">{m.name}</span>
                      </button>
                    ))}
                  </div>
                  {!draft.payerId && (
                    <p className="text-xs text-red-400 mt-1.5">未能識別付款人，請手動選擇</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-charcoal-400 mb-2">分賬成員（平均分）</p>
                  <div className="grid grid-cols-4 gap-2">
                    {trip.members.map((m) => {
                      const selected = draft.participantIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleParticipant(m.id)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-colors relative',
                            selected ? 'bg-military-900 ring-1 ring-military-600' : 'bg-charcoal-800 opacity-50'
                          )}
                        >
                          <Avatar initials={m.initials} color={m.color} size="sm" />
                          <span className="text-xs text-charcoal-300 truncate w-full text-center">{m.name}</span>
                          {selected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-military-500 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {draft.amount > 0 && draft.participantIds.length > 0 && (
                  <div className="bg-charcoal-800 rounded-xl p-3 text-xs text-charcoal-400">
                    每人約 {formatAmount(
                      round2(
                        round2(draft.amount * getExchangeRate(trip.exchangeRates, draft.currency, trip.settlementCurrency)) /
                          draft.participantIds.length
                      ),
                      trip.settlementCurrency
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={close} className="flex-1 py-3 rounded-xl bg-charcoal-800 text-charcoal-300 text-sm font-medium">
                    取消
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!isValid}
                    className="flex-1 py-3 rounded-xl bg-military-600 text-white text-sm font-bold disabled:opacity-40"
                  >
                    確認新增
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Currency Picker */}
      {showCurrencyPicker && draft && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end" onClick={() => setShowCurrencyPicker(false)}>
          <div className="bg-charcoal-900 rounded-t-2xl w-full p-5 pb-10 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-4">選擇貨幣</h3>
            <div className="space-y-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setDraft({ ...draft, currency: c }); setShowCurrencyPicker(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors',
                    draft.currency === c ? 'bg-navy-700 text-white' : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
                  )}
                >
                  <span className="font-medium">{c}</span>
                  <span className="text-sm text-charcoal-400">{CURRENCY_LABELS[c]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Picker */}
      {showCategoryPicker && draft && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end" onClick={() => setShowCategoryPicker(false)}>
          <div className="bg-charcoal-900 rounded-t-2xl w-full p-5 pb-10 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-4">選擇分類</h3>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setDraft({ ...draft, category: c }); setShowCategoryPicker(false); }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-xl transition-colors',
                    draft.category === c ? 'bg-navy-700 text-white' : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
                  )}
                >
                  <span className="text-xl">{CATEGORY_ICONS[c]}</span>
                  <span className="text-sm font-medium">{CATEGORY_LABELS[c]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecordingControls({ onStart, onStop, onCancel }: { onStart: () => void; onStop: () => void; onCancel: () => void }) {
  const [isRecording, setIsRecording] = useState(false);

  if (isRecording) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
          <Mic className="w-8 h-8 text-white" />
        </div>
        <p className="text-xs text-red-300">錄音中...</p>
        <button
          onClick={() => { setIsRecording(false); onStop(); }}
          className="w-full py-3 rounded-xl bg-navy-600 text-white text-sm font-bold flex items-center justify-center gap-2"
        >
          <Square className="w-4 h-4" />
          停止錄音
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3 w-full">
      <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-charcoal-800 text-charcoal-300 text-sm font-medium">
        取消
      </button>
      <button
        onClick={() => { setIsRecording(true); onStart(); }}
        className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2"
      >
        <Mic className="w-4 h-4" />
        開始錄音
      </button>
    </div>
  );
}
