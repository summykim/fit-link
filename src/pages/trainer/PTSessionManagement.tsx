import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../api/supabase';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Plus } from 'lucide-react';

interface PTContract {
  id: number;
  trainer_id: string;
  member_id: string;
  total_sessions: number;
  used_sessions: number;
  is_active: boolean;
  created_at: string;
}

export default function PTSessionManagement() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<PTContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    total_sessions: '',
  });

  // PT 계약 불러오기
  const fetchContract = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('pt_contracts')
        .select('*')
        .eq('member_id', id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setContract(data as PTContract | null);
    } catch (error) {
      console.error('계약 정보 불러오기 실패:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchContract();
    }
  }, [id, fetchContract]);

  // PT 계약 생성
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setLoading(true);
      // 현재 로그인한 트레이너 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 기존 계약이 있으면 비활성화
      if (contract) {
        const { error: updateError } = await supabase
          .from('pt_contracts')
          .update({ is_active: false })
          .eq('id', contract.id);

        if (updateError) throw updateError;
      }

      // 새 계약 생성
      const { error } = await supabase
        .from('pt_contracts')
        .insert([
          {
            trainer_id: user.id,
            member_id: id,
            total_sessions: parseInt(formData.total_sessions),
            used_sessions: 0,
            is_active: true,
          },
        ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ total_sessions: '' });
      fetchContract();
      alert('PT 계약이 생성되었습니다.');
    } catch (error) {
      console.error('계약 생성 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`계약 생성에 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 수업 완료 (회차 차감)
  const handleCompleteSession = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('pt_contracts')
        .update({
          used_sessions: contract.used_sessions + 1,
        })
        .eq('id', contract.id);

      if (error) throw error;

      fetchContract();
      alert('수업이 완료되었습니다.');
    } catch (error) {
      console.error('수업 완료 처리 실패:', error);
      alert('수업 완료 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const remainingSessions = contract ? contract.total_sessions - contract.used_sessions : 0;
  const isLowSessions = remainingSessions <= 5 && remainingSessions > 0;
  const isExhausted = remainingSessions === 0;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">PT 회차 관리</h3>

      {!contract || contract.total_sessions === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-500 mb-4">
            {!contract ? 'PT 계약이 없습니다.' : 'PT 계약의 총 회차가 0입니다.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            PT 계약 생성
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 회차</p>
              <p className="text-2xl font-bold">{contract.total_sessions}회</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">사용 회차</p>
              <p className="text-2xl font-bold text-blue-600">{contract.used_sessions}회</p>
            </div>
            <div className={isExhausted ? 'text-red-600' : isLowSessions ? 'text-orange-600' : 'text-green-600'}>
              <p className="text-sm">남은 회차</p>
              <p className="text-2xl font-bold">{remainingSessions}회</p>
            </div>
          </div>

          {isExhausted && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-700 font-medium">회차가 모두 소진되었습니다.</p>
            </div>
          )}

          {isLowSessions && !isExhausted && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="text-orange-600" size={20} />
              <p className="text-orange-700 font-medium">회차가 곧 소진됩니다. ({remainingSessions}회 남음)</p>
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            <button
              onClick={handleCompleteSession}
              disabled={loading || isExhausted}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              수업 완료 (회차 차감)
            </button>
            
            {isExhausted && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                새 PT 계약 생성
              </button>
            )}
          </div>
        </div>
      )}

      {/* PT 계약 생성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">PT 계약 생성</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  총 회차 수 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.total_sessions}
                  onChange={(e) => setFormData({ total_sessions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="예: 10, 20"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

