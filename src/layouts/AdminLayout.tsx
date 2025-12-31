import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { supabase } from '../api/supabase';

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      console.log('AdminLayout - Auth state change:', event);
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
    <div className="min-h-screen bg-gray-100">
      {/* 상단 네비게이션 */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <h1 className="text-lg sm:text-xl font-bold text-blue-600">Fit-Link Admin</h1>
            
            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              <div className="flex gap-4 text-sm font-medium text-gray-600">
                <Link 
                  to="/admin" 
                  className="px-3 py-2 rounded-md hover:text-blue-500 hover:bg-gray-50 transition-colors"
                >
                  대시보드
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">{userName || '관리자'}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-1.5"
                  aria-label="로그아웃"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
            </div>

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <div className="px-3 py-2 border-b border-gray-200 mb-2">
                <p className="text-sm font-medium text-gray-700">{userName || '관리자'}</p>
              </div>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                대시보드
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={18} />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* 메인 컨텐츠 */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

