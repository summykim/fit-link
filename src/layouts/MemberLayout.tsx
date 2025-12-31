import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Utensils, Activity, LogOut } from 'lucide-react';
import { supabase } from '../api/supabase';

export default function MemberLayout() {
  const [userName, setUserName] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      // 세션 복원 확인 (새로고침 시)
      await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
      }
    };

    fetchUserInfo();

    // 인증 상태 변경 감지 (새로고침 시 세션 복원 포함)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('MemberLayout - Auth state change:', event);
      if (session?.user) {
        // 세션이 복원되거나 변경될 때 사용자 정보 다시 조회
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
      } else {
        setUserName('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 safe-area-inset-bottom">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Fit-Link</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{userName || '회원'}</span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              aria-label="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="p-4 pb-6">
        <Outlet />
      </main>
      
      {/* 하단 탭 바 - 모바일 전용 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-2 max-w-md mx-auto">
          <NavLink 
            to="/member/my-schedule" 
            className={({isActive}) => 
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? "text-blue-600" : "text-gray-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Calendar size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs mt-1 font-medium">일정</span>
              </>
            )}
          </NavLink>
          <NavLink 
            to="/member/diet" 
            className={({isActive}) => 
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? "text-blue-600" : "text-gray-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Utensils size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs mt-1 font-medium">식단</span>
              </>
            )}
          </NavLink>
          <NavLink 
            to="/member/progress" 
            className={({isActive}) => 
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? "text-blue-600" : "text-gray-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Activity size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs mt-1 font-medium">기록</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}