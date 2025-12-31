import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../api/supabase';
import { Calendar, Clock } from 'lucide-react';
import CalendarComponent from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import ScheduleChangeRequest from './ScheduleChangeRequest';

interface Schedule {
  id: number;
  start_time: string;
  end_time: string;
  status: string;
}

export default function MySchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(false);

  // 일정 불러오기
  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'today') {
        startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewMode === 'week') {
        const day = selectedDate.getDay();
        startDate = new Date(selectedDate);
        startDate.setDate(selectedDate.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // month
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('member_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules((data || []) as Schedule[]);
    } catch (error) {
      console.error('일정 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // 오늘 일정
  const todaySchedules = schedules.filter((schedule) => {
    const scheduleDate = new Date(schedule.start_time);
    const today = new Date();
    return (
      scheduleDate.getDate() === today.getDate() &&
      scheduleDate.getMonth() === today.getMonth() &&
      scheduleDate.getFullYear() === today.getFullYear()
    );
  });

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
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">내 일정</h2>

      {/* 뷰 모드 선택 */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('today')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            오늘
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            월간
          </button>
        </div>

        {/* 오늘 일정 하이라이트 */}
        {viewMode === 'today' && todaySchedules.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Clock size={18} />
              오늘의 PT 일정
            </h3>
            {todaySchedules.map((schedule) => (
              <div key={schedule.id} className="text-sm text-blue-800">
                {new Date(schedule.start_time).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(schedule.end_time).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ))}
          </div>
        )}

        {/* 달력 */}
        <div className="mb-4">
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
      </div>

      {/* 일정 리스트 */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar size={18} />
          {viewMode === 'today'
            ? '오늘 일정'
            : viewMode === 'week'
            ? '주간 일정'
            : '월간 일정'}
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">일정이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(schedulesByDate).map(([date, daySchedules]) => (
              <div key={date} className="border-b border-gray-200 pb-3 last:border-b-0">
                <h4 className="font-medium text-gray-900 mb-2">{date}</h4>
                {daySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="bg-gray-50 rounded-lg p-3 mb-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm">
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
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        schedule.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : schedule.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {schedule.status === 'completed'
                        ? '완료'
                        : schedule.status === 'cancelled'
                        ? '취소'
                        : '예정'}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 일정 변경 요청 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <ScheduleChangeRequest />
      </div>
    </div>
  );
}
