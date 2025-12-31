import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { signUpUser } from '../../api/auth';
import { Users, UserPlus, BarChart3 } from 'lucide-react';
import { Plus, X } from 'lucide-react';

interface Trainer {
  id: string;
  full_name: string;
  phone_number?: string;
  created_at: string;
  member_count?: number;
  total_sessions?: number;
}

interface TrainerStats {
  trainer_id: string;
  trainer_name: string;
  member_count: number;
  total_sessions: number;
}

export default function AdminDashboard() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [stats, setStats] = useState<TrainerStats[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
  });

  // 트레이너 목록 불러오기
  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainers((data || []) as Trainer[]);
    } catch (error) {
      console.error('트레이너 목록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 통계 불러오기
  const fetchStats = async () => {
    try {
      // 트레이너별 회원 수 및 회차 통계
      const { data: contracts, error: contractsError } = await supabase
        .from('pt_contracts')
        .select('trainer_id, total_sessions, used_sessions');

      if (contractsError) throw contractsError;

      // 트레이너별로 그룹화
      const statsMap = new Map<string, TrainerStats>();

      // 트레이너 목록 가져오기
      const { data: trainerData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'trainer');

      trainerData?.forEach((trainer) => {
        statsMap.set(trainer.id, {
          trainer_id: trainer.id,
          trainer_name: trainer.full_name,
          member_count: 0,
          total_sessions: 0,
        });
      });

      // 회원 수 계산
      const memberCounts = new Map<string, Set<string>>();
      contracts?.forEach((contract) => {
        if (!memberCounts.has(contract.trainer_id)) {
          memberCounts.set(contract.trainer_id, new Set());
        }
        memberCounts.get(contract.trainer_id)?.add(contract.trainer_id);
      });

      // 통계 계산
      contracts?.forEach((contract) => {
        const stat = statsMap.get(contract.trainer_id);
        if (stat) {
          stat.total_sessions += contract.total_sessions || 0;
        }
      });

      // 회원 수 추가
      const { data: membersData } = await supabase
        .from('pt_contracts')
        .select('trainer_id, member_id')
        .eq('is_active', true);

      membersData?.forEach((member) => {
        const stat = statsMap.get(member.trainer_id);
        if (stat) {
          if (!stat.member_count) stat.member_count = 0;
          stat.member_count++;
        }
      });

      setStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('통계 불러오기 실패:', error);
    }
  };

  useEffect(() => {
    fetchTrainers();
    fetchStats();
  }, []);

  // 트레이너 계정 생성
  const handleCreateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.password) {
      alert('이름, 이메일, 비밀번호는 필수 입력 항목입니다.');
      return;
    }

    try {
      setLoading(true);
      
      // 1. 회원가입 함수 호출
      const data = await signUpUser(
        formData.email,
        formData.password,
        formData.phone_number || '',
        formData.full_name,
        'trainer'
      );

      if (!data.user) {
        throw new Error('트레이너 계정 생성에 실패했습니다. 사용자 정보를 가져올 수 없습니다.');
      }

      // 2. 프로필 정보 추가 (profiles 테이블에 직접 insert)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            full_name: formData.full_name,
            phone_number: formData.phone_number || null,
            role: 'trainer',
          },
        ]);

      if (profileError) throw profileError;

      setIsModalOpen(false);
      setFormData({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
      });
      fetchTrainers();
      fetchStats();
      alert('트레이너 계정이 생성되었습니다.');
    } catch (error) {
      console.error('트레이너 계정 생성 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`트레이너 계정 생성에 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 전체 회원 수
  const totalMembers = stats.reduce((sum, stat) => sum + (stat.member_count || 0), 0);
  const totalSessions = stats.reduce((sum, stat) => sum + (stat.total_sessions || 0), 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">관리자 대시보드</h2>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">전체 트레이너</p>
              <p className="text-2xl font-bold">{trainers.length}명</p>
            </div>
            <Users className="text-blue-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">전체 회원</p>
              <p className="text-2xl font-bold">{totalMembers}명</p>
            </div>
            <UserPlus className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">총 PT 회차</p>
              <p className="text-2xl font-bold">{totalSessions}회</p>
            </div>
            <BarChart3 className="text-purple-600" size={32} />
          </div>
        </div>
      </div>

      {/* 트레이너 관리 */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">트레이너 관리</h3>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            트레이너 추가
          </button>
        </div>

        {loading && trainers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">등록된 트레이너가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trainers.map((trainer) => {
              const trainerStat = stats.find((s) => s.trainer_id === trainer.id);
              return (
                <div
                  key={trainer.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-semibold">{trainer.full_name}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      {trainer.phone_number && <p>전화번호: {trainer.phone_number}</p>}
                      <p>
                        회원 수: {trainerStat?.member_count || 0}명 | 회차: {trainerStat?.total_sessions || 0}회
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(trainer.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 트레이너별 통계 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          트레이너별 통계
        </h3>
        {stats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">통계 데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">트레이너</th>
                  <th className="text-left py-3 px-4 font-semibold">회원 수</th>
                  <th className="text-left py-3 px-4 font-semibold">총 회차</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr key={stat.trainer_id} className="border-b">
                    <td className="py-3 px-4">{stat.trainer_name}</td>
                    <td className="py-3 px-4">{stat.member_count}명</td>
                    <td className="py-3 px-4">{stat.total_sessions}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 트레이너 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">트레이너 계정 생성</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="닫기"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTrainer} className="p-6 space-y-4">
              <div>
                <label htmlFor="trainer-full-name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="trainer-full-name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="trainer-email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  id="trainer-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="trainer-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호
                </label>
                <input
                  id="trainer-phone"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="trainer-password" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="trainer-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  minLength={6}
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

