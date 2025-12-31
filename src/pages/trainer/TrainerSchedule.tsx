import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../api/supabase';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import CalendarComponent from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface Schedule {
  id: number;
  trainer_id: string;
  member_id: string;
  start_time: string;
  end_time: string;
  status: string;
  member?: {
    full_name: string;
  };
}

interface ScheduleFormData {
  member_id: string;
  start_time: string;
  end_time: string;
  status: string;
}

export default function TrainerSchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ScheduleFormData>({
    member_id: '',
    start_time: '',
    end_time: '',
    status: 'scheduled',
  });

  // 회원 목록 불러오기
  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'member')
        .order('full_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('회원 목록 불러오기 실패:', error);
    }
  };

  // 일정 불러오기
  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          member:profiles!schedules_member_id_fkey(id, full_name)
        `)
        .eq('trainer_id', user.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules((data || []) as Schedule[]);
    } catch (error) {
      console.error('일정 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // 일정 추가/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id || !formData.start_time || !formData.end_time) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      if (editingSchedule) {
        // 수정
        const { error } = await supabase
          .from('schedules')
          .update({
            member_id: formData.member_id,
            start_time: formData.start_time,
            end_time: formData.end_time,
            status: formData.status,
          })
          .eq('id', editingSchedule.id);

        if (error) throw error;
      } else {
        // 추가
        const { error } = await supabase
          .from('schedules')
          .insert([
            {
              trainer_id: user.id,
              member_id: formData.member_id,
              start_time: formData.start_time,
              end_time: formData.end_time,
              status: formData.status,
            },
          ]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
      setFormData({
        member_id: '',
        start_time: '',
        end_time: '',
        status: 'scheduled',
      });
      fetchSchedules();
    } catch (error) {
      console.error('일정 저장 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`일정 저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 일정 삭제
  const handleDelete = async (scheduleId: number) => {
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      fetchSchedules();
    } catch (error) {
      console.error('일정 삭제 실패:', error);
      alert('일정 삭제에 실패했습니다.');
    }
  };

  // 일정 수정 모달 열기
  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      member_id: schedule.member_id,
      start_time: new Date(schedule.start_time).toISOString().slice(0, 16),
      end_time: new Date(schedule.end_time).toISOString().slice(0, 16),
      status: schedule.status,
    });
    setIsModalOpen(true);
  };

  // 날짜별 일정 그룹화
  const schedulesByDate = schedules.reduce((acc, schedule) => {
    const date = new Date(schedule.start_time).toLocaleDateString('ko-KR');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, Schedule[]>);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">일정 관리</h2>
        <button
          onClick={() => {
            setEditingSchedule(null);
            setFormData({
              member_id: '',
              start_time: '',
              end_time: '',
              status: 'scheduled',
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm text-sm sm:text-base w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          새 일정 추가
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 달력 */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <CalendarComponent
            onChange={(value) => {
              if (value instanceof Date) {
                setSelectedDate(value);
              }
            }}
            value={selectedDate}
            className="w-full"
            tileContent={({ date }) => {
              const dateStr = date.toLocaleDateString('ko-KR');
              const daySchedules = schedulesByDate[dateStr] || [];
              return daySchedules.length > 0 ? (
                <div className="text-xs text-blue-600 font-bold">{daySchedules.length}</div>
              ) : null;
            }}
          />
        </div>

        {/* 일정 리스트 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar size={20} />
              {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 일정
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">해당 날짜의 일정이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">
                        {schedule.member?.full_name || '회원 정보 없음'}
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          {new Date(schedule.start_time).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(schedule.end_time).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className={`inline-block px-2 py-1 rounded text-xs ${
                          schedule.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : schedule.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {schedule.status === 'completed'
                            ? '완료'
                            : schedule.status === 'cancelled'
                            ? '취소'
                            : '예정'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        aria-label="일정 수정"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        aria-label="일정 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 일정 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingSchedule ? '일정 수정' : '새 일정 추가'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSchedule(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="member-select" className="block text-sm font-medium text-gray-700 mb-1">
                  회원 <span className="text-red-500">*</span>
                </label>
                <select
                  id="member-select"
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">회원 선택</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">
                  시작 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  id="start-time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-1">
                  종료 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  id="end-time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-1">
                  상태
                </label>
                <select
                  id="status-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="scheduled">예정</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingSchedule(null);
                  }}
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
