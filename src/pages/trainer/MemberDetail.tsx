import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { ArrowLeft, Plus, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PTSessionManagement from './PTSessionManagement';
import WorkoutLog from './WorkoutLog';
import DietReview from './DietReview';

interface BodyStat {
  id: number;
  member_id: string;
  weight: number;
  skeletal_muscle: number;
  body_fat: number;
  recorded_at: string;
  created_at: string;
}

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  notes?: string;
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [member, setMember] = useState<Member | null>(null);
  const [bodyStats, setBodyStats] = useState<BodyStat[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    skeletal_muscle: '',
    body_fat: '',
    recorded_at: new Date().toISOString().split('T')[0],
  });

  // 템플릿을 운동 기록에 적용
  const applyTemplateToWorkout = useCallback(async (templateId: number) => {
    if (!id) return;

    try {
      // 템플릿 정보 불러오기
      const { data: template, error: templateError } = await supabase
        .from('routine_templates')
        .select('*, template_exercises(*)')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const today = new Date().toISOString().split('T')[0];
      interface TemplateExercise {
        exercise_name: string;
        default_reps?: number;
      }
      const workoutData = template.template_exercises.map((exercise: TemplateExercise, index: number) => ({
        member_id: id,
        trainer_id: user.id,
        exercise_name: exercise.exercise_name,
        set_number: index + 1,
        weight: null,
        reps: exercise.default_reps || null,
        memo: null,
        workout_date: today,
      }));

      const { error: insertError } = await supabase
        .from('member_workout_logs')
        .insert(workoutData);

      if (insertError) throw insertError;

      alert(`"${template.template_name}" 템플릿이 오늘의 운동 기록에 적용되었습니다.`);
      // WorkoutLog 컴포넌트가 자동으로 새로고침되도록 날짜 변경 트리거
      window.location.reload();
    } catch (error) {
      console.error('템플릿 적용 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`템플릿 적용에 실패했습니다: ${errorMessage}`);
    }
  }, [id]);

  // 템플릿 적용 처리
  useEffect(() => {
    const templateId = searchParams.get('applyTemplate');
    if (templateId && id) {
      applyTemplateToWorkout(parseInt(templateId));
      // URL에서 파라미터 제거
      navigate(`/trainer/members/${id}`, { replace: true });
    }
  }, [searchParams, id, navigate, applyTemplateToWorkout]);

  // 회원 정보 불러오기
  const fetchMember = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setMember(data as Member);
    } catch (error) {
      console.error('회원 정보 불러오기 실패:', error);
      alert('회원 정보를 불러오는데 실패했습니다.');
    }
  }, [id]);

  // 신체 정보 불러오기
  const fetchBodyStats = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('body_stats')
        .select('*')
        .eq('member_id', id)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setBodyStats(data as BodyStat[]);
    } catch (error) {
      console.error('신체 정보 불러오기 실패:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
    fetchBodyStats();
  }, [id, fetchMember, fetchBodyStats]);

  // 신체 정보 추가
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('body_stats')
        .insert([
          {
            member_id: id,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            skeletal_muscle: formData.skeletal_muscle ? parseFloat(formData.skeletal_muscle) : null,
            body_fat: formData.body_fat ? parseFloat(formData.body_fat) : null,
            recorded_at: formData.recorded_at,
          },
        ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        weight: '',
        skeletal_muscle: '',
        body_fat: '',
        recorded_at: new Date().toISOString().split('T')[0],
      });
      fetchBodyStats();
      alert('신체 정보가 성공적으로 기록되었습니다.');
    } catch (error) {
      console.error('신체 정보 기록 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`신체 정보 기록에 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 그래프 데이터 준비
  const chartData = bodyStats.map(stat => ({
    date: new Date(stat.recorded_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    몸무게: stat.weight,
    골격근: stat.skeletal_muscle,
    체지방: stat.body_fat,
  }));

  if (!member) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/trainer/members')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="뒤로 가기"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">{member.full_name} 회원 상세</h2>
      </div>

      {/* 회원 기본 정보 */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">이름</p>
            <p className="font-medium">{member.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">전화번호</p>
            <p className="font-medium">{member.phone_number}</p>
          </div>
          {member.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">메모</p>
              <p className="font-medium">{member.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* PT 회차 관리 */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <PTSessionManagement />
      </div>

      {/* 신체 정보 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp size={20} />
            신체 정보 기록
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            기록 추가
          </button>
        </div>

        {/* 그래프 */}
        {bodyStats.length > 0 ? (
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="몸무게" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="골격근" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="체지방" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">신체 정보 기록이 없습니다.</p>
        )}

        {/* 기록 리스트 */}
        {bodyStats.length > 0 && (
          <div className="space-y-2">
            {bodyStats.slice().reverse().map((stat) => (
              <div key={stat.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">
                    {new Date(stat.recorded_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">몸무게</p>
                    <p className="font-semibold">{stat.weight ? `${stat.weight}kg` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">골격근</p>
                    <p className="font-semibold">{stat.skeletal_muscle ? `${stat.skeletal_muscle}kg` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">체지방</p>
                    <p className="font-semibold">{stat.body_fat ? `${stat.body_fat}%` : '-'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 신체 정보 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">신체 정보 기록</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="recorded-date" className="block text-sm font-medium text-gray-700 mb-1">
                  기록일
                </label>
                <input
                  id="recorded-date"
                  type="date"
                  value={formData.recorded_at}
                  onChange={(e) => setFormData({ ...formData, recorded_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  몸무게 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="예: 70.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  골격근 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.skeletal_muscle}
                  onChange={(e) => setFormData({ ...formData, skeletal_muscle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="예: 30.2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  체지방 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.body_fat}
                  onChange={(e) => setFormData({ ...formData, body_fat: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="예: 15.5"
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
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 운동 기록 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <WorkoutLog />
      </div>

      {/* 식단 확인 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <DietReview />
      </div>
    </div>
  );
}

