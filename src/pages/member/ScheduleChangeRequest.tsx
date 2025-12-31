import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface Schedule {
  id: number;
  start_time: string;
  end_time: string;
  status: string;
  change_request?: string;
}

export default function ScheduleChangeRequest() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [newTime, setNewTime] = useState('');
  const [requestReason, setRequestReason] = useState('');

  // 예정된 일정 불러오기
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('member_id', user.id)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules((data || []) as Schedule[]);
    } catch (error) {
      console.error('일정 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // 변경 요청 제출
  const handleSubmitRequest = async () => {
    if (!selectedSchedule || !newTime) {
      alert('새로운 시간을 선택해주세요.');
      return;
    }

    try {
      // 실제 구현에서는 별도의 change_requests 테이블을 사용하거나
      // schedules 테이블에 change_request_status 필드를 추가해야 합니다.
      // 여기서는 간단히 알림만 표시합니다.
      alert('일정 변경 요청이 제출되었습니다. 트레이너의 승인을 기다려주세요.');
      
      setSelectedSchedule(null);
      setNewTime('');
      setRequestReason('');
      fetchSchedules();
    } catch (error) {
      console.error('변경 요청 제출 실패:', error);
      alert('변경 요청 제출에 실패했습니다.');
    }
  };

  // 가능한 시간대 생성 (예시: 현재 시간 기준으로 다음 7일간의 가능한 시간대)
  const getAvailableTimeSlots = () => {
    const slots = [];
    const now = new Date();
    now.setHours(9, 0, 0, 0); // 오전 9시부터 시작

    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);

      for (let hour = 9; hour <= 21; hour += 2) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(hour + 1, 0, 0, 0);

        if (startTime > new Date()) {
          slots.push({
            start: startTime,
            end: endTime,
            label: `${startTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ${hour}:00 - ${hour + 1}:00`,
          });
        }
      }
    }

    return slots.slice(0, 10); // 최대 10개만 표시
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">일정 변경 요청</h3>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">변경 가능한 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white rounded-xl shadow-sm border p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold mb-2">
                    {new Date(schedule.start_time).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>
                      {new Date(schedule.start_time).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(schedule.end_time).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSchedule(schedule)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                >
                  변경 요청
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 변경 요청 모달 */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900">일정 변경 요청</h3>
              <p className="text-sm text-gray-600 mt-1">
                현재: {new Date(selectedSchedule.start_time).toLocaleString('ko-KR')}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="new-time-select" className="block text-sm font-medium text-gray-700 mb-2">
                  새로운 시간 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  id="new-time-select"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">시간 선택</option>
                  {getAvailableTimeSlots().map((slot, index) => (
                    <option key={index} value={slot.start.toISOString()}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  변경 사유
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="변경 사유를 입력하세요"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={18} className="text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  변경 요청은 트레이너의 승인 후 적용됩니다.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setSelectedSchedule(null);
                    setNewTime('');
                    setRequestReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitRequest}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  요청 제출
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

