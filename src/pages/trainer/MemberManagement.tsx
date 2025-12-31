import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { signUpUser } from '../../api/auth';
import { X } from 'lucide-react';

interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  notes?: string;
  created_at: string;
}

export default function MemberManagement() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    notes: '',
  });

  // 회원 목록 불러오기 (현재 트레이너가 관리하는 회원만)
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // 현재 로그인한 트레이너 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 현재 트레이너가 관리하는 회원들의 member_id 조회
      const { data: contracts, error: contractsError } = await supabase
        .from('pt_contracts')
        .select('member_id')
        .eq('trainer_id', user.id)
        .eq('is_active', true);

      if (contractsError) throw contractsError;

      // 관리하는 회원이 없으면 빈 배열 반환
      if (!contracts || contracts.length === 0) {
        setMembers([]);
        return;
      }

      // member_id 목록 추출
      const memberIds = contracts.map(contract => contract.member_id);

      // 해당 회원들의 프로필 정보 조회
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberIds)
        .eq('role', 'member')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setMembers(data as Member[]);
    } catch (error) {
      console.error('회원 목록 불러오기 실패:', error);
      alert('회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 신규 회원 추가
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name ||  !formData.phone_number || !formData.email) {
      alert('이름,  전화번호, 이메일은 필수 입력 항목입니다.');
      return;
    }

    try {
      setLoading(true);

      // 현재 로그인한 트레이너 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // 1. 회원가입 함수 호출
      const data = await signUpUser(
        formData.email,
        'password',
        formData.phone_number,
        formData.full_name,
        'member'
      );

      if (!data.user) {
        throw new Error('회원가입에 실패했습니다. 사용자 정보를 가져올 수 없습니다.');
      }

      // 2. 프로필 정보 추가
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            role: 'member',
            notes: formData.notes || null,
          },
        ]);

      if (profileError) throw profileError;

      // 3. PT 계약 생성 (트레이너-회원 관계 설정)
      const { error: contractError } = await supabase
        .from('pt_contracts')
        .insert([
          {
            trainer_id: user.id,
            member_id: data.user.id,
            total_sessions: 0, // 기본값 0, 나중에 수정 가능
            used_sessions: 0,
            is_active: true,
          },
        ]);

      if (contractError) throw contractError;

      // 성공 시 폼 초기화 및 모달 닫기
      setFormData({
        full_name: '',
        phone_number: '',
        email: '',
        notes: '',
      });

      setIsModalOpen(false);
      fetchMembers(); // 목록 새로고침
      alert('회원이 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('회원 추가 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`회원 추가에 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">회원 관리</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm text-sm sm:text-base w-full sm:w-auto"
        >
          + 새 회원 추가
        </button>
      </div>
      
      {/* 회원 목록 */}
      <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 lg:p-8">
        {loading && members.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base text-center py-8">로딩 중...</p>
        ) : members.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base text-center py-8">등록된 회원이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div 
                key={member.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/trainer/members/${member.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.full_name}</h3>
                    <div className="text-sm text-gray-600 space-y-1 mt-1">
                      <p>전화번호: {member.phone_number}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(member.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 신규 회원 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">신규 회원 추가</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="test@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="추가 메모를 입력하세요"
                />
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

