import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { X, Plus, Trash2 } from 'lucide-react';

interface TemplateExercise {
  id?: number;
  exercise_name: string;
  default_sets: number;
  default_reps?: number;
  order_index: number;
}

interface RoutineTemplate {
  id?: number;
  template_name: string;
  description?: string;
  template_exercises: TemplateExercise[];
}

interface RoutineTemplateFormProps {
  template?: RoutineTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoutineTemplateForm({ template, onClose, onSuccess }: RoutineTemplateFormProps) {
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
  });
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        template_name: template.template_name,
        description: template.description || '',
      });
      setExercises(template.template_exercises || []);
    }
  }, [template]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        exercise_name: '',
        default_sets: 3,
        default_reps: 10,
        order_index: exercises.length,
      },
    ]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, order_index: i })));
  };

  const updateExercise = (index: number, field: keyof TemplateExercise, value: string | number) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.template_name.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }
    if (exercises.length === 0) {
      alert('최소 1개 이상의 운동을 추가해주세요.');
      return;
    }
    if (exercises.some(ex => !ex.exercise_name.trim())) {
      alert('모든 운동명을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      if (template?.id) {
        // 수정
        const { error: updateError } = await supabase
          .from('routine_templates')
          .update({
            template_name: formData.template_name,
            description: formData.description || null,
          })
          .eq('id', template.id);

        if (updateError) throw updateError;

        // 기존 운동 삭제
        await supabase.from('template_exercises').delete().eq('template_id', template.id);

        // 새 운동 추가
        const exercisesToInsert = exercises.map(ex => ({
          template_id: template.id,
          exercise_name: ex.exercise_name,
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          order_index: ex.order_index,
        }));

        const { error: insertError } = await supabase
          .from('template_exercises')
          .insert(exercisesToInsert);

        if (insertError) throw insertError;
      } else {
        // 생성
        const { data: templateData, error: insertError } = await supabase
          .from('routine_templates')
          .insert([
            {
              trainer_id: user.id,
              template_name: formData.template_name,
              description: formData.description || null,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        const exercisesToInsert = exercises.map(ex => ({
          template_id: templateData.id,
          exercise_name: ex.exercise_name,
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          order_index: ex.order_index,
        }));

        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('템플릿 저장 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`템플릿 저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {template ? '템플릿 수정' : '새 템플릿 생성'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              템플릿 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.template_name}
              onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="예: 초보자 상체 루틴"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="템플릿에 대한 설명을 입력하세요"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                운동 목록 <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addExercise}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                <Plus size={16} />
                운동 추가
              </button>
            </div>

            <div className="space-y-2">
              {exercises.map((exercise, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 flex gap-2">
                  <input
                    type="text"
                    value={exercise.exercise_name}
                    onChange={(e) => updateExercise(index, 'exercise_name', e.target.value)}
                    placeholder="운동명"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    value={exercise.default_sets}
                    onChange={(e) => updateExercise(index, 'default_sets', parseInt(e.target.value) || 0)}
                    placeholder="세트"
                    className="w-20 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={exercise.default_reps}
                    onChange={(e) => updateExercise(index, 'default_reps', parseInt(e.target.value) || 0)}
                    placeholder="횟수"
                    className="w-20 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeExercise(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    aria-label={`${exercise.exercise_name} 삭제`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

