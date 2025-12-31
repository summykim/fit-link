import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import RoutineTemplateForm from '../pages/trainer/RoutineTemplateForm';

interface TemplateExercise {
  id?: number;
  exercise_name: string;
  default_sets: number;
  default_reps?: number;
  order_index: number;
}

interface RoutineTemplate {
  id: number;
  template_name: string;
  description?: string;
  template_exercises: TemplateExercise[];
}

export default function RoutineTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoutineTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  // 템플릿 목록 불러오기
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('routine_templates')
        .select(`*, template_exercises(*)`)
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setTemplates(data as RoutineTemplate[]);
    } catch (error) {
      console.error('템플릿 목록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // 템플릿 삭제
  const handleDelete = async (templateId: number) => {
    if (!confirm('정말 이 템플릿을 삭제하시겠습니까?')) return;

    try {
      await supabase.from('template_exercises').delete().eq('template_id', templateId);
      await supabase.from('routine_templates').delete().eq('id', templateId);
      fetchTemplates();
      alert('템플릿이 삭제되었습니다.');
    } catch (error) {
      console.error('템플릿 삭제 실패:', error);
      alert('템플릿 삭제에 실패했습니다.');
    }
  };

  const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplate | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([]);

  // 회원 목록 불러오기
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'member')
        .order('full_name');
      if (data) setMembers(data);
    };
    fetchMembers();
  }, []);

  // 템플릿을 회원에게 적용
  const handleApplyToMember = (template: RoutineTemplate) => {
    setSelectedTemplate(template);
    setIsMemberSelectOpen(true);
  };

  const handleMemberSelect = (memberId: string) => {
    if (selectedTemplate) {
      navigate(`/trainer/members/${memberId}?applyTemplate=${selectedTemplate.id}`);
    }
    setIsMemberSelectOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">운동 루틴 템플릿</h2>
        <button 
          onClick={() => {
            setEditingTemplate(null);
            setIsFormOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm text-sm sm:text-base w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          새 템플릿
        </button>
      </div>

      {/* 템플릿 그리드 */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border text-center">
          <p className="text-gray-500 text-sm sm:text-base">템플릿이 없습니다. 새 템플릿을 만들어보세요.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(temp => (
            <div key={temp.id} className="bg-white p-4 sm:p-5 lg:p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
              <h3 className="font-bold text-base sm:text-lg lg:text-xl mb-2 text-gray-900">{temp.template_name}</h3>
              {temp.description && (
                <p className="text-xs text-gray-500 mb-3">{temp.description}</p>
              )}
              <ul className="text-xs sm:text-sm text-gray-600 mb-4 space-y-1">
                {temp.template_exercises.map(ex => (
                  <li key={ex.id}>
                    • {ex.exercise_name} ({ex.default_sets}세트 × {ex.default_reps || 'N'}회)
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-4 border-t">
                <button 
                  onClick={() => handleApplyToMember(temp)}
                  className="flex-1 text-xs sm:text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Copy size={14} />
                  적용
                </button>
                <button 
                  aria-label="템플릿 수정"
                  onClick={() => {
                    setEditingTemplate(temp);
                    setIsFormOpen(true);
                  }}
                  className="text-xs sm:text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <Edit size={14} />
                </button>
                <button 
                  aria-label="템플릿 삭제"
                  onClick={() => handleDelete(temp.id)}
                  className="text-xs sm:text-sm bg-gray-100 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 템플릿 폼 모달 */}
      {isFormOpen && (
        <RoutineTemplateForm
          template={editingTemplate}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTemplate(null);
          }}
          onSuccess={fetchTemplates}
        />
      )}

      {/* 회원 선택 모달 */}
      {isMemberSelectOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                "{selectedTemplate.template_name}" 적용할 회원 선택
              </h3>
              <button
                onClick={() => {
                  setIsMemberSelectOpen(false);
                  setSelectedTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">등록된 회원이 없습니다.</p>
                ) : (
                  members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleMemberSelect(member.id)}
                      className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {member.full_name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}