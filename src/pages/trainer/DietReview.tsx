import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { useParams } from 'react-router-dom';
import { Smile, Frown, Heart, ThumbsUp, MessageSquare } from 'lucide-react';

interface DietLog {
  id: number;
  member_id: string;
  image_url: string;
  memo?: string;
  trainer_feedback?: string;
  feedback_emoji?: string;
  logged_at: string;
  created_at: string;
}

const EMOJI_OPTIONS = [
  { value: '👍', icon: ThumbsUp, label: '좋아요' },
  { value: '❤️', icon: Heart, label: '좋아요' },
  { value: '😊', icon: Smile, label: '좋아요' },
  { value: '😢', icon: Frown, label: '아쉬워요' },
];

export default function DietReview() {
  const { id } = useParams<{ id: string }>();
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  // 식단 기록 불러오기
  const fetchDietLogs = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('diet_logs')
        .select('*')
        .eq('member_id', id)
        .order('logged_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDietLogs(data as DietLog[]);
    } catch (error) {
      console.error('식단 기록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDietLogs();
  }, [id]);

  // 피드백 저장
  const handleSaveFeedback = async (logId: number, emoji?: string) => {
    try {
      const updateData: any = {};
      if (emoji) {
        updateData.feedback_emoji = emoji;
      }
      if (editingId === logId && feedback.trim()) {
        updateData.trainer_feedback = feedback.trim();
      }

      const { error } = await supabase
        .from('diet_logs')
        .update(updateData)
        .eq('id', logId);

      if (error) throw error;

      setEditingId(null);
      setFeedback('');
      fetchDietLogs();
    } catch (error) {
      console.error('피드백 저장 실패:', error);
      alert('피드백 저장에 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">식단 확인</h3>

      {dietLogs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-gray-500">식단 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dietLogs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(log.logged_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {log.memo && (
                    <p className="text-sm text-gray-600 mt-1">{log.memo}</p>
                  )}
                </div>
                {log.feedback_emoji && (
                  <span className="text-2xl">{log.feedback_emoji}</span>
                )}
              </div>

              {log.image_url && (
                <div className="mb-3">
                  <img
                    src={log.image_url}
                    alt="식단 사진"
                    className="w-full max-w-md rounded-lg border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=이미지+없음';
                    }}
                  />
                </div>
              )}

              {/* 트레이너 피드백 */}
              <div className="border-t pt-3 mt-3">
                {editingId === log.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="피드백을 입력하세요..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveFeedback(log.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setFeedback('');
                        }}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {log.trainer_feedback ? (
                      <div className="flex items-start gap-2">
                        <MessageSquare size={16} className="text-gray-400 mt-1" />
                        <p className="text-sm text-gray-700 flex-1">{log.trainer_feedback}</p>
                        <button
                          onClick={() => {
                            setEditingId(log.id);
                            setFeedback(log.trainer_feedback || '');
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          수정
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(log.id);
                          setFeedback('');
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      >
                        <MessageSquare size={14} />
                        코멘트 추가
                      </button>
                    )}
                  </div>
                )}

                {/* 이모티콘 피드백 */}
                <div className="flex gap-2 mt-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji.value}
                      onClick={() => handleSaveFeedback(log.id, emoji.value)}
                      className={`p-2 rounded-lg border transition-colors ${
                        log.feedback_emoji === emoji.value
                          ? 'bg-blue-50 border-blue-300'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      title={emoji.label}
                    >
                      <span className="text-xl">{emoji.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

