import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../api/supabase';
import { useParams } from 'react-router-dom';
import { Plus, Copy, Trash2 } from 'lucide-react';

interface WorkoutLog {
  id: number;
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
  memo?: string;
  workout_date: string;
}

interface WorkoutFormData {
  exercise_name: string;
  set_number: number;
  weight: string;
  reps: string;
  memo: string;
}

export default function WorkoutLog() {
  const { id } = useParams<{ id: string }>();
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<WorkoutFormData>({
    exercise_name: '',
    set_number: 1,
    weight: '',
    reps: '',
    memo: '',
  });

  // 운동 기록 불러오기
  const fetchWorkouts = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('member_workout_logs')
        .select('*')
        .eq('member_id', id)
        .eq('workout_date', selectedDate)
        .order('exercise_name', { ascending: true })
        .order('set_number', { ascending: true });

      if (error) throw error;
      setWorkouts(data as WorkoutLog[]);
    } catch (error) {
      console.error('운동 기록 불러오기 실패:', error);
    }
  }, [id, selectedDate]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // 이전 기록 불러오기 (복사용)
  const loadLastWorkout = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('member_workout_logs')
        .select('*')
        .eq('member_id', id)
        .order('workout_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // 가장 최근 날짜의 기록만 가져오기
        const lastDate = data[0].workout_date;
        const lastWorkouts = data.filter(w => w.workout_date === lastDate);
        
        if (lastWorkouts.length > 0) {
          if (confirm(`최근 기록(${lastDate})을 불러오시겠습니까?`)) {
            // 첫 번째 운동의 정보로 폼 채우기
            const firstWorkout = lastWorkouts[0];
            setFormData({
              exercise_name: firstWorkout.exercise_name,
              set_number: 1,
              weight: firstWorkout.weight?.toString() || '',
              reps: firstWorkout.reps?.toString() || '',
              memo: firstWorkout.memo || '',
            });
            setIsModalOpen(true);
          }
        }
      } else {
        alert('이전 기록이 없습니다.');
      }
    } catch (error) {
      console.error('이전 기록 불러오기 실패:', error);
    }
  };

  // 운동 기록 추가
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formData.exercise_name.trim()) {
      alert('운동명을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase
        .from('member_workout_logs')
        .insert([
          {
            member_id: id,
            trainer_id: user.id,
            exercise_name: formData.exercise_name,
            set_number: formData.set_number,
            weight: formData.weight ? parseFloat(formData.weight) : null,
            reps: formData.reps ? parseInt(formData.reps) : null,
            memo: formData.memo || null,
            workout_date: selectedDate,
          },
        ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        exercise_name: '',
        set_number: 1,
        weight: '',
        reps: '',
        memo: '',
      });
      fetchWorkouts();
    } catch (error) {
      console.error('운동 기록 추가 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`운동 기록 추가에 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 운동 기록 삭제
  const handleDelete = async (workoutId: number) => {
    if (!confirm('정말 이 기록을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('member_workout_logs')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;
      fetchWorkouts();
    } catch (error) {
      console.error('운동 기록 삭제 실패:', error);
      alert('운동 기록 삭제에 실패했습니다.');
    }
  };

  // 운동별로 그룹화
  const groupedWorkouts = workouts.reduce((acc, workout) => {
    if (!acc[workout.exercise_name]) {
      acc[workout.exercise_name] = [];
    }
    acc[workout.exercise_name].push(workout);
    return acc;
  }, {} as Record<string, WorkoutLog[]>);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">운동 기록</h3>
        <div className="flex gap-2">
          <button
            onClick={loadLastWorkout}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
          >
            <Copy size={16} />
            이전 기록 불러오기
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            기록 추가
          </button>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="mb-4">
        <label htmlFor="workout-date" className="block text-sm font-medium text-gray-700 mb-1">
          날짜 선택
        </label>
        <input
          id="workout-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* 운동 기록 리스트 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {workouts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">해당 날짜의 운동 기록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedWorkouts).map(([exerciseName, sets]) => (
              <div key={exerciseName} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h4 className="font-semibold text-lg mb-3">{exerciseName}</h4>
                <div className="space-y-2">
                  {sets.map((workout) => (
                    <div key={workout.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{workout.set_number}세트</span>
                        {workout.weight && <span>{workout.weight}kg</span>}
                        {workout.reps && <span>{workout.reps}회</span>}
                        {workout.memo && <span className="text-gray-500 text-sm">{workout.memo}</span>}
                      </div>
                      <button
                        onClick={() => handleDelete(workout.id)}
                        className="text-red-600 hover:text-red-700"
                        aria-label={`${workout.exercise_name} ${workout.set_number}세트 삭제`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 운동 기록 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">운동 기록 추가</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  운동명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.exercise_name}
                  onChange={(e) => setFormData({ ...formData, exercise_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="예: 벤치프레스"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="set-number" className="block text-sm font-medium text-gray-700 mb-1">
                    세트
                  </label>
                  <input
                    id="set-number"
                    type="number"
                    min="1"
                    value={formData.set_number}
                    onChange={(e) => setFormData({ ...formData, set_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    무게 (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="예: 60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    횟수
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.reps}
                    onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="예: 10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모
                  </label>
                  <input
                    type="text"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="메모"
                  />
                </div>
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
    </div>
  );
}

