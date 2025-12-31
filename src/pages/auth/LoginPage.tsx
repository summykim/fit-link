import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, type Location } from 'react-router-dom';
import { supabase } from '../../api/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인되어 있으면 role에 따라 리다이렉트
  useEffect(() => {
    const checkExistingAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const userRole = profile?.role?.toLowerCase();
        if (userRole === 'trainer') {
          navigate('/trainer/members', { replace: true });
        } else if (userRole === 'member') {
          navigate('/member/my-schedule', { replace: true });
        } else if (userRole === 'admin') {
          navigate('/admin', { replace: true });
        }
      }
    };

    checkExistingAuth();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 로그인 시도
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (!data.user) {
        throw new Error('로그인에 실패했습니다.');
      }

      // 사용자 role 확인
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('프로필 조회 실패:', profileError);
        throw new Error('사용자 정보를 가져오는데 실패했습니다.');
      }

      // role을 user_metadata에 저장 (세션에 포함됨)
      if (profile?.role) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            role: profile.role,
          },
        });
        
        if (updateError) {
          console.warn('user_metadata 업데이트 실패:', updateError);
          // 업데이트 실패해도 계속 진행
        } else {
          console.log('LoginPage - Role saved to user_metadata:', profile.role);
        }
      }

      // 디버깅을 위한 로그
      console.log('LoginPage - User role:', profile?.role);
      console.log('LoginPage - Profile data:', profile);

      // role에 따라 리다이렉트
      // 이전 페이지가 있으면 그곳으로, 없으면 role에 따라 리다이렉트
      const from = (location.state as { from?: Location } | null)?.from?.pathname;
      
      // 페이지 새로고침을 통해 인증 상태를 완전히 반영
      let redirectPath = '/login';
      const userRole = profile?.role?.toLowerCase();
      
      if (userRole === 'trainer') {
        redirectPath = from || '/trainer/members';
      } else if (userRole === 'member') {
        redirectPath = from || '/member/my-schedule';
      } else if (userRole === 'admin') {
        redirectPath = from || '/admin';
      } else {
        // role이 없으면 기본적으로 회원 페이지로
        redirectPath = from || '/member/my-schedule';
      }
      
      console.log('LoginPage - Redirecting to:', redirectPath);
      
      // 절대 경로로 리다이렉트
      window.location.href = redirectPath;
    } catch (err) {
      console.error('로그인 오류:', err);
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-gray-900">로그인</h2>
          <p className="text-sm text-gray-500 text-center">Fit-Link에 오신 것을 환영합니다</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="이메일을 입력하세요"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="비밀번호를 입력하세요"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <div className="text-center text-sm text-gray-500 mt-4">
            <a href="#" className="text-blue-600 hover:text-blue-700">비밀번호를 잊으셨나요?</a>
          </div>
        </form>
      </div>
    </div>
  );
}

