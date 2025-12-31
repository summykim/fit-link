import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../api/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('trainer' | 'member' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // 세션 복원 확인 (새로고침 시)
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('ProtectedRoute - Current session:', currentSession ? 'exists' : 'none');
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.log('ProtectedRoute - No user found, userError:', userError);
          if (isMounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          return;
        }

        console.log('ProtectedRoute - User found:', user.id);

        // 먼저 user_metadata에서 role 확인 (세션에 저장된 정보)
        let role = (user.user_metadata?.role as string) || null;
        
        // user_metadata에 role이 없으면 DB에서 조회
        if (!role) {
          console.log('ProtectedRoute - Role not in user_metadata, fetching from DB');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('프로필 조회 실패:', profileError);
            // 프로필 조회 실패 시에도 인증은 유지하되 role은 null
            if (isMounted) {
              setIsAuthenticated(true);
              setUserRole(null);
              setIsLoading(false);
            }
            return;
          }

          role = profile?.role || null;
          
          // DB에서 조회한 role을 user_metadata에 저장
          if (role) {
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                role: role,
              },
            });
            
            if (updateError) {
              console.warn('user_metadata 업데이트 실패:', updateError);
            } else {
              console.log('ProtectedRoute - Role saved to user_metadata:', role);
            }
          }
        } else {
          console.log('ProtectedRoute - Role found in user_metadata:', role);
        }

        if (isMounted) {
          setIsAuthenticated(true);
          setUserRole(role);
          setIsLoading(false);
          
          // 디버깅을 위한 로그
          console.log('ProtectedRoute - Authentication successful');
          console.log('ProtectedRoute - User role:', role);
          console.log('ProtectedRoute - Allowed roles:', allowedRoles);
          console.log('ProtectedRoute - Current path:', location.pathname);
          console.log('ProtectedRoute - Session restored:', currentSession ? 'yes' : 'no');
        }
      } catch (error) {
        console.error('인증 확인 실패:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // 타임아웃 설정 (10초 후에도 로딩 중이면 에러 처리)
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('ProtectedRoute - Authentication check timeout');
        setIsLoading(false);
      }
    }, 10000);

    // 인증 상태 변경 감지 (새로고침 시 세션 복원 포함)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('ProtectedRoute - Auth state change event:', event);

      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsLoading(false);
      } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
        // 로그인, 초기 세션 복원, 토큰 갱신 시 사용자 정보 다시 조회
        setIsAuthenticated(true);
        setIsLoading(true);
        
        try {
          // 먼저 user_metadata에서 role 확인
          let role = (session.user.user_metadata?.role as string) || null;
          
          // user_metadata에 role이 없으면 DB에서 조회
          if (!role) {
            console.log('ProtectedRoute - Role not in user_metadata, fetching from DB');
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profileError) {
              console.error('프로필 조회 실패:', profileError);
              setUserRole(null);
            } else {
              role = profile?.role || null;
              
              // DB에서 조회한 role을 user_metadata에 저장
              if (role) {
                const { error: updateError } = await supabase.auth.updateUser({
                  data: {
                    role: role,
                  },
                });
                
                if (updateError) {
                  console.warn('user_metadata 업데이트 실패:', updateError);
                } else {
                  console.log('ProtectedRoute - Role saved to user_metadata:', role);
                }
              }
            }
          } else {
            console.log('ProtectedRoute - Role found in user_metadata:', role);
          }
          
          setUserRole(role);
          console.log('ProtectedRoute - Auth state change - User role:', role);
          console.log('ProtectedRoute - Event type:', event);
        } catch (error) {
          console.error('프로필 조회 실패:', error);
          setUserRole(null);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [allowedRoles, location.pathname]);

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 인증되지 않았으면 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // role 제한이 있는 경우 role 체크
  if (allowedRoles && allowedRoles.length > 0) {
    // role이 아직 로드되지 않았거나 null이면 로그인 페이지로 리다이렉트
    if (!userRole) {
      console.warn('ProtectedRoute - User role is null or not loaded, redirecting to login');
      console.log('ProtectedRoute - Allowed roles:', allowedRoles);
      console.log('ProtectedRoute - Current user role:', userRole);
      return <Navigate to="/login" replace />;
    }

    const normalizedRole = userRole.toLowerCase().trim();
    console.log('ProtectedRoute - Checking role:', normalizedRole, 'against allowed:', allowedRoles);
    
    // role이 허용된 목록에 없으면 접근 거부
    const isRoleAllowed = allowedRoles.some(role => role.toLowerCase() === normalizedRole);
    
    if (!isRoleAllowed) {
      console.log('ProtectedRoute - Role mismatch, redirecting based on role:', normalizedRole);
      // role에 따라 적절한 페이지로 리다이렉트
      if (normalizedRole === 'trainer') {
        return <Navigate to="/trainer/members" replace />;
      } else if (normalizedRole === 'member') {
        return <Navigate to="/member/my-schedule" replace />;
      } else if (normalizedRole === 'admin') {
        return <Navigate to="/admin" replace />;
      }
      // 알 수 없는 role이면 로그인 페이지로
      console.warn('ProtectedRoute - Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
    }
    
    console.log('ProtectedRoute - Role check passed, allowing access');
  }

  return <>{children}</>;
}

