import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { supabase } from '../api/supabase';

export default function TrainerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

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
      console.log('TrainerLayout - Auth state change:', event);
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
            {/* 로고 */}
            <h1 className="text-lg sm:text-xl font-bold text-blue-600">Fit-Link Trainer</h1>
            
            {/* 데스크톱 네비게이션 */}
            <div className="hidden md:flex gap-4 lg:gap-6 text-sm font-medium text-gray-600">
              <Link 
                to="/trainer/members" 
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/trainer/members') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'hover:text-blue-500 hover:bg-gray-50'
                }`}
              >
                회원관리
              </Link>
              <Link 
                to="/trainer/templates" 
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/trainer/templates') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'hover:text-blue-500 hover:bg-gray-50'
                }`}
              >
                루틴템플릿
              </Link>
              <Link 
                to="/trainer/schedule" 
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/trainer/schedule') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'hover:text-blue-500 hover:bg-gray-50'
                }`}
              >
                일정관리
              </Link>
            </div>

            {/* 프로필 & 모바일 메뉴 버튼 */}
            <div className="flex items-center gap-3">
              {/* 사용자 이름 및 로그아웃 버튼 */}
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">{userName || '트레이너'}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-1.5"
                  aria-label="로그아웃"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
              {/* 모바일 메뉴 버튼 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                aria-label="메뉴 열기"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <div className="px-3 py-2 border-b border-gray-200 mb-2">
                <p className="text-sm font-medium text-gray-700">{userName || '트레이너'}</p>
              </div>
              <Link
                to="/trainer/members"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/trainer/members')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                회원관리
              </Link>
              <Link
                to="/trainer/templates"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/trainer/templates')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                루틴템플릿
              </Link>
              <Link
                to="/trainer/schedule"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/trainer/schedule')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                일정관리
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