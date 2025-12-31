import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PTContract {
  total_sessions: number;
  used_sessions: number;
  is_active: boolean;
}

interface BodyStat {
  id: number;
  weight: number;
  skeletal_muscle: number;
  body_fat: number;
  recorded_at: string;
}

export default function BodyStats() {
  const [contract, setContract] = useState<PTContract | null>(null);
  const [bodyStats, setBodyStats] = useState<BodyStat[]>([]);
  const [loading, setLoading] = useState(false);

  // PT 계약 정보 불러오기
  const fetchContract = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pt_contracts')
        .select('*')
        .eq('member_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setContract(data as PTContract | null);
    } catch (error) {
      console.error('PT 계약 정보 불러오기 실패:', error);
    }
  };

  // 신체 정보 불러오기
  const fetchBodyStats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('body_stats')
        .select('*')
        .eq('member_id', user.id)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setBodyStats((data || []) as BodyStat[]);
    } catch (error) {
      console.error('신체 정보 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
    fetchBodyStats();
  }, []);

  // 그래프 데이터 준비
  const chartData = bodyStats.map(stat => ({
    date: new Date(stat.recorded_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    몸무게: stat.weight,
    골격근: stat.skeletal_muscle,
    체지방: stat.body_fat,
  }));

  const remainingSessions = contract ? contract.total_sessions - contract.used_sessions : 0;
  const progressPercentage = contract
    ? Math.round((contract.used_sessions / contract.total_sessions) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">내 PT 정보</h2>

      {/* PT 회차 정보 */}
      {contract ? (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            PT 회차 정보
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">총 회차</p>
                <p className="text-2xl font-bold text-blue-600">{contract.total_sessions}회</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">사용 회차</p>
                <p className="text-2xl font-bold text-green-600">{contract.used_sessions}회</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600">남은 회차</p>
                <p className="text-xl font-bold text-gray-900">{remainingSessions}회</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{progressPercentage}% 진행</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-gray-500 text-center">활성화된 PT 계약이 없습니다.</p>
        </div>
      )}

      {/* 신체 정보 그래프 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          신체 정보 변화
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : bodyStats.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">신체 정보 기록이 없습니다.</p>
          </div>
        ) : (
          <>
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

            {/* 최근 기록 요약 */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {bodyStats.length > 0 && (
                <>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">현재 몸무게</p>
                    <p className="text-lg font-bold">
                      {bodyStats[bodyStats.length - 1].weight
                        ? `${bodyStats[bodyStats.length - 1].weight}kg`
                        : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">현재 골격근</p>
                    <p className="text-lg font-bold">
                      {bodyStats[bodyStats.length - 1].skeletal_muscle
                        ? `${bodyStats[bodyStats.length - 1].skeletal_muscle}kg`
                        : '-'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">현재 체지방</p>
                    <p className="text-lg font-bold">
                      {bodyStats[bodyStats.length - 1].body_fat
                        ? `${bodyStats[bodyStats.length - 1].body_fat}%`
                        : '-'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
