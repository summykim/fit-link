import { useState } from 'react';
import { supabase } from '../api/supabase';

export const useWorkout = (memberId: string) => {
  const [loading, setLoading] = useState(false);

  // 1. 특정 회원의 마지막 운동 기록 불러오기 (복사 기능용)
  const getLastWorkout = async () => {
    const { data, error } = await supabase
      .from('member_workout_logs')
      .select('*')
      .eq('member_id', memberId)
      .order('workout_date', { ascending: false })
      .limit(1);
    return { data: data?.[0], error };
  };

  // 2. 운동 기록 저장하기
  const saveWorkout = async (workoutData: any[]) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('member_workout_logs')
      .insert(workoutData);
    setLoading(false);
    return { data, error };
  };

  return { getLastWorkout, saveWorkout, loading };
};